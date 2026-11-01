import { normalizeSnapshotOrigin } from '@ombelle/contracts'

/** Production uses deployment-local static files; dev overrides are loopback only. */
export function previewFrameUrl(kind: 'editor' | 'preset', override?: string): string {
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
