// RL-01: one subscriber rotating the /64s of its IPv6 delegation must not be able to spend the global
// daily publication budget, and heavy networks must not be able to spend the last part of it.
import { afterEach, beforeAll, expect, it } from 'vitest'
import { mkdtemp, readFile, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { randomUUID } from 'node:crypto'
import { DatabaseSync } from 'node:sqlite'
import { normalizePublishedPreset } from '@ombelle/compiler'
import type { ResolvedPreset } from '@ombelle/contracts'
import { initializeSnapshotStore, openSnapshotStore, type SqliteSnapshotStore } from '../../apps/www/src/snapshots/server/sqlite-store.js'
import { clientRateKeys } from '../../apps/www/src/snapshots/server/client-key.js'
import { networkBucketKey, publicationQuotas as Q } from '../../apps/www/src/snapshots/server/quotas.js'
import type { SnapshotConfig } from '../../apps/www/src/snapshots/server/config.js'

const now = Date.UTC(2026, 10, 21, 12)
const config: SnapshotConfig = {
  dbPath: '/unused', publicOrigin: 'https://example.test', rateSecret: 's'.repeat(32),
  clientIdentity: { mode: 'trusted-header', header: 'x-trusted-ip' },
}
const keys = (ip: string) => clientRateKeys(new Headers({ 'x-trusted-ip': ip }), config)
let preset: ResolvedPreset
const roots: string[] = []
const stores: SqliteSnapshotStore[] = []
beforeAll(async () => {
  preset = await normalizePublishedPreset(JSON.parse(await readFile('examples/preset.example.json', 'utf8')))
})
afterEach(async () => {
  for (const store of stores.splice(0)) store.close()
  for (const root of roots.splice(0)) await rm(root, { recursive: true, force: true })
})
async function store() {
  const root = await mkdtemp(join(tmpdir(), 'ombelle-network-budget-'))
  roots.push(root)
  const path = join(root, 'snapshots.sqlite')
  initializeSnapshotStore(path)
  const opened = openSnapshotStore(path)
  stores.push(opened)
  return { path, store: opened }
}
const publish = (target: SqliteSnapshotStore, ip: string) =>
  target.publish({ preset, idempotencyKey: randomUUID(), now, ...keys(ip) })

it('keys one IPv6 delegation as one network across its /64s', () => {
  expect(keys('2001:db8:abcd:ff00::1').networkKey).toBe(keys('2001:db8:abcd:ffff:1::1').networkKey)
  expect(keys('2001:db8:abcd:ff00::1').clientKey).not.toBe(keys('2001:db8:abcd:ff01::1').clientKey)
  expect(keys('2001:db8:abce::1').networkKey).not.toBe(keys('2001:db8:abcd::1').networkKey)
  expect(keys('198.51.100.7')).toEqual({ clientKey: keys('198.51.100.7').clientKey, networkKey: keys('198.51.100.7').clientKey })
  expect(keys('::ffff:198.51.100.7')).toEqual(keys('198.51.100.7'))
})

it('stops a /56 that rotates its /64s at the network budget and leaves the global budget to others', async () => {
  const { store: target } = await store()
  let published = 0, refused: unknown
  // 256 /64s inside 2001:db8:abcd:ff00::/56, as in the audit reproduction.
  for (let n = 0; n < Q.networkPerDay + 50 && !refused; n++) {
    try {
      publish(target, `2001:db8:abcd:ff${(n % 256).toString(16).padStart(2, '0')}::${n}`)
      published++
    } catch (error) { refused = error }
  }
  expect(published).toBe(Q.networkPerDay)
  expect(Q.networkPerDay).toBeLessThan(Q.globalPerDay - Q.reservedPerDay)
  expect(refused).toMatchObject({ status: 429, code: 'RATE_LIMITED', issues: [{ path: '/rateLimit/network-day' }] })
  expect(publish(target, '198.51.100.7').replayed).toBe(false)
  expect(publish(target, '2001:db8:1::1').replayed).toBe(false)
})

it('holds the last part of the global day for light networks', async () => {
  const { path, store: target } = await store()
  const db = new DatabaseSync(path)
  const day = Math.floor(now / 86_400_000)
  db.prepare('INSERT INTO rate_buckets(kind, client_key, window, count) VALUES (?, ?, ?, ?)')
    .run('global', '', day, Q.globalPerDay - Q.reservedPerDay)
  db.prepare('INSERT INTO rate_buckets(kind, client_key, window, count) VALUES (?, ?, ?, ?)')
    .run('client', networkBucketKey(keys('2001:db8:abcd::1').networkKey), day, Q.lightNetworkPerDay)
  db.close()
  expect(() => publish(target, '2001:db8:abcd:1::1')).toThrow(expect.objectContaining({
    status: 429, issues: [expect.objectContaining({ path: '/rateLimit/global-day' })] }))
  expect(publish(target, '198.51.100.7').replayed).toBe(false)
})
