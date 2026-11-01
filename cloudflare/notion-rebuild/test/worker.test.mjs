// Tests fuer den Notion-Rebuild-Worker. Laufen ohne Abhaengigkeiten unter Node >= 20:
//   node --test test/worker.test.mjs
//
// Der Deploy-Hook ist IMMER simuliert (globalThis.fetch wird ersetzt). Es wird nie ein echter
// Hook aufgerufen. Per WORKER_PATH laesst sich eine andere Worker-Datei pruefen, z. B. der
// unveraenderte Stand aus dem ersten Commit, um das erhaltene Verhalten zu belegen:
//   WORKER_PATH=/pfad/zum/alten/index.js node --test test/worker.test.mjs
//
// Testnamen: "[kompatibel]" = Verhalten des bisher veroeffentlichten Workers, muss erhalten
// bleiben. "[neu]" = Erweiterung oder Haertung (scheduled, Logging, Eingabepruefung).

import test from 'node:test'
import assert from 'node:assert/strict'
import { createHmac } from 'node:crypto'
import path from 'node:path'
import { pathToFileURL } from 'node:url'

const workerPath = process.env.WORKER_PATH
  ? path.resolve(process.env.WORKER_PATH)
  : path.resolve(import.meta.dirname, '../src/index.js')
const worker = (await import(pathToFileURL(workerPath).href)).default

// Reine Testwerte, keine echten Secrets.
const TOKEN = 'secret_test-verification-token-1234567890'
const HOOK_URL = 'https://api.example.test/hooks/deploy/SECRETPATH-9f8e7d'
const ENV = { NOTION_VERIFICATION_TOKEN: TOKEN, DEPLOY_HOOK_URL: HOOK_URL }

// Beide Aufrufformen erlaubt: (name, fn) oder (name, optionen, fn). Jeder Test hat ein Zeitlimit,
// damit ein haengender Aufruf (z. B. beim alten Code ohne Timeout) nur diesen Test fehlschlagen laesst.
const named = (prefix) => (name, a, b) => {
  const fn = typeof a === 'function' ? a : b
  const opts = { timeout: 10000, ...(typeof a === 'function' ? {} : a) }
  return test(`${prefix} ${name}`, opts, fn)
}
const kompatibel = named('[kompatibel]')
const neu = named('[neu]')

// Unabhaengige HMAC-Implementierung (node:crypto) als Gegenprobe zu WebCrypto im Worker.
function sign(body, token = TOKEN, { prefix = true, upper = false } = {}) {
  let hex = createHmac('sha256', token).update(Buffer.from(body, 'utf8')).digest('hex')
  if (upper) hex = hex.toUpperCase()
  return (prefix ? 'sha256=' : '') + hex
}

const url = 'https://worker.example/'
const get = () => new Request(url)
const post = (body, headers = {}) => new Request(url, { method: 'POST', body, headers })
const signedPost = (body, opts) => post(body, { 'X-Notion-Signature': sign(body, TOKEN, opts) })
const event = (extra = {}) =>
  JSON.stringify({ id: 'evt-1', timestamp: new Date().toISOString(), type: 'page.content_updated', ...extra })

// Ersetzt fetch (Deploy-Hook) und console. hook: Statuscode | 'network' | 'hang'.
async function withMocks(hook, fn) {
  const calls = []
  const logs = []
  const realFetch = globalThis.fetch
  const real = {}
  for (const m of ['log', 'info', 'warn', 'error', 'debug']) {
    real[m] = console[m]
    console[m] = (...a) => logs.push(a.map(String).join(' '))
  }
  globalThis.fetch = async (u, init) => {
    calls.push({ url: String(u), init })
    if (hook === 'network') throw new TypeError(`fetch failed for ${u}`)
    if (hook === 'hang') {
      return new Promise((_, reject) => {
        init?.signal?.addEventListener('abort', () => reject(new DOMException('aborted', 'AbortError')))
      })
    }
    return new Response('', { status: typeof hook === 'number' ? hook : 200 })
  }
  try {
    return await fn({ calls, logs })
  } finally {
    globalThis.fetch = realFetch
    for (const m of Object.keys(real)) console[m] = real[m]
  }
}

const noSecrets = (logs) => {
  const all = logs.join('\n')
  assert.ok(!all.includes(TOKEN), 'Verification-Token darf nicht im Log stehen')
  assert.ok(!all.includes('SECRETPATH'), 'Deploy-Hook-URL darf nicht im Log stehen')
  assert.ok(!all.includes(HOOK_URL), 'Deploy-Hook-URL darf nicht im Log stehen')
}

const makeCtx = () => {
  const promises = []
  return { promises, waitUntil: (p) => { promises.push(p) } }
}

// ---------------------------------------------------------------- GET / Methoden

kompatibel('GET liefert die Statusmeldung und loest keinen Deploy aus', async () => {
  await withMocks(200, async ({ calls }) => {
    const res = await worker.fetch(get(), ENV)
    assert.equal(res.status, 200)
    assert.equal(await res.text(), 'Face & More Notion-Automatik ist aktiv.')
    assert.equal(calls.length, 0)
  })
})

for (const method of ['PUT', 'DELETE', 'PATCH', 'OPTIONS', 'HEAD']) {
  kompatibel(`${method} wird mit 405 abgewiesen und loest keinen Deploy aus`, async () => {
    await withMocks(200, async ({ calls }) => {
      const res = await worker.fetch(new Request(url, { method }), ENV)
      assert.equal(res.status, 405)
      assert.equal(calls.length, 0)
    })
  })
}

// ---------------------------------------------------------------- POST: Eingabe

kompatibel('POST mit ungueltigem JSON liefert 400', async () => {
  await withMocks(200, async ({ calls }) => {
    const res = await worker.fetch(post('{kaputt'), ENV)
    assert.equal(res.status, 400)
    assert.equal(await res.text(), 'Invalid JSON')
    assert.equal(calls.length, 0)
  })
})

neu('POST mit JSON-null, Zahl oder Text wirft keinen Fehler (400, kein Deploy)', async () => {
  for (const body of ['null', '123', '"text"', 'true']) {
    await withMocks(200, async ({ calls }) => {
      const res = await worker.fetch(post(body), ENV)
      assert.equal(res.status, 400, `Body ${body}`)
      assert.equal(calls.length, 0)
    })
  }
})

neu('zu grosse Anfrage (> 1 MB) wird mit 413 abgewiesen, ohne Deploy', async () => {
  await withMocks(200, async ({ calls }) => {
    const big = JSON.stringify({ filler: 'x'.repeat(1_100_000) })
    const res = await worker.fetch(signedPost(big), ENV)
    assert.equal(res.status, 413)
    assert.equal(calls.length, 0)
  })
  await withMocks(200, async ({ calls }) => {
    const res = await worker.fetch(post('{}', { 'Content-Length': '5000000' }), ENV)
    assert.equal(res.status, 413)
    assert.equal(calls.length, 0)
  })
})

// ---------------------------------------------------------------- Verification-Token

kompatibel('verification_token wird mit 200 quittiert und loest keinen Deploy aus', async () => {
  await withMocks(200, async ({ calls }) => {
    const res = await worker.fetch(post(JSON.stringify({ verification_token: 'secret_abc' })), ENV)
    assert.equal(res.status, 200)
    assert.equal(await res.text(), 'Notion verification received.')
    assert.equal(calls.length, 0)
  })
})

kompatibel('Einrichtung: ohne konfiguriertes Secret wird der Token weiterhin geloggt', async () => {
  await withMocks(200, async ({ logs }) => {
    const res = await worker.fetch(post(JSON.stringify({ verification_token: 'secret_abc' })), {
      DEPLOY_HOOK_URL: HOOK_URL,
    })
    assert.equal(res.status, 200)
    assert.deepEqual(logs, ['NOTION_VERIFICATION_TOKEN=secret_abc'])
  })
})

neu('Betrieb: bei konfiguriertem Secret wird der Token NICHT geloggt (Antwort bleibt 200)', async () => {
  await withMocks(200, async ({ logs, calls }) => {
    const res = await worker.fetch(post(JSON.stringify({ verification_token: 'secret_fremd' })), ENV)
    assert.equal(res.status, 200)
    assert.equal(await res.text(), 'Notion verification received.')
    assert.ok(!logs.join('\n').includes('secret_fremd'))
    assert.equal(calls.length, 0)
    noSecrets(logs)
  })
})

neu('Token-Rotation: NOTION_SETUP_MODE=1 erlaubt das Logging auch bei gesetztem Secret', async () => {
  await withMocks(200, async ({ logs }) => {
    const res = await worker.fetch(post(JSON.stringify({ verification_token: 'secret_neu' })), {
      ...ENV,
      NOTION_SETUP_MODE: '1',
    })
    assert.equal(res.status, 200)
    assert.deepEqual(logs, ['NOTION_VERIFICATION_TOKEN=secret_neu'])
  })
})

neu('Log-Injection: Steuerzeichen und Zeilenumbrueche im Token werden entfernt, Laenge begrenzt', async () => {
  await withMocks(200, async ({ logs }) => {
    const evil = 'abc\nFAKE_LOG_LINE=1\r\u001b[31m' + 'z'.repeat(1000)
    await worker.fetch(post(JSON.stringify({ verification_token: evil })), { DEPLOY_HOOK_URL: HOOK_URL })
    assert.equal(logs.length, 1)
    assert.ok(!/[\n\r\u001b]/.test(logs[0]), 'keine Steuerzeichen im Log')
    assert.ok(logs[0].length <= 'NOTION_VERIFICATION_TOKEN='.length + 256)
  })
})

neu('verification_token, der kein Text ist, wird wie ein normales Event behandelt (kein Log, kein Deploy)', async () => {
  await withMocks(200, async ({ logs, calls }) => {
    const res = await worker.fetch(post(JSON.stringify({ verification_token: { a: 1 } })), ENV)
    assert.equal(res.status, 401)
    assert.equal(calls.length, 0)
    assert.equal(logs.length, 0)
  })
})

// ---------------------------------------------------------------- POST: Signatur

kompatibel('ohne konfiguriertes Secret werden normale Events mit 503 abgewiesen', async () => {
  await withMocks(200, async ({ calls }) => {
    const body = event()
    const res = await worker.fetch(signedPost(body), { DEPLOY_HOOK_URL: HOOK_URL })
    assert.equal(res.status, 503)
    assert.equal(await res.text(), 'Notion verification is not configured.')
    assert.equal(calls.length, 0)
  })
})

kompatibel('ungueltige Signaturen liefern 401 und loesen keinen Deploy aus', async () => {
  const body = event()
  const cases = {
    'Header fehlt': {},
    'leerer Header': { 'X-Notion-Signature': '' },
    'falsche Laenge': { 'X-Notion-Signature': 'sha256=abcd' },
    'kein Hex': { 'X-Notion-Signature': 'sha256=' + 'g'.repeat(64) },
    'richtige Form, falscher Wert': { 'X-Notion-Signature': 'sha256=' + '0'.repeat(64) },
    'Signatur fuer anderen Body': { 'X-Notion-Signature': sign(event({ id: 'andere' })) },
    'Signatur mit anderem Token': { 'X-Notion-Signature': sign(body, 'anderer-token') },
  }
  for (const [name, headers] of Object.entries(cases)) {
    await withMocks(200, async ({ calls }) => {
      const res = await worker.fetch(post(body, headers), ENV)
      assert.equal(res.status, 401, name)
      assert.equal(await res.text(), 'Invalid signature', name)
      assert.equal(calls.length, 0, `${name}: Deploy-Hook darf nicht aufgerufen werden`)
    })
  }
})

kompatibel('gueltige Signatur (mit/ohne sha256=-Praefix, Gross-/Kleinschreibung) loest genau einen Deploy aus', async () => {
  for (const opts of [{}, { prefix: false }, { upper: true }]) {
    await withMocks(200, async ({ calls }) => {
      const res = await worker.fetch(signedPost(event(), opts), ENV)
      assert.equal(res.status, 200, JSON.stringify(opts))
      assert.equal(await res.text(), 'Cloudflare deployment triggered.')
      assert.equal(calls.length, 1)
      assert.equal(calls[0].url, HOOK_URL)
      assert.equal(calls[0].init.method, 'POST')
    })
  }
})

kompatibel('Signatur wird ueber den UTF-8-Body geprueft (Umlaute, Euro)', async () => {
  await withMocks(200, async ({ calls }) => {
    const res = await worker.fetch(signedPost(event({ title: 'Gesichtsbehandlung für 89 € – schön' })), ENV)
    assert.equal(res.status, 200)
    assert.equal(calls.length, 1)
  })
})

kompatibel('der Deploy-Hook erhaelt weder Body noch Header der Notion-Anfrage', async () => {
  await withMocks(200, async ({ calls }) => {
    await worker.fetch(signedPost(event()), ENV)
    assert.equal(calls[0].init.body, undefined)
    assert.equal(calls[0].init.headers, undefined)
  })
})

// ---------------------------------------------------------------- Deploy-Hook-Fehler (fetch-Pfad)

for (const status of [400, 403, 404, 429, 500, 503]) {
  kompatibel(`Hook antwortet ${status}: Worker antwortet 502 mit Statuscode`, async () => {
    await withMocks(status, async () => {
      const res = await worker.fetch(signedPost(event()), ENV)
      assert.equal(res.status, 502)
      assert.equal(await res.text(), `Cloudflare deployment failed: ${status}`)
    })
  })
}

neu('Hook-HTTP-Fehler wird mit Statuscode protokolliert, ohne URL oder Token', async () => {
  await withMocks(500, async ({ logs }) => {
    await worker.fetch(signedPost(event()), ENV)
    assert.ok(logs.some((l) => l.includes('500')), 'Statuscode im Log')
    noSecrets(logs)
  })
})

neu('Netzwerkfehler zum Hook: 502 statt Absturz, Log ohne URL', async () => {
  await withMocks('network', async ({ logs }) => {
    const res = await worker.fetch(signedPost(event()), ENV)
    assert.equal(res.status, 502)
    assert.ok(logs.length >= 1, 'Fehler wird protokolliert')
    noSecrets(logs)
  })
})

neu('haengender Hook: nach Timeout 502 statt endlosem Warten', { timeout: 5000 }, async () => {
  await withMocks('hang', async ({ logs }) => {
    const res = await worker.fetch(signedPost(event()), { ...ENV, DEPLOY_HOOK_TIMEOUT_MS: '50' })
    assert.equal(res.status, 502)
    noSecrets(logs)
  })
})

neu('fehlende oder ungueltige DEPLOY_HOOK_URL: 503, kein fetch, Fehler im Log', async () => {
  for (const bad of [undefined, '', 'kein-url', 'ftp://example.test/x']) {
    await withMocks(200, async ({ calls, logs }) => {
      const res = await worker.fetch(signedPost(event()), { NOTION_VERIFICATION_TOKEN: TOKEN, DEPLOY_HOOK_URL: bad })
      assert.equal(res.status, 503, String(bad))
      assert.equal(calls.length, 0)
      assert.ok(logs.length >= 1)
      if (bad) assert.ok(!logs.join('\n').includes(bad))
    })
  }
})

// ---------------------------------------------------------------- Optionaler Replay-Schutz

neu('ohne MAX_EVENT_AGE_SECONDS bleiben alte Events (Notion-Retries) akzeptiert', async () => {
  await withMocks(200, async ({ calls }) => {
    const old = event({ timestamp: new Date(Date.now() - 6 * 3600 * 1000).toISOString() })
    const res = await worker.fetch(signedPost(old), ENV)
    assert.equal(res.status, 200)
    assert.equal(calls.length, 1)
  })
})

neu('mit MAX_EVENT_AGE_SECONDS werden alte, zukuenftige und zeitstempellose Events abgewiesen', async () => {
  const env = { ...ENV, MAX_EVENT_AGE_SECONDS: '300' }
  const cases = {
    'frisch': [event(), 200, 1],
    'zu alt': [event({ timestamp: new Date(Date.now() - 3600 * 1000).toISOString() }), 400, 0],
    'weit in der Zukunft': [event({ timestamp: new Date(Date.now() + 3600 * 1000).toISOString() }), 400, 0],
    'ohne Zeitstempel': [JSON.stringify({ id: 'x', type: 'page.created' }), 400, 0],
    'unlesbarer Zeitstempel': [event({ timestamp: 'gestern' }), 400, 0],
  }
  for (const [name, [body, status, hookCalls]] of Object.entries(cases)) {
    await withMocks(200, async ({ calls }) => {
      const res = await worker.fetch(signedPost(body), env)
      assert.equal(res.status, status, name)
      assert.equal(calls.length, hookCalls, name)
    })
  }
})

neu('Replay-Pruefung kommt NACH der Signaturpruefung (unsignierte alte Events: 401)', async () => {
  await withMocks(200, async ({ calls }) => {
    const old = event({ timestamp: new Date(Date.now() - 3600 * 1000).toISOString() })
    const res = await worker.fetch(post(old), { ...ENV, MAX_EVENT_AGE_SECONDS: '300' })
    assert.equal(res.status, 401)
    assert.equal(calls.length, 0)
  })
})

// ---------------------------------------------------------------- scheduled()

neu('scheduled() ruft den Deploy-Hook genau einmal per POST auf und loggt Erfolg ohne URL', async () => {
  await withMocks(200, async ({ calls, logs }) => {
    const ctx = makeCtx()
    await worker.scheduled({ cron: '0 */6 * * *', scheduledTime: Date.now() }, { DEPLOY_HOOK_URL: HOOK_URL }, ctx)
    assert.equal(ctx.promises.length, 1, 'Arbeit laeuft ueber ctx.waitUntil')
    await ctx.promises[0]
    assert.equal(calls.length, 1)
    assert.equal(calls[0].url, HOOK_URL)
    assert.equal(calls[0].init.method, 'POST')
    assert.equal(calls[0].init.body, undefined)
    assert.ok(logs.some((l) => l.includes('200')))
    noSecrets(logs)
  })
})

neu('scheduled() braucht NOTION_VERIFICATION_TOKEN nicht', async () => {
  await withMocks(200, async ({ calls }) => {
    const ctx = makeCtx()
    await worker.scheduled({ cron: '0 */6 * * *' }, { DEPLOY_HOOK_URL: HOOK_URL }, ctx)
    await ctx.promises[0]
    assert.equal(calls.length, 1)
  })
})

for (const status of [400, 404, 500, 503]) {
  neu(`scheduled(): Hook-HTTP-${status} schlaegt fehl (Lauf als Fehler sichtbar) und wird protokolliert`, async () => {
    await withMocks(status, async ({ logs }) => {
      const ctx = makeCtx()
      await worker.scheduled({ cron: '0 */6 * * *' }, { DEPLOY_HOOK_URL: HOOK_URL }, ctx)
      await assert.rejects(ctx.promises[0], new RegExp(String(status)))
      assert.ok(logs.some((l) => l.includes(String(status))))
      noSecrets(logs)
    })
  })
}

neu('scheduled(): Netzwerkfehler schlaegt fehl, Log und Fehlermeldung ohne URL', async () => {
  await withMocks('network', async ({ logs }) => {
    const ctx = makeCtx()
    await worker.scheduled({ cron: '0 */6 * * *' }, { DEPLOY_HOOK_URL: HOOK_URL }, ctx)
    await assert.rejects(ctx.promises[0], (err) => {
      assert.ok(!String(err.message).includes('SECRETPATH'))
      assert.ok(!String(err.stack).includes('SECRETPATH'))
      return true
    })
    noSecrets(logs)
  })
})

neu('scheduled(): fehlende DEPLOY_HOOK_URL schlaegt fehl, kein fetch', async () => {
  await withMocks(200, async ({ calls, logs }) => {
    const ctx = makeCtx()
    await worker.scheduled({ cron: '0 */6 * * *' }, {}, ctx)
    await assert.rejects(ctx.promises[0], /nicht konfiguriert|not configured/i)
    assert.equal(calls.length, 0)
    assert.ok(logs.length >= 1)
  })
})

neu('scheduled(): haengender Hook endet nach Timeout mit Fehler', { timeout: 5000 }, async () => {
  await withMocks('hang', async ({ logs }) => {
    const ctx = makeCtx()
    await worker.scheduled({ cron: '0 */6 * * *' }, { DEPLOY_HOOK_URL: HOOK_URL, DEPLOY_HOOK_TIMEOUT_MS: '50' }, ctx)
    await assert.rejects(ctx.promises[0])
    noSecrets(logs)
  })
})

// ---------------------------------------------------------------- Oeffentliche Angriffsflaeche

neu('es gibt keinen oeffentlich erreichbaren Weg, einen Deploy ohne gueltige Signatur auszuloesen', async () => {
  await withMocks(200, async ({ calls }) => {
    const attempts = [
      get(),
      new Request(url + '__scheduled?cron=0+*/6+*+*+*'),
      new Request(url + 'deploy'),
      new Request(url + '?run=1', { method: 'POST', body: '{}' }),
      post(JSON.stringify({ verification_token: 'x', deploy: true })),
      post(event(), { 'X-Notion-Signature': 'sha256=' + 'a'.repeat(64) }),
      post(event(), { 'X-Forwarded-For': '127.0.0.1', 'CF-Connecting-IP': '127.0.0.1' }),
    ]
    for (const r of attempts) {
      await worker.fetch(r, ENV)
    }
    assert.equal(calls.length, 0)
  })
})
