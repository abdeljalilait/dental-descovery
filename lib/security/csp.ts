/**
 * Content-Security-Policy for every HTML response.
 *
 * `script-src` relies on a per-response nonce plus `'strict-dynamic'`: the nonce
 * authorises Next's bootstrap script, and `'strict-dynamic'` then lets that
 * script load the remaining chunks without listing every origin.
 * `'unsafe-inline'` is deliberately absent from `script-src`.
 *
 * `style-src` keeps `'unsafe-inline'` on purpose. Radix primitives position
 * themselves with inline `style` attributes, which CSP3 governs from
 * `style-src`; a nonce cannot authorise an attribute. Styles are a much weaker
 * injection surface than scripts, so this is the intended trade-off rather than
 * an oversight.
 */
export function buildContentSecurityPolicy(nonce: string, isDev: boolean): string {
  const directives = [
    `default-src 'self'`,
    // `unsafe-eval` is required by the dev server's HMR runtime, never in production.
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic'${isDev ? " 'unsafe-eval'" : ""}`,
    `style-src 'self' 'unsafe-inline'`,
    // Admin-authored blog covers are arbitrary https URLs; data:/blob: back Next's image work.
    `img-src 'self' data: blob: https:`,
    `font-src 'self' data:`,
    // The dev server holds open a websocket for HMR.
    `connect-src 'self'${isDev ? " ws:" : ""}`,
    `object-src 'none'`,
    `base-uri 'self'`,
    `form-action 'self'`,
    `frame-ancestors 'self'`,
    `manifest-src 'self'`,
    // No `upgrade-insecure-requests`: HSTS already upgrades the domain, and the
    // app has no http subresources. Adding it here would break the documented
    // plain-HTTP `docker-compose.yml` deployment by rewriting `/_next` assets
    // to https.
  ];

  return directives.join("; ");
}
