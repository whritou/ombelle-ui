/**
 * Site-wide security headers (SEC-01). The policy restricts framing, plugins, `<base>` and form targets
 * without a script-src: Next.js App Router hydrates through inline scripts, the theme script is inline,
 * and the editors start module workers, so a script policy needs per-request nonces and is left for later.
 *
 * - frame-ancestors 'self': no other site can frame the editors, the code pages or the preview pages.
 *   The editors frame the preview pages from this origin, which stays allowed.
 * - frame-src 'self': a preview frame cannot navigate to another site (a published recipe's link).
 *   A local loopback preview origin (NEXT_PUBLIC_OMBELLE_PREVIEW_ORIGIN) is added when one is configured.
 */
export function securityHeaders(previewOrigin?: string): { key: string; value: string }[] {
  const loopback = previewOrigin && /^https?:\/\/(?:127\.0\.0\.1|\[::1\])(?::[0-9]+)?\/?$/i.test(previewOrigin)
    ? ' ' + previewOrigin.replace(/\/$/, '')
    : ''
  return [
    {
      key: 'Content-Security-Policy',
      value: `frame-ancestors 'self'; frame-src 'self'${loopback}; object-src 'none'; base-uri 'none'; form-action 'self'`,
    },
    { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
    { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
    { key: 'X-Content-Type-Options', value: 'nosniff' },
    { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=(), payment=(), usb=()' },
  ]
}

/** Every `headers()` rule of the site: security headers everywhere, and the preview's sandbox access. */
export function headerRules(previewOrigin?: string): { source: string; headers: { key: string; value: string }[] }[] {
  return [{
    source: '/:path*',
    headers: securityHeaders(previewOrigin),
  }, {
    source: '/ombelle-preview/:path*',
    // Module imports from the opaque sandbox have Origin: null. These are
    // public static files; publication APIs retain their same-origin policy.
    headers: [
      { key: 'Access-Control-Allow-Origin', value: '*' },
      { key: 'X-Content-Type-Options', value: 'nosniff' },
    ],
  }]
}
