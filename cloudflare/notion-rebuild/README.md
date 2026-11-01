# Notion-Rebuild-Worker (`faceandmore-notion-rebuild`)

Stoesst einen Cloudflare-Pages-Build der Website an (Deploy-Hook), weil die Seite statisch
exportiert wird und Notion-Inhalte (Blog, Angebote inkl. "Gültig bis") nur beim Build gelesen werden.

Zwei Ausloeser:

1. **Notion-Webhook** (`fetch`, POST): Notion meldet eine Aenderung, der Worker prueft die
   HMAC-SHA256-Signatur (`X-Notion-Signature`) und ruft den Deploy-Hook auf.
2. **Cron** (`scheduled`, alle 6 Stunden): ruft denselben Deploy-Hook auf, damit abgelaufene
   Angebote ("Gültig bis") auch ohne Notion-Aenderung verschwinden.
   **Aktuell NICHT aktiv**, siehe "Cron aktivieren".

Der Deploy-Hook muss auf den Produktionsbranch **`static-export-cloudflare`** zeigen. Zeigt er auf
einen anderen Branch, entsteht nur ein Preview und die Live-Seite aktualisiert sich nicht.

## Dateien

| Datei | Inhalt |
|---|---|
| `src/index.js` | Worker. Die Signaturpruefung (`signatureToBytes`, `verifyNotionSignature`) ist Zeichen fuer Zeichen der zuerst veroeffentlichte Code. |
| `wrangler.toml` | Name, Einstiegspunkt, Compatibility Date, Cron (auskommentiert) |
| `test/worker.test.mjs` | Unit-Tests (`npm test`), Deploy-Hook und `console` simuliert |
| `test/integration.mjs` | Test in der echten Laufzeit (`npm run test:integration`), Hook = Mock auf 127.0.0.1 |

Git-Verlauf: Der erste Commit enthaelt den veroeffentlichten Stand unveraendert, die spaeteren
Commits die Aenderungen. `git diff <erster-commit> -- src/index.js` zeigt genau, was neu ist.

## Secrets und Variablen

Secrets stehen nur im Cloudflare-Dashboard (bzw. lokal in `.dev.vars`, gitignored), nie im Repo.

| Name | Art | Pflicht | Zweck |
|---|---|---|---|
| `NOTION_VERIFICATION_TOKEN` | Secret | ja | HMAC-Geheimnis fuer die Signaturpruefung |
| `DEPLOY_HOOK_URL` | Secret | ja | Cloudflare-Pages-Deploy-Hook (die URL selbst ist geheim) |
| `NOTION_SETUP_MODE` | Variable | nein | `1` erlaubt das Loggen eines Verification-Tokens auch bei gesetztem Secret (nur fuer Token-Rotation) |
| `MAX_EVENT_AGE_SECONDS` | Variable | nein | Optionaler Replay-Schutz, siehe unten. Ohne Wert: aus |
| `DEPLOY_HOOK_TIMEOUT_MS` | Variable | nein | Zeitlimit fuer den Hook-Aufruf, Standard 10000, maximal 60000 |

## Was sich gegenueber dem veroeffentlichten Stand geaendert hat

| Aenderung | Wirkung auf den normalen Betrieb |
|---|---|
| `scheduled()` ruft den Hook auf; ein Fehler macht den Cron-Lauf in Cloudflare als fehlgeschlagen sichtbar | neu, Cron ist noch nicht aktiviert |
| Deploy-Hook-Aufruf zentral: Zeitlimit, Fehlerprotokoll ohne URL, bei Fehler HTTP-Status im Log | Antworten bleiben gleich (`200` / `502 ... failed: <Status>`); neu: `502 ... failed: timeout / network error` und `503 Deploy hook is not configured.` statt eines Absturzes |
| Verification-Token wird nur noch im Einrichtungsmodus geloggt (Secret fehlt oder `NOTION_SETUP_MODE=1`) und von Steuerzeichen bereinigt | Antwort unveraendert (`200 Notion verification received.`) |
| JSON, das kein Objekt ist (`null`, Zahl, Text, Liste), ergibt `400 Invalid JSON` | vorher Absturz bei `null` |
| Anfragen ueber 1 MB ergeben `413` (vor und nach dem Lesen geprueft) | Notion-Events sind wenige KB gross |
| Ein `verification_token`, das kein Text ist, gilt nicht als Einrichtungsanfrage | betrifft nur manipulierte Anfragen |
| Optionaler Replay-Schutz `MAX_EVENT_AGE_SECONDS` | standardmaessig aus |

## Sicherheitsbewertung des Webhooks

* **Wer kann einen Deploy ausloesen?** Nur ein POST mit gueltiger HMAC-Signatur. Es gibt keinen
  GET-Weg, keinen zusaetzlichen Pfad und keine Parameter, die einen Deploy ausloesen. Der Cron-Handler
  ist von aussen nicht aufrufbar (`/__scheduled` existiert nur unter `wrangler dev --test-scheduled`).
* **Signaturpruefung:** `crypto.subtle.verify` vergleicht in konstanter Zeit; Format, Laenge und
  Hex-Zeichen werden vorher geprueft; die Pruefung laeuft ueber den exakten UTF-8-Body.
* **GET:** liefert nur die feste Meldung "Face & More Notion-Automatik ist aktiv." Das verraet, dass
  der Dienst existiert, aber nichts ueber Konfiguration oder Secrets.
* **Oeffentliche Erreichbarkeit:** Der Worker ist ueber seine Route (workers.dev und/oder eigene
  Domain) fuer jeden erreichbar. Das ist bei Webhooks unvermeidlich; die Absicherung ist die Signatur.
  Missbrauch ohne Signatur hat keine Wirkung ausser Last. Empfehlung: im Dashboard eine
  Rate-Limiting-Regel (WAF) fuer die Worker-Route setzen, und workers.dev abschalten, falls der Worker
  ueber eine eigene Domain laeuft.
* **Token im Log:** Der Verification-Token ist zugleich das HMAC-Geheimnis. Der veroeffentlichte Code
  hat ihn bei jeder Anfrage mit `verification_token` ausgegeben, auch von Unbefugten. Jetzt nur noch im
  Einrichtungsmodus. **Wurde der Token bereits geloggt (Einrichtung), liegt er in den Cloudflare-Logs
  und sollte rotiert werden** (siehe "Token rotieren").
* **Replay:** Notion signiert nur den Body, ohne Zeitstempel im Header. Ein abgefangenes, gueltig
  signiertes Event liesse sich erneut senden. Folge waere hoechstens ein zusaetzlicher Rebuild, keine
  Datenaenderung. Der optionale Schutz `MAX_EVENT_AGE_SECONDS` lehnt Events ab, deren (signierter)
  `timestamp` zu alt ist oder in der Zukunft liegt. **Vor dem Einschalten pruefen**, dass die echten
  Notion-Events ein Feld `timestamp` im Body haben (sonst werden alle Events abgelehnt), und den Wert
  grosszuegig waehlen: Notion wiederholt fehlgeschlagene Zustellungen, ein zu kurzes Limit wuerde
  solche Wiederholungen verwerfen. Fuer echte Deduplizierung waere ein Speicher (KV oder Durable
  Object) noetig, das ist hier bewusst nicht enthalten.
* **Build-Kontingent:** Jede signierte Anfrage und jeder Cron-Lauf startet einen Build. Beim
  Bearbeiten in Notion koennen mehrere Events kurz nacheinander eintreffen. Das Kontingent des
  Cloudflare-Plans (z. B. 500 Builds pro Monat im Free-Plan) im Blick behalten: 4 Cron-Laeufe pro Tag
  sind rund 120 Builds pro Monat.

## Lokal testen (ohne Deploy, ohne echten Hook)

```
cd cloudflare/notion-rebuild
npm test                    # Unit-Tests, kein Netzwerk
npm run test:integration    # echte Laufzeit via wrangler dev, Mock-Hook auf 127.0.0.1
```

Die Tests mit `[kompatibel]` im Namen halten das Verhalten des zuerst veroeffentlichten Workers fest
und laufen auch gegen dessen Code (`WORKER_PATH=<alte Datei> npm test`).

## Vor dem Deploy abgleichen (nicht aus dem Dashboard uebernommen)

* **Compatibility Date** in `wrangler.toml` mit dem Dashboard abgleichen (Settings, Runtime).
* **workers.dev / Routen:** `wrangler deploy` kann die im Dashboard eingestellte Erreichbarkeit
  veraendern. Vorher `workers_dev` und `routes` in `wrangler.toml` passend zum Dashboard setzen.
* **Bestehende Secrets** bleiben bei `wrangler deploy` erhalten; keine neuen setzen noetig.

## Cron aktivieren (noch NICHT getan)

1. Geaenderten Worker deployen und GET, signierten POST und Hook-Fehlerfall pruefen.
2. In `wrangler.toml` den Block `[triggers] crons = ["0 */6 * * *"]` einkommentieren und erneut
   deployen (`0 */6 * * *` = 00:00, 06:00, 12:00, 18:00 UTC; Cloudflare-Cron kennt keine Zeitzonen).
3. Nach dem ersten Lauf im Dashboard (Worker, Triggers bzw. Logs) pruefen, dass er erfolgreich war
   und ein Pages-Build entstanden ist.

## Token rotieren

1. Im Dashboard Variable `NOTION_SETUP_MODE` = `1` setzen.
2. In Notion die Webhook-Subscription neu anlegen bzw. den Token neu erzeugen lassen; Notion sendet
   den neuen `verification_token` an den Worker, er erscheint im Worker-Log.
3. Token in Notion bestaetigen und als Secret `NOTION_VERIFICATION_TOKEN` setzen.
4. `NOTION_SETUP_MODE` wieder entfernen und das Log mit dem alten Token loeschen bzw. ablaufen lassen.

## Verhaeltnis zu `cloudflare/rebuild-cron`

`../rebuild-cron/` ist ein frueherer Entwurf (nur Cron, kein Notion-Webhook) und wurde nie deployt.
Dieser Worker ersetzt ihn; der alte Ordner kann spaeter entfernt werden.
