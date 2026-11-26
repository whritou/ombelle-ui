import { normalizeSnapshotOrigin } from '@ombelle/contracts'

/** A literal loopback HTTP(S) origin with no path: the only kind of dev preview origin the site accepts. */
const loopbackOrigin = /^https?:\/\/(?:127\.0\.0\.1|\[::1\])(?::[0-9]+)?$/i

/**
 * The origin a block preview frame loads its stylesheets from, given the page that framed it and the frame's own
 * origin. The framing page's origin is trusted only when it is the frame's own, or when both are literal loopback dev
 * servers (the site and the preview app on their dev ports). Otherwise '' keeps the same-origin path.
 */
export function blockStylesOrigin(referrer: string, own: string): string {
  let origin: string
  try {
    origin = new URL(referrer).origin
  } catch {
    return ''
  }
  if (origin === own) return ''
  return loopbackOrigin.test(origin) && loopbackOrigin.test(own) ? origin : ''
}

/** Production uses deployment-local static files; dev overrides are loopback only. */
export function previewFrameUrl(kind: 'editor' | 'preset' | 'block', override?: string): string {
  if (!override) return `/ombelle-preview/${kind}-preview/`
  try {
    // Inspect the supplied authority before URL parsing rewrites numeric aliases.
    if (!/^https?:\/\/(?:127\.0\.0\.1|\[::1\])(?::[0-9]+)?\/?$/i.test(override))
      throw new Error('Nonliteral loopback origin')
    const origin = normalizeSnapshotOrigin(override)
    const url = new URL(origin)
    if (!['127.0.0.1', '[::1]'].includes(url.hostname)) throw new Error('Non-loopback origin')
    return `${origin}/${kind}-preview/`
  } catch {
    throw new Error('Preview override must be a literal loopback HTTP(S) origin without credentials, path, query or fragment')
  }
}
