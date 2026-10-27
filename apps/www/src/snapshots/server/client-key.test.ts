import { expect, it } from 'vitest'
import { clientRateKey } from './client-key'
import type { SnapshotConfig } from './config'

const config: SnapshotConfig = {
  dbPath: '/private/store.sqlite', publicOrigin: 'https://example.test', rateSecret: 's'.repeat(32),
  clientIdentity: { mode: 'trusted-header', header: 'x-trusted-ip' },
}

it('ignores spoofable forwarding headers and persists only an HMAC', () => {
  const headers = new Headers({ 'x-trusted-ip': '192.0.2.1', 'X-Forwarded-For': '1.2.3.4', Forwarded: 'for=1.2.3.4' })
  const key = clientRateKey(headers, config)
  expect(key).toMatch(/^[a-f0-9]{64}$/)
  expect(clientRateKey(new Headers({ 'x-trusted-ip': '192.0.2.1', 'X-Forwarded-For': '5.6.7.8' }), config)).toBe(key)
  expect(clientRateKey(new Headers({ 'x-trusted-ip': '192.0.2.2' }), config)).not.toBe(key)
  expect(clientRateKey(headers, { ...config, rateSecret: 't'.repeat(32) })).not.toBe(key)
})

it.each([undefined, '', 'garbage', '192.0.2.1, 192.0.2.2', '192.0.2.1:443', '192.0.2.001', '[::1]', 'fe80::1%eth0'])('fails closed for missing, multiple or invalid trusted IP %j', (ip) => {
  const headers = new Headers({ 'X-Forwarded-For': '192.0.2.1' })
  if (ip !== undefined) headers.set('x-trusted-ip', ip)
  expect(() => clientRateKey(headers, config)).toThrowError(expect.objectContaining({ status: 503, code: 'SNAPSHOT_SERVICE_UNAVAILABLE' }))
})

it('normalizes equivalent IPv6 spellings and IPv4-mapped addresses', () => {
  const key = (ip: string) => clientRateKey(new Headers({ 'x-trusted-ip': ip }), config)
  expect(key('2001:0DB8:0000:0000:0000:0000:0000:0001')).toBe(key('2001:db8::1'))
  expect(key('::ffff:192.0.2.1')).toBe(key('192.0.2.1'))
})

it('shares one development bucket independent of all headers', () => {
  const development: SnapshotConfig = { ...config, publicOrigin: 'http://127.0.0.1:3000', clientIdentity: { mode: 'development' } }
  expect(clientRateKey(new Headers(), development)).toBe(clientRateKey(new Headers({ 'x-trusted-ip': '192.0.2.1' }), development))
  expect(clientRateKey(new Headers(), development)).toMatch(/^[a-f0-9]{64}$/)
})
