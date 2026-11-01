const encoder = new TextEncoder();

function signatureToBytes(signature) {
  const hex = (signature || "").replace(/^sha256=/, "");

  if (!/^[0-9a-f]{64}$/i.test(hex)) {
    return null;
  }

  const bytes = new Uint8Array(hex.length / 2);

  for (let i = 0; i < bytes.length; i++) {
    bytes[i] = parseInt(hex.slice(i * 2, i * 2 + 2), 16);
  }

  return bytes;
}

async function verifyNotionSignature(body, signature, token) {
  const signatureBytes = signatureToBytes(signature);

  if (!signatureBytes) {
    return false;
  }

  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(token),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["verify"]
  );

  return crypto.subtle.verify(
    "HMAC",
    key,
    signatureBytes,
    encoder.encode(body)
  );
}

// ---------------------------------------------------------------------------
// Ab hier: Erweiterungen gegenueber dem zuerst veroeffentlichten Stand.
// ---------------------------------------------------------------------------

// Notion-Events sind klein (wenige KB). Alles darueber ist kein legitimes Event.
const MAX_BODY_BYTES = 1_000_000;
const DEFAULT_HOOK_TIMEOUT_MS = 10_000;
const MAX_HOOK_TIMEOUT_MS = 60_000;
const MAX_LOGGED_TOKEN_LENGTH = 256;
const CLOCK_SKEW_SECONDS = 300;

// Verhindert Log-Injection: keine Zeilenumbrueche/Steuerzeichen, begrenzte Laenge.
function sanitizeForLog(value) {
  return Array.from(String(value))
    .filter((char) => {
      const code = char.codePointAt(0);
      const isControl = code <= 0x1f || (code >= 0x7f && code <= 0x9f);
      const isLineSeparator = code === 0x2028 || code === 0x2029;
      return !isControl && !isLineSeparator;
    })
    .join("")
    .slice(0, MAX_LOGGED_TOKEN_LENGTH);
}

// Die Deploy-Hook-URL ist selbst ein Secret (der Pfad enthaelt das Token). Sie wird nur
// auf Gueltigkeit geprueft und taucht nie in Logs oder Fehlermeldungen auf.
function getValidHookUrl(value) {
  if (typeof value !== "string" || value === "") {
    return null;
  }

  try {
    const { protocol } = new URL(value);
    return protocol === "https:" || protocol === "http:" ? value : null;
  } catch {
    return null;
  }
}

function getHookTimeoutMs(value) {
  const ms = Number(value);
  return Number.isFinite(ms) && ms > 0
    ? Math.min(ms, MAX_HOOK_TIMEOUT_MS)
    : DEFAULT_HOOK_TIMEOUT_MS;
}

// Gemeinsamer Aufruf des Pages-Deploy-Hooks fuer Webhook und Cron. Gibt nie eine URL oder
// Fehlermeldung des Netzwerks weiter (diese koennte die URL enthalten), sondern protokolliert
// nur Quelle, Statuscode bzw. Fehlerart.
async function triggerDeployHook(env, source) {
  const hookUrl = getValidHookUrl(env.DEPLOY_HOOK_URL);

  if (!hookUrl) {
    console.error(
      `[${source}] DEPLOY_HOOK_URL ist nicht konfiguriert oder keine gültige URL.`
    );
    return { ok: false, reason: "not-configured" };
  }

  const controller = new AbortController();
  const timer = setTimeout(
    () => controller.abort(),
    getHookTimeoutMs(env.DEPLOY_HOOK_TIMEOUT_MS)
  );

  try {
    const response = await fetch(hookUrl, {
      method: "POST",
      signal: controller.signal,
    });

    // Antwort wird nicht gebraucht; Stream freigeben.
    response.body?.cancel();

    if (!response.ok) {
      console.error(
        `[${source}] Deploy-Hook antwortete mit HTTP ${response.status}.`
      );
      return { ok: false, reason: "http", status: response.status };
    }

    console.log(`[${source}] Deploy-Hook ausgelöst (HTTP ${response.status}).`);
    return { ok: true, status: response.status };
  } catch (error) {
    const reason = controller.signal.aborted ? "timeout" : "network";
    console.error(
      `[${source}] Deploy-Hook nicht erreichbar (${reason}${
        error && error.name ? `, ${sanitizeForLog(error.name)}` : ""
      }).`
    );
    return { ok: false, reason };
  } finally {
    clearTimeout(timer);
  }
}

// Optionaler Replay-Schutz: Nur aktiv, wenn MAX_EVENT_AGE_SECONDS gesetzt ist. Der Zeitstempel
// steckt im signierten Body und kann nicht unbemerkt geaendert werden.
function isEventFresh(timestamp, maxAgeSeconds) {
  const eventTime = typeof timestamp === "string" ? Date.parse(timestamp) : NaN;

  if (Number.isNaN(eventTime)) {
    return false;
  }

  const ageSeconds = (Date.now() - eventTime) / 1000;
  return ageSeconds <= maxAgeSeconds && ageSeconds >= -CLOCK_SKEW_SECONDS;
}

async function runScheduledRebuild(env) {
  const result = await triggerDeployHook(env, "cron");

  if (result.ok) {
    return;
  }

  const detail =
    result.reason === "http"
      ? `HTTP ${result.status}`
      : result.reason === "not-configured"
        ? "DEPLOY_HOOK_URL nicht konfiguriert"
        : result.reason;

  // Der Fehler laesst den Cron-Lauf in Cloudflare als fehlgeschlagen erscheinen.
  throw new Error(`Geplanter Rebuild fehlgeschlagen: ${detail}`);
}

const worker = {
  async fetch(request, env) {
    if (request.method === "GET") {
      return new Response("Face & More Notion-Automatik ist aktiv.");
    }

    if (request.method !== "POST") {
      return new Response("Method not allowed", { status: 405 });
    }

    if (Number(request.headers.get("Content-Length")) > MAX_BODY_BYTES) {
      return new Response("Payload too large", { status: 413 });
    }

    const body = await request.text();

    if (body.length > MAX_BODY_BYTES) {
      return new Response("Payload too large", { status: 413 });
    }

    let payload;

    try {
      payload = JSON.parse(body);
    } catch {
      return new Response("Invalid JSON", { status: 400 });
    }

    if (payload === null || typeof payload !== "object" || Array.isArray(payload)) {
      return new Response("Invalid JSON", { status: 400 });
    }

    // Notion sendet diesen Code einmalig zur Einrichtung (und erneut bei einer
    // Token-Rotation). Er ist zugleich das HMAC-Geheimnis und wird deshalb nur im
    // Einrichtungsmodus geloggt: solange NOTION_VERIFICATION_TOKEN noch nicht gesetzt ist
    // oder NOTION_SETUP_MODE=1 gesetzt wurde. Im Normalbetrieb wird die Anfrage nur quittiert.
    if (
      typeof payload.verification_token === "string" &&
      payload.verification_token !== ""
    ) {
      if (!env.NOTION_VERIFICATION_TOKEN || env.NOTION_SETUP_MODE === "1") {
        console.log(
          `NOTION_VERIFICATION_TOKEN=${sanitizeForLog(payload.verification_token)}`
        );
      }

      return new Response("Notion verification received.", {
        status: 200,
      });
    }

    // Normale Notion-Änderungen werden nur mit gültiger Signatur akzeptiert.
    if (!env.NOTION_VERIFICATION_TOKEN) {
      return new Response("Notion verification is not configured.", {
        status: 503,
      });
    }

    const signatureIsValid = await verifyNotionSignature(
      body,
      request.headers.get("X-Notion-Signature"),
      env.NOTION_VERIFICATION_TOKEN
    );

    if (!signatureIsValid) {
      return new Response("Invalid signature", { status: 401 });
    }

    const maxEventAgeSeconds = Number(env.MAX_EVENT_AGE_SECONDS);

    if (
      maxEventAgeSeconds > 0 &&
      !isEventFresh(payload.timestamp, maxEventAgeSeconds)
    ) {
      return new Response("Stale event", { status: 400 });
    }

    const result = await triggerDeployHook(env, "notion-webhook");

    if (!result.ok) {
      if (result.reason === "not-configured") {
        return new Response("Deploy hook is not configured.", { status: 503 });
      }

      return new Response(
        `Cloudflare deployment failed: ${
          result.reason === "http"
            ? result.status
            : result.reason === "timeout"
              ? "timeout"
              : "network error"
        }`,
        { status: 502 }
      );
    }

    return new Response("Cloudflare deployment triggered.", {
      status: 200,
    });
  },

  // Cron-Trigger (alle 6 Stunden, siehe wrangler.toml - derzeit noch nicht aktiviert).
  // Der Aufruf wird hier abgewartet (nicht per ctx.waitUntil), damit ein Fehler den
  // Cron-Lauf in Cloudflare zuverlaessig als fehlgeschlagen markiert.
  async scheduled(_event, env) {
    await runScheduledRebuild(env);
  },
};

export default worker;
