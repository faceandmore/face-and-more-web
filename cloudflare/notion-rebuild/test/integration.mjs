// Integrationstest in der echten Workers-Laufzeit (workerd) ueber "wrangler dev --local".
//   npm run test:integration      (benoetigt Internet nur zum Laden von wrangler per npx)
//
// Es wird NIE ein echter Deploy-Hook aufgerufen: DEPLOY_HOOK_URL zeigt auf einen Mock-Server
// auf 127.0.0.1. Die lokalen Test-Secrets stehen in .dev.vars (gitignored) und werden am Ende
// wieder geloescht. Kein Login, kein Deployment, keine Verbindung zu Cloudflare-Konten.

import http from 'node:http'
import { spawn, execSync } from 'node:child_process'
import { createHmac } from 'node:crypto'
import { rmSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import assert from 'node:assert/strict'

const root = path.resolve(import.meta.dirname, '..')
const WORKER_PORT = 8788
const TOKEN = 'local-test-token-not-a-secret'
const HOOK_SECRET_PATH = 'LOCAL-HOOK-SECRET-4711'
const base = `http://127.0.0.1:${WORKER_PORT}`

// --- Mock-Deploy-Hook -------------------------------------------------------
const hookCalls = []
let hookStatus = 200
const hook = http.createServer((req, res) => {
  hookCalls.push({ method: req.method, path: req.url })
  res.statusCode = hookStatus
  res.end('{}')
})
await new Promise((resolve) => hook.listen(0, '127.0.0.1', resolve))
const hookPort = hook.address().port

writeFileSync(
  path.join(root, '.dev.vars'),
  `NOTION_VERIFICATION_TOKEN=${TOKEN}\nDEPLOY_HOOK_URL=http://127.0.0.1:${hookPort}/${HOOK_SECRET_PATH}\nDEPLOY_HOOK_TIMEOUT_MS=3000\n`
)

// --- wrangler dev starten ---------------------------------------------------
let output = ''
const child = spawn(
  'npx',
  ['--yes', 'wrangler@4', 'dev', '--local', '--test-scheduled', '--ip', '127.0.0.1', '--port', String(WORKER_PORT), '--show-interactive-dev-session=false'],
  { cwd: root, shell: true, env: { ...process.env, WRANGLER_SEND_METRICS: 'false', CI: '1', NO_COLOR: '1' } }
)
child.stdout.on('data', (d) => { output += d })
child.stderr.on('data', (d) => { output += d })

let cleaned = false
const cleanup = async () => {
  if (cleaned) return
  cleaned = true
  try {
    if (process.platform === 'win32') execSync(`taskkill /pid ${child.pid} /T /F`, { stdio: 'ignore' })
    else child.kill('SIGKILL')
  } catch { /* Prozess bereits beendet */ }
  hook.close()
  // Zuerst die Test-Secrets entfernen; das wrangler-Arbeitsverzeichnis erst, wenn workerd die Dateien freigibt.
  rmSync(path.join(root, '.dev.vars'), { force: true })
  for (let i = 0; i < 20; i++) {
    try {
      rmSync(path.join(root, '.wrangler'), { recursive: true, force: true })
      return
    } catch {
      await new Promise((r) => setTimeout(r, 500))
    }
  }
  console.warn('Hinweis: .wrangler konnte nicht geloescht werden (ist gitignored).')
}
process.on('exit', () => rmSync(path.join(root, '.dev.vars'), { force: true }))

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
async function waitReady() {
  for (let i = 0; i < 240; i++) {
    try {
      const res = await fetch(base + '/')
      if (res.status === 200) return
    } catch { /* noch nicht bereit */ }
    await sleep(500)
  }
  throw new Error('wrangler dev wurde nicht bereit.\n' + output.slice(-2000))
}

const sign = (body) => 'sha256=' + createHmac('sha256', TOKEN).update(body).digest('hex')
const event = () => JSON.stringify({ id: 'evt-it', timestamp: new Date().toISOString(), type: 'page.content_updated' })
const results = []
const check = async (name, fn) => {
  try { await fn(); results.push(['OK ', name]) } catch (e) { results.push(['FEHLER', name + ' -> ' + e.message]); process.exitCode = 1 }
}

try {
  await waitReady()

  await check('GET liefert die Statusmeldung, kein Deploy', async () => {
    const res = await fetch(base + '/')
    assert.equal(res.status, 200)
    assert.equal(await res.text(), 'Face & More Notion-Automatik ist aktiv.')
    assert.equal(hookCalls.length, 0)
  })

  await check('POST ohne Signatur: 401, kein Deploy', async () => {
    const res = await fetch(base + '/', { method: 'POST', body: event() })
    assert.equal(res.status, 401)
    assert.equal(hookCalls.length, 0)
  })

  await check('POST mit falscher Signatur: 401, kein Deploy', async () => {
    const res = await fetch(base + '/', { method: 'POST', body: event(), headers: { 'X-Notion-Signature': 'sha256=' + '0'.repeat(64) } })
    assert.equal(res.status, 401)
    assert.equal(hookCalls.length, 0)
  })

  await check('POST mit gueltiger Signatur: 200, genau ein Hook-Aufruf per POST', async () => {
    const body = event()
    const res = await fetch(base + '/', { method: 'POST', body, headers: { 'X-Notion-Signature': sign(body) } })
    assert.equal(res.status, 200)
    assert.equal(await res.text(), 'Cloudflare deployment triggered.')
    assert.equal(hookCalls.length, 1)
    assert.equal(hookCalls[0].method, 'POST')
  })

  await check('Verification-Token im Normalbetrieb: 200, Token nicht im Log', async () => {
    const res = await fetch(base + '/', { method: 'POST', body: JSON.stringify({ verification_token: 'secret_darf_nicht_im_log_stehen' }) })
    assert.equal(res.status, 200)
    assert.equal(hookCalls.length, 1)
    await sleep(300)
    assert.ok(!output.includes('secret_darf_nicht_im_log_stehen'))
  })

  await check('ungueltige Methoden und Pfade loesen keinen Deploy aus', async () => {
    for (const method of ['PUT', 'DELETE']) assert.equal((await fetch(base + '/', { method })).status, 405)
    await fetch(base + '/deploy', { method: 'POST', body: '{}' })
    assert.equal(hookCalls.length, 1)
  })

  await check('scheduled(): ruft den Deploy-Hook auf', async () => {
    const res = await fetch(`${base}/__scheduled?cron=0+*/6+*+*+*`)
    assert.equal(res.status, 200)
    await sleep(500)
    assert.equal(hookCalls.length, 2)
    assert.equal(hookCalls[1].method, 'POST')
  })

  hookStatus = 500
  await check('scheduled(): Hook-Fehler 500 wird als Fehler gemeldet und protokolliert', async () => {
    const before = hookCalls.length
    const res = await fetch(`${base}/__scheduled?cron=0+*/6+*+*+*`)
    assert.notEqual(res.status, 200, 'fehlgeschlagener Cron-Lauf darf nicht als Erfolg erscheinen')
    await sleep(500)
    assert.equal(hookCalls.length, before + 1)
    assert.ok(output.includes('HTTP 500'), 'Statuscode steht im Log')
  })

  await check('Webhook: Hook-Fehler 500 -> 502 mit Statuscode', async () => {
    const body = event()
    const res = await fetch(base + '/', { method: 'POST', body, headers: { 'X-Notion-Signature': sign(body) } })
    assert.equal(res.status, 502)
    assert.equal(await res.text(), 'Cloudflare deployment failed: 500')
  })

  await check('keine Secrets in der Ausgabe der Laufzeit', async () => {
    assert.ok(!output.includes(HOOK_SECRET_PATH), 'Hook-Pfad darf nicht im Log stehen')
    assert.ok(!output.includes(TOKEN), 'Token darf nicht im Log stehen')
  })
} finally {
  console.log('\nIntegrationstest (workerd, lokal, simulierter Hook):')
  for (const [state, name] of results) console.log(`  ${state} ${name}`)
  console.log(`  Hook-Aufrufe am Mock gesamt: ${hookCalls.length} (nur 127.0.0.1)`)
  await cleanup()
}
