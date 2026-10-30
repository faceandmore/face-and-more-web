import { Cormorant_Garamond, Inter } from 'next/font/google'

// Selbst gehostete Schriften (next/font laedt die Dateien beim Build und liefert sie von der
// eigenen Domain aus - kein Request mehr an fonts.googleapis.com / fonts.gstatic.com).
//
// Bewusst unveraendert zur frueheren @import-Einbindung:
// - Gewichte 300-600 (Google liefert beide Familien als Variable Font, also eine Datei pro Subset).
//   Kein 700er: Anfragen mit font-bold werden wie bisher auf 600 abgebildet.
// - Nur der Normal-Schnitt. Kursiv (Klasse "italic") wird wie bisher vom Browser synthetisiert;
//   ein echter Kursivschnitt wuerde die Darstellung veraendern.
// - Subset "latin" deckt alle Zeichen der Seiten ab (Umlaute, ss, Euro, Anfuehrungszeichen, Gedankenstriche).
//   Die Zeichen fuer Pfeile/Sterne (→ ← ◆ ★) liefert wie bisher die System-Schrift.
// - adjustFontFallback: false, damit diese Zeichen nicht ueber die generierte Fallback-Schrift (Arial/Times)
//   statt ueber system-ui/Georgia gerendert werden - sonst waeren Pfeil-Links 3px breiter als bisher.

export const cormorantGaramond = Cormorant_Garamond({
  subsets: ['latin'],
  weight: ['300', '400', '500', '600'],
  display: 'swap',
  adjustFontFallback: false,
  variable: '--font-serif',
})

export const inter = Inter({
  subsets: ['latin'],
  weight: ['300', '400', '500', '600'],
  display: 'swap',
  adjustFontFallback: false,
  variable: '--font-sans',
})
