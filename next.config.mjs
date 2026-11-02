// Statischer Cloudflare-Pages-Export (Migration von Vercel):
// - Security-Header stehen jetzt in public/_headers (next.config-headers() greifen bei
//   output: "export" nicht mehr) — CSP, HSTS etc. wurden 1:1 aus dem bisherigen next.config
//   uebernommen, nicht verschaerft. Externe Ressourcen (Stand Security-Review 2026-07-11):
//   Schriften werden per next/font/google (app/fonts.ts) beim Build geladen und selbst gehostet,
//   daher keine Font-Hosts mehr in der CSP,
//   Google-Maps-Embed-iframe im SiteFooter (www.google.com), Notion als Headless-CMS liefert
//   Cover-/Angebotsbilder mit wechselnden Hosts -> img-src bleibt pauschal https:.
// - Redirects stehen jetzt in public/_redirects (next.config-redirects() greifen bei
//   output: "export" ebenfalls nicht mehr).
/** @type {import('next').NextConfig} */
const nextConfig = {
  output: "export",
  images: {
    unoptimized: true,
  },
  webpack(config) {
    // Replace next-image-loader with asset/resource so that
    // `import img from './image.jpg'` returns a URL string (Vite-compatible behavior)
    function processRules(rules) {
      return rules.map((rule) => {
        if (!rule) return rule

        if (rule.oneOf) {
          return { ...rule, oneOf: processRules(rule.oneOf) }
        }

        if (
          rule.use &&
          Array.isArray(rule.use) &&
          rule.use.some(
            (u) =>
              u &&
              typeof u.loader === 'string' &&
              (u.loader.includes('next-image-loader') ||
                u.loader.includes('image-loader'))
          )
        ) {
          return {
            test: rule.test,
            issuer: rule.issuer,
            type: 'asset/resource',
            generator: { filename: 'static/media/[name].[contenthash][ext]' },
          }
        }

        return rule
      })
    }

    config.module.rules = processRules(config.module.rules)
    return config
  },
}

export default nextConfig
