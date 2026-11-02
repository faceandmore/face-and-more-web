# FACE AND MORE Wien – Projektnotizen

Next.js-Website (App Router) für FACE AND MORE (faceandmore.at), Kosmetikstudio von Michaela Kornherr in Wien. Gebaut und betreut von JAVERA Studio.

---

# Code-Qualität & Architektur-Standards

Baue dieses Next.js-Projekt mit professionellem, wartbarem Code, aber ohne unnötige Überarchitektur. Die Website ist eine überschaubare Unternehmenswebsite für ein Beauty-Studio. Verwende deshalb einfache, klare und bewährte Lösungen.

Achte auf folgende Qualitätsstandards:

- TypeScript im Strict Mode
- saubere und nachvollziehbare Ordnerstruktur
- kleine, logisch getrennte Komponenten
- keine unnötigen Abstraktionen
- keine doppelten Komponenten oder Styles
- wiederverwendbare Komponenten nur dort, wo es sinnvoll ist
- Server Components standardmäßig verwenden
- Client Components nur bei tatsächlicher Interaktivität
- keine unnötigen useEffect- oder useState-Lösungen
- semantisches HTML
- gute Accessibility
- responsive Umsetzung
- optimierte Bilder mit next/image
- saubere Metadaten und SEO-Grundlagen
- verständliche Namen für Dateien, Komponenten und Funktionen
- keine ungenutzten Imports, Dateien oder Variablen
- keine hardcodierten Inhalte, wenn diese sinnvoll zentral gepflegt werden können
- keine großen Komponenten mit zu vielen Verantwortlichkeiten
- keine schnellen Workarounds oder KI-typischen Code-Abkürzungen

Priorisiere Lesbarkeit und Wartbarkeit vor technischer Komplexität. Der Code soll so aufgebaut sein, dass ein erfahrener Entwickler das Projekt später problemlos übernehmen, verstehen und erweitern kann.

Bevor eine Aufgabe abgeschlossen wird, prüfen:

1. Ist die Lösung einfacher möglich?
2. Gibt es doppelten Code?
3. Ist die Komponente zu groß?
4. Wird unnötig Client-side JavaScript verwendet?
5. Sind Benennung und Struktur verständlich?
6. Bleibt die bestehende Funktionalität erhalten?
7. Würde diese Lösung eine professionelle Code-Review bestehen?

Nach Änderungen immer TypeScript-, Lint- und Build-Prüfungen ausführen und gefundene Fehler beheben.

---

# AEO (Answer Engine Optimization) Standards für JAVERA Next.js Projekte

Canonical/Single Source of Truth: [Javera-Studio/javera-dev-standards](https://github.com/Javera-Studio/javera-dev-standards) (AEO-STANDARDS.md). Diese Kopie hier ist die für dieses Repo verbindliche, git-getrackte Fassung — bei Änderungen am Standard beide Stellen synchron halten.

Gilt zusätzlich zu den bestehenden SEO- und Security-Standards. AEO baut auf sauberem SEO auf, ersetzt es nicht — technische SEO-Basis (Sitemap, robots.txt, Ladezeit, Crawlbarkeit) bleibt Voraussetzung.

Ziel: Inhalte so strukturieren, dass ChatGPT, Google AI Overviews, Perplexity, Gemini & Co. sie direkt als Antwort extrahieren und zitieren können — nicht nur klassisches Ranking.

## 1. FAQ-Content + FAQPage-Schema (höchster Hebel, immer umsetzen)

- Jede Kunden-Landingpage (Studio-Startseite, Leistungsseiten wie "Permanent Make-up", "Nagelstudio", "Kosmetik") bekommt einen FAQ-Abschnitt mit echten Kundenfragen — nicht generisch, sondern konkret zur Branche/zum Angebot (z. B. "Wie lange hält Permanent Make-up?", "Was kostet eine Maniküre in Wien?", "Tut PMU weh?")
- FAQ-Fragen vor Umsetzung kurz mit der Kundin abstimmen — sie kennt die tatsächlich häufig gestellten Fragen aus der Praxis
- JSON-LD `FAQPage`-Schema für jeden FAQ-Block einbauen (ergänzt die bereits bestehenden Schema-Typen LocalBusiness/BeautySalon/Service/Review)
- Nach Umsetzung: Schema mit Google Rich Results Test validieren, bevor es live geht — fehlerhaftes Schema schadet mehr als gar keins

## 2. „Answer-First"-Struktur in Content-Blöcken

- Jeder inhaltliche Abschnitt beginnt mit der direkten Antwort in 1–2 Sätzen (ca. 40–60 Wörter), erst danach Kontext, Ausschmückung, Storytelling
- Kein "Storytelling zuerst, Antwort versteckt am Ende" — das erschwert die Extraktion für KI-Engines UND ist für ungeduldige menschliche Leser genauso besser
- Gilt besonders für: Leistungsbeschreibungen, Preisangaben, Behandlungsabläufe, Vorher/Nachher-Erklärungen

## 3. Überschriften-Struktur an echten Fragen ausrichten

- H2/H3-Überschriften so formulieren, wie eine Kundin tatsächlich fragen würde — nicht "Preise", sondern "Was kostet Permanent Make-up in Wien?"
- Überschriften-Hierarchie sauber halten (H1 → H2 → H3, keine Sprünge) — hilft sowohl klassischem SEO als auch AEO-Extraktion

## 4. Strukturierte Formate statt Fließtext, wo möglich

- Preisübersichten → Tabelle, nicht Fließtext-Aufzählung
- Behandlungsschritte/Abläufe → nummerierte Liste
- Leistungsvergleiche (z. B. "Klassisches Microblading vs. Ombré Brows") → Vergleichstabelle
- Prosa-Absätze nur dort belassen, wo echte Erklärung/Storytelling nötig ist (Über-uns-Texte, Markengeschichte)

## 5. Entity-Konsistenz (NAP + Branding)

- Name, Adresse, Öffnungszeiten (NAP) müssen exakt identisch sein auf: Website, Google Business Profile, Instagram-Bio, Treatwell-Profil, Facebook
- Firmenname immer in derselben Schreibweise verwenden — keine Varianten zwischen Kanälen
- Bei jedem neuen Projekt: NAP-Konsistenz als festen Punkt in der Launch-Checkliste mit aufnehmen

## 6. Speakable-Schema (optional, für lokale Sprachsuche)

- Bei Projekten mit starkem lokalem Suchfokus: `Speakable`-Schema für kurze, klar formulierte Kernaussagen ergänzen (Adresse, Öffnungszeiten, Kernleistung)
- Kein Standard-Muss bei jedem Projekt, aber sinnvoll bei Kunden mit Fokus auf lokale/Voice-Suche

## 7. Freshness-Signal

- Sichtbares "Zuletzt aktualisiert"-Datum bei Leistungsseiten/Preislisten dort einbauen, wo technisch sinnvoll (z. B. Preisseite) — Freshness ist ein messbarer Faktor dafür, ob KI-Engines eine Seite als Zitat-Quelle wählen
- Bei Preisänderungen: Datum aktiv mit aktualisieren, nicht nur den Preis ändern

## 8. Off-Page (an Kunden weitergeben, nicht Code-Aufgabe)

- Google-Rezensionen, Treatwell-Bewertungen und Instagram-Erwähnungen aktiv fördern — zählen als externe Vertrauenssignale für KI-Engines, nicht nur für Menschen
- Bei Partnerschaften (Beauty-Akademien, Coworking Spaces): gegenseitige Erwähnungen/Verlinkungen anstoßen, wo passend

## Kurz-Checkliste bei jedem neuen Projekt

- [ ] FAQ-Sektion mit echten Kundenfragen + FAQPage-Schema
- [ ] Answer-First-Struktur in allen Haupttextblöcken
- [ ] Überschriften als natürliche Fragen formuliert
- [ ] Preise/Abläufe/Vergleiche als Liste oder Tabelle statt Fließtext
- [ ] NAP-Konsistenz über alle Kanäle geprüft
- [ ] Schema mit Google Rich Results Test validiert
- [ ] Freshness-Datum bei Preis-/Leistungsseiten, wo sinnvoll

---

# Security Standards für JAVERA Next.js Projekte

Canonical/Single Source of Truth: [Javera-Studio/javera-dev-standards](https://github.com/Javera-Studio/javera-dev-standards) (SECURITY-STANDARDS.md). Diese Kopie hier ist die für dieses Repo verbindliche, git-getrackte Fassung — bei Änderungen am Standard beide Stellen synchron halten.

Diese Standards gelten für **jedes** Next.js-Projekt, das für JAVERA Studio Kunden gebaut wird. Bei Projektstart und vor jedem Production-Deploy prüfen und umsetzen.

## 1. HTTP Security Header (Code-Ebene — immer umsetzen)

In `next.config.js` bzw. `next.config.ts` per `headers()` setzen:

- **Content-Security-Policy (CSP)** — vor dem Setzen IMMER zuerst den Code nach allen extern eingebundenen Ressourcen scannen (Fonts, Analytics-Snippets, Notion-/Elementor-Embeds, Maps-Embeds, Payment-Widgets, Booking-Tools wie Treatwell/Calendly) und die CSP passend dazu bauen. Nie eine generische CSP blind übernehmen — danach lokal testen und Browser-Konsole (F12) auf CSP-Verstöße prüfen.
- **Strict-Transport-Security** — `max-age=63072000; includeSubDomains; preload`
- **X-Frame-Options** — `SAMEORIGIN` (Clickjacking-Schutz)
- **X-Content-Type-Options** — `nosniff`
- **Referrer-Policy** — `strict-origin-when-cross-origin`
- **Permissions-Policy** — nicht genutzte Browser-Features explizit sperren (`camera=()`, `microphone=()`, `geolocation=()` außer bei Standort-Feature wie Anfahrtsbeschreibung)

Nach jedem Deploy: Ergebnis mit securityheaders.com gegenchecken (Ziel: mind. Note A).

Umsetzung in diesem Repo: `next.config.mjs`. Diese Website bindet extern nur ein: ein Google-Maps-Embed-iframe im Footer (`src/components/SiteFooter.tsx`, `www.google.com`) sowie Cover-/Angebotsbilder aus Notion (`lib/notion.ts`, wechselnde https-Hosts — daher `img-src` pauschal `https:`). WhatsApp- (`wa.me`) und Treatwell-Buchungslinks (`trea.tw`) sind reine `<a target="_blank">`-Links, keine Embeds, daher nicht in der CSP. Die Schriften (Cormorant Garamond, Inter) werden über `next/font/google` (`app/fonts.ts`) beim Build geladen und selbst gehostet, daher stehen `fonts.googleapis.com`/`fonts.gstatic.com` nicht mehr in der CSP. Kein Analytics/GTM/Pixel im Einsatz.

## 2. CORS

- `Access-Control-Allow-Origin: *` nur setzen, wenn wirklich öffentliche Assets (z. B. Fonts, Bilder für externe Einbindung) betroffen sind — niemals bei API-Routen mit sensiblen Daten (Formulardaten, Buchungen)
- Next.js API-Routes: CORS explizit und restriktiv pro Route konfigurieren, nicht global öffnen

Umsetzung in diesem Repo: entfällt aktuell — es gibt keine API-Routes (`app/api/**`) und kein Kontaktformular. Terminanfragen laufen ausschließlich über externe Kanäle (WhatsApp-Link, Treatwell-Buchungsseite). Falls künftig ein eigenes Kontaktformular mit API-Route hinzukommt, Abschnitt 3 (Rate-Limiting, Honeypot, serverseitige Validierung) verbindlich nachrüsten.

## 3. Formulare & API-Routes

- Serverseitige Validierung IMMER zusätzlich zur Client-Validierung (Client-Checks sind umgehbar)
- Rate-Limiting auf API-Routes gegen Spam/Missbrauch von Kontaktformularen
- Honeypot-Feld oder einfaches CAPTCHA gegen Bot-Spam bei Buchungsanfragen
- Keine API-Keys, SMTP-Zugangsdaten o. ä. im Client-Bundle — nur `NEXT_PUBLIC_`-Prefix für Werte, die wirklich öffentlich sein dürfen. Alles andere ausschließlich als Server-Env-Variable in Vercel, nie ins Git-Repo committen (`.env.local` in `.gitignore`)

Umsetzung in diesem Repo: Der `NOTION_TOKEN` (siehe `lib/notion.ts`) wird ausschließlich serverseitig (Server Components, Build-Zeit) verwendet und taucht in keinem Client-Bundle auf. `.env*` ist in `.gitignore` erfasst. Kein Kontaktformular vorhanden, daher aktuell kein Rate-Limiting/Honeypot nötig — sobald ein Formular hinzukommt, `src/lib/rate-limit.ts` aus dem javera-studio-Repo als Vorlage übernehmen (self-contained, keine Dependencies).

## 4. Dependencies

- Vor Projektabschluss: `npm audit` laufen lassen, kritische/hohe Findings fixen
- Dependabot bzw. Vercel-eigene Update-Hinweise aktivieren, wo möglich
- Keine veralteten/unmaintained Packages für sicherheitsrelevante Funktionen (Auth, Payment, Formular-Handling)

Stand Security-Review 2026-07-11: `npm audit fix` (ohne `--force`) angewendet, dadurch 6 von 11 Findings behoben (brace-expansion, form-data, lodash, minimatch, picomatch, yaml). Verbleibend 5 Findings (1 moderate, 4 high) — alle erfordern ein Major-Upgrade auf `next@16` (aktuell `next@^14.2.5`) bzw. hängen daran (`postcss`, `glob` via `eslint-config-next`). Bewusst nicht mit `--force` gefixt, da Next 14→16 ein breaking Major-Upgrade ist und eigenes Testing/Review braucht — als separate Aufgabe einplanen.

## 5. robots.txt, sitemap.xml, security.txt

- `robots.txt` und `sitemap.xml` Standard bei jedem Projekt
- `/.well-known/security.txt` ergänzen (RFC 9116)

Umsetzung in diesem Repo: `public/robots.txt`, `app/sitemap.ts`, `public/.well-known/security.txt`.

## 6. Mixed Content

- Sicherstellen, dass ALLE eingebundenen Ressourcen (Bilder, Scripts, Fonts, iframes) über `https://` geladen werden, keine `http://`-Referenzen

Geprüft 2026-07-11: keine `http://`-Ressourcen im Code (nur SVG-Namespace-URIs `http://www.w3.org/2000/svg`, keine echten Ressourcen-Loads).

## 7. Dinge, die NICHT im Code passieren (manuell prüfen/einstellen, aber im Report erwähnen)

| Punkt | Wo einstellen | Warum wichtig |
|---|---|---|
| **DNSSEC** | Beim Domain-Registrar | Schützt vor DNS-Spoofing/Cache-Poisoning |
| **DNS CAA-Record** | Beim DNS-Provider | Legt fest, welche CAs Zertifikate für die Domain ausstellen dürfen |
| **SSL/TLS-Zertifikat** | Bei Vercel automatisch (Let's Encrypt), bei Fremd-Hosting prüfen | Auto-Renewal + TLS 1.3 |
| **SPF / DKIM / DMARC** | Beim E-Mail-/DNS-Provider | Schützt die Domain vor E-Mail-Spoofing/Phishing |
| **Malware-/Blacklist-Scan** | Google Safe Browsing, VirusTotal, Sucuri SiteCheck | Bei jedem Webseitencheck durchführen |
| **Registrar-Zugang/2FA** | Beim Registrar | Kompromittierte Registrar-Logins sind ein häufiger Grund für gehackte Kundenseiten |
