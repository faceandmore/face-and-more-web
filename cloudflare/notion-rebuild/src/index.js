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

export default {
  async fetch(request, env) {
    if (request.method === "GET") {
      return new Response("Face & More Notion-Automatik ist aktiv.");
    }

    if (request.method !== "POST") {
      return new Response("Method not allowed", { status: 405 });
    }

    const body = await request.text();

    let payload;

    try {
      payload = JSON.parse(body);
    } catch {
      return new Response("Invalid JSON", { status: 400 });
    }

    // Notion sendet diesen Code einmalig zur Einrichtung.
    if (payload.verification_token) {
      console.log(
        `NOTION_VERIFICATION_TOKEN=${payload.verification_token}`
      );

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

    const deployResponse = await fetch(env.DEPLOY_HOOK_URL, {
      method: "POST",
    });

    if (!deployResponse.ok) {
      return new Response(
        `Cloudflare deployment failed: ${deployResponse.status}`,
        { status: 502 }
      );
    }

    return new Response("Cloudflare deployment triggered.", {
      status: 200,
    });
  },
};
