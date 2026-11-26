// No imports: the block preview frame loads this module, and must not pull in @ombelle/contracts.

/** A literal loopback HTTP(S) origin with no path: the only kind of dev preview origin the site accepts. */
const loopbackOrigin = /^https?:\/\/(?:127\.0\.0\.1|\[::1\])(?::[0-9]+)?$/i

/** The origin of an http(s) URL, or null for anything else (an opaque "null", an unparsable string, another scheme). */
function httpOrigin(url: string): string | null {
  try {
    const parsed = new URL(url)
    return parsed.protocol === 'http:' || parsed.protocol === 'https:' ? parsed.origin : null
  } catch {
    return null
  }
}

/**
 * The origin a block preview frame loads its stylesheets from, given the page that framed it (`document.referrer`)
 * and the frame's own URL (`location.href`). The frame is sandboxed without allow-same-origin, so its document origin
 * (`self.origin`) is the opaque "null"; the URL still names the server it was loaded from, so that is what is compared.
 * The framing page's origin is trusted only when it is the frame's own, or when both are literal loopback dev servers
 * (the site and the preview app on their dev ports). Anything else, including an opaque or unparsable value, gives ''
 * and keeps the same-origin path.
 */
export function blockStylesOrigin(referrer: string, frameUrl: string): string {
  const site = httpOrigin(referrer), own = httpOrigin(frameUrl)
  if (!site || !own || site === own) return ''
  return loopbackOrigin.test(site) && loopbackOrigin.test(own) ? site : ''
}
