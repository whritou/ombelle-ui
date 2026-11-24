// SEC-01: every route sends framing, plugin, base and referrer restrictions, and the preview pages keep
// the cross-origin access the opaque sandbox needs.
import { expect, it } from 'vitest'
import { headerRules, securityHeaders } from './security-headers'

const csp = (headers: { key: string; value: string }[]) => headers.find(header => header.key === 'Content-Security-Policy')!.value

it('applies the security headers to every route, previews included', async () => {
  const rules = headerRules()
  const site = rules.find(rule => rule.source === '/:path*')!
  expect(csp(site.headers)).toContain("frame-ancestors 'self'")
  expect(csp(site.headers)).toContain("frame-src 'self'")
  expect(csp(site.headers)).toContain("object-src 'none'")
  expect(csp(site.headers)).toContain("base-uri 'none'")
  expect(csp(site.headers)).not.toContain('script-src')
  expect(site.headers).toEqual(expect.arrayContaining([
    { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
    { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
  ]))
  const preview = rules.find(rule => rule.source === '/ombelle-preview/:path*')!
  expect(preview.headers).toContainEqual({ key: 'Access-Control-Allow-Origin', value: '*' })
})

it('lets the editors frame only a literal loopback preview origin besides their own', () => {
  expect(csp(securityHeaders('http://127.0.0.1:5173'))).toContain("frame-src 'self' http://127.0.0.1:5173;")
  expect(csp(securityHeaders('https://evil.example'))).toContain("frame-src 'self';")
})
