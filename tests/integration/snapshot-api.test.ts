import { afterEach, beforeAll, expect, it, vi } from 'vitest'
import { randomUUID, createHash } from 'node:crypto'
import { readFile, stat, mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { DatabaseSync } from 'node:sqlite'
import { canonicalize } from '@ombelle/compiler'
import { parseSnapshotReference, type PresetSnapshot } from '@ombelle/contracts'
import { startSnapshotService } from '../helpers/snapshot-service.js'
import { openSnapshotStore } from '../../apps/www/src/snapshots/server/sqlite-store.js'
import { handleSnapshotPublish, handleSnapshotRead } from '../../apps/www/src/snapshots/server/http.js'
import { createSnapshotService } from '../../apps/www/src/snapshots/server/service.js'
import type { SnapshotStore } from '../../apps/www/src/snapshots/server/store.js'

let preset: Record<string, unknown>
const cleanups: (() => Promise<void>)[] = []
beforeAll(async () => { preset = JSON.parse(await readFile('examples/preset.example.json', 'utf8')) })
afterEach(async () => { vi.unstubAllEnvs(); for (const close of cleanups.splice(0)) await close() })
async function fixture() { const service = await startSnapshotService(); cleanups.push(service.close); return service }
function post(origin: string, key: string = randomUUID(), body: unknown = { preset }, headers: Record<string, string> = {}) {
  return fetch(origin + '/api/v1/presets', { method: 'POST', headers: { Origin: origin, 'Content-Type': 'application/json', 'Idempotency-Key': key, ...headers }, body: JSON.stringify(body) })
}
async function failure(response: Response, status: number, code: string) {
  expect(response.status).toBe(status)
  expect(response.headers.get('cache-control')).toBe('no-store')
  expect(response.headers.get('x-content-type-options')).toBe('nosniff')
  const payload = await response.json()
  expect(payload).toMatchObject({ code, issues: expect.any(Array), requestId: response.headers.get('x-request-id') })
  expect(payload.requestId).toMatch(/^[0-9a-f-]{36}$/)
  expect(JSON.stringify(payload)).not.toMatch(/sqlite|SELECT|private|Neo Brutalism Yellow/)
}

it('publishes normalized stable canonical bytes on 201/200 and returns a relative exact Location', async () => {
  const { origin } = await fixture(), key = randomUUID()
  const first = await post(origin, key), retry = await post(origin, key)
  expect(first.status).toBe(201); expect(retry.status).toBe(200)
  expect(first.headers.get('cache-control')).toBe('no-store')
  const bytes = await first.text()
  expect(await retry.text()).toBe(bytes)
  const snapshot = JSON.parse(bytes) as PresetSnapshot
  expect(snapshot.preset.id).toBe(preset.id)
  expect(snapshot.preset.revision).toBe(preset.revision)
  expect(snapshot.preset.modes.light.background).toBe('#ffffff')
  expect(bytes).toBe(canonicalize(snapshot))
  expect(first.headers.get('location')).toBe(`/api/v1/presets/${snapshot.id}/1`)
  expect(first.headers.get('x-request-id')).not.toBe(retry.headers.get('x-request-id'))
  const next = await post(origin)
  expect((await next.json()).id).not.toBe(snapshot.id)
})

it('lost response followed by withdrawal cannot replay payload', async () => {
  const { origin, dbPath } = await fixture(), key = randomUUID()
  const original = await post(origin, key), snapshot = await original.json() as PresetSnapshot
  const store = openSnapshotStore(dbPath)
  try { store.withdraw(parseSnapshotReference(`${snapshot.id}@1`), 'security', Date.now()) } finally { store.close() }
  const retry = await post(origin, key)
  expect(retry.status).toBe(410)
  const body = await retry.text()
  expect(body).not.toContain(snapshot.presetHash)
  expect(JSON.parse(body).code).toBe('SNAPSHOT_WITHDRAWN')
})

it('normalizes sparse presets before idempotency comparison and accepts only UUID-v4 retry keys', async () => {
  const { origin } = await fixture(), key = randomUUID()
  const sparse = { ...preset, modes: { light: {}, dark: {} }, design: {} }
  const first = await post(origin, key, { preset: sparse })
  expect(first.status).toBe(201)
  const snapshot = await first.json() as PresetSnapshot
  const retry = await post(origin, key.toUpperCase(), { preset: snapshot.preset })
  expect(retry.status).toBe(200)
  expect(await retry.json()).toEqual(snapshot)
  await failure(await post(origin, '11111111-1111-1111-8111-111111111111'), 400, 'INVALID_IDEMPOTENCY_KEY')
  await failure(await post(origin, ''), 400, 'INVALID_IDEMPOTENCY_KEY')
})

it.each([false, true])('verifies normalization before responding to publish replay=%s', async (replayed) => {
  const { origin, dbPath } = await fixture(), response = await post(origin)
  const snapshot = await response.json() as PresetSnapshot
  snapshot.preset.modes.light.background = '#FFFFFF'
  snapshot.presetHash = createHash('sha256').update(canonicalize(snapshot.preset)).digest('hex')
  const actual = openSnapshotStore(dbPath)
  try {
    // Model a port returning a hash-valid but unnormalized snapshot. The real
    // store's synchronous checks cannot detect this normalization corruption.
    const port = { consumeAttempt: actual.consumeAttempt.bind(actual), publish: () => ({ snapshot, replayed }) } as unknown as SnapshotStore
    const service = createSnapshotService({ dbPath, publicOrigin: origin, rateSecret: 'x'.repeat(32), clientIdentity: { mode: 'development' } }, port)
    const request = new Request(origin + '/api/v1/presets', { method: 'POST', headers: { Origin: origin, 'Content-Type': 'application/json', 'Idempotency-Key': randomUUID() }, body: JSON.stringify({ preset }) })
    await failure(await handleSnapshotPublish(request, service), 503, 'SNAPSHOT_SERVICE_UNAVAILABLE')
  } finally { actual.close() }
})

it('returns HEAD/ETag/304 only after current availability and integrity checks', async () => {
  const { origin, dbPath } = await fixture(), created = await post(origin)
  const path = created.headers.get('location')!, get = await fetch(origin + path), bytes = await get.text()
  expect(get.status).toBe(200)
  expect(get.headers.get('cache-control')).toBe('public, max-age=0, must-revalidate')
  expect(get.headers.get('etag')).toBe('"' + createHash('sha256').update(bytes).digest('hex') + '"')
  const head = await fetch(origin + path, { method: 'HEAD' })
  expect(head.headers.get('etag')).toBe(get.headers.get('etag')); expect(await head.text()).toBe('')
  const conditional = { headers: { 'If-None-Match': get.headers.get('etag')! } }
  const cached = await fetch(origin + path, conditional)
  expect(cached.status).toBe(304); expect(await cached.text()).toBe('')
  const snapshot = JSON.parse(bytes) as PresetSnapshot, ref = parseSnapshotReference(`${snapshot.id}@1`)
  const store = openSnapshotStore(dbPath)
  try { store.withdraw(ref, 'operator-request', Date.now()) } finally { store.close() }
  await failure(await fetch(origin + path, conditional), 410, 'SNAPSHOT_WITHDRAWN')
  const goneHead = await fetch(origin + path, { ...conditional, method: 'HEAD' })
  expect(goneHead.status).toBe(410); expect(await goneHead.text()).toBe('')
})

it.each(['bytes', 'normalization'])('fails closed before conditional success on corrupt stored %s', async (kind) => {
  const { origin, dbPath } = await fixture(), first = await post(origin)
  const path = first.headers.get('location')!, snapshot = await first.json() as PresetSnapshot
  const db = new DatabaseSync(dbPath)
  try {
    db.exec('DROP TRIGGER snapshots_no_update')
    if (kind === 'bytes') db.exec("UPDATE snapshots SET response_hash = '" + '0'.repeat(64) + "'")
    else {
      snapshot.preset.modes.light.background = '#FFFFFF'
      snapshot.presetHash = createHash('sha256').update(canonicalize(snapshot.preset)).digest('hex')
      const response = canonicalize(snapshot)
      db.prepare('UPDATE snapshots SET response = ?, response_hash = ?, preset_hash = ?, bytes = ?').run(response, createHash('sha256').update(response).digest('hex'), snapshot.presetHash, Buffer.byteLength(response))
    }
  } finally { db.close() }
  await failure(await fetch(origin + path, { headers: { 'If-None-Match': '*' } }), 503, 'SNAPSHOT_SERVICE_UNAVAILABLE')
})

it.each([
  [{ Origin: 'https://foreign.example' }, 403, 'ORIGIN_NOT_ALLOWED'],
  [{ Origin: 'null' }, 403, 'ORIGIN_NOT_ALLOWED'],
  [{ Origin: '' }, 403, 'ORIGIN_NOT_ALLOWED'],
  [{ 'Sec-Fetch-Site': 'cross-site' }, 403, 'ORIGIN_NOT_ALLOWED'],
  [{ 'Content-Type': 'text/plain' }, 415, 'UNSUPPORTED_MEDIA_TYPE'],
  [{ 'Content-Encoding': 'gzip' }, 415, 'UNSUPPORTED_MEDIA_TYPE'],
  [{ 'Idempotency-Key': 'not-a-key' }, 400, 'INVALID_IDEMPOTENCY_KEY'],
] as const)('rejects publication headers %j', async (headers, status, code) => {
  const { origin } = await fixture()
  await failure(await post(origin, randomUUID(), { preset }, headers), status, code)
})

it.each(['envelope', 'preset', 'nested'])('rejects unknown fields in %s', async (kind) => {
  const { origin } = await fixture()
  const body = kind === 'envelope' ? { preset, private: 'secret' } : {
    preset: kind === 'preset' ? { ...preset, extra: true } : { ...preset, design: { private: 'secret' } },
  }
  await failure(await post(origin, randomUUID(), body), 400, 'INVALID_DATA')
})

it.each(['schemaVersion', 'catalogRelease', 'compilerVersion', 'styleFamily'])('reports unsupported %s as 422', async (field) => {
  const { origin } = await fixture()
  const value = field === 'styleFamily' ? 'liquid-glass' : field === 'schemaVersion' ? '2.0' : '9.0.0'
  await failure(await post(origin, randomUUID(), { preset: { ...preset, [field]: value } }), 422, 'UNSUPPORTED_RELEASE')
})

it('maps conflict, payload, minute quota and storage capacity to bounded safe responses', async () => {
  const { origin, dbPath } = await fixture(), key = randomUUID()
  await post(origin, key)
  await failure(await post(origin, key, { preset: { ...preset, name: 'Changed' } }), 409, 'IDEMPOTENCY_CONFLICT')
  await failure(await post(origin, randomUUID(), { preset, padding: 'x'.repeat(65_536) }), 413, 'PAYLOAD_TOO_LARGE')
  const db = new DatabaseSync(dbPath)
  try { db.exec('UPDATE capacity SET records = 100000') } finally { db.close() }
  await failure(await post(origin), 503, 'SNAPSHOT_CAPACITY_REACHED')
  await post(origin); await post(origin)
  const limited = await post(origin)
  expect(Number(limited.headers.get('retry-after'))).toBeGreaterThan(0)
  expect(Number(limited.headers.get('retry-after'))).toBeLessThanOrEqual(60)
  await failure(limited, 429, 'RATE_LIMITED')
})

it('rejects malformed paths before lookup and exposes no listing', async () => {
  const store = { lookup: () => { throw new Error('lookup must not happen') } } as unknown as SnapshotStore
  const service = createSnapshotService({ dbPath: '/unused', publicOrigin: 'http://localhost', rateSecret: 'x'.repeat(32), clientIdentity: { mode: 'development' } }, store)
  await failure(await handleSnapshotRead(new Request('http://localhost/api/v1/presets/x/1'), { id: 'x', revision: '1' }, service), 400, 'INVALID_REFERENCE')
  const { origin } = await fixture()
  await failure(await fetch(origin + '/api/v1/presets/ps_' + '0'.repeat(32) + '/1'), 404, 'SNAPSHOT_NOT_FOUND')
  expect((await fetch(origin + '/api/v1/presets')).status).toBe(405)
})

it('unconfigured imports/requests leave DB absent and preset exports usable', async () => {
  const root = await mkdtemp(join(tmpdir(), 'ombelle-unconfigured-'))
  cleanups.push(() => rm(root, { recursive: true, force: true }))
  const dbPath = join(root, 'missing.sqlite')
  for (const name of ['OMBELLE_SNAPSHOT_DB_PATH', 'OMBELLE_PUBLIC_ORIGIN', 'OMBELLE_SNAPSHOT_RATE_SECRET']) vi.stubEnv(name, undefined)
  const route = await import('../../apps/www/src/app/api/v1/presets/route.js')
  const readRoute = await import('../../apps/www/src/app/api/v1/presets/[id]/[revision]/route.js')
  await failure(await route.POST(new Request('http://localhost', { method: 'POST' })), 503, 'SNAPSHOT_SERVICE_UNAVAILABLE')
  const params = Promise.resolve({ id: 'ps_' + '0'.repeat(32), revision: '1' })
  await failure(await readRoute.GET(new Request('http://localhost'), { params }), 503, 'SNAPSHOT_SERVICE_UNAVAILABLE')
  // Malformed path validation happens even with no configured DB.
  await failure(await readRoute.GET(new Request('http://localhost'), { params: Promise.resolve({ id: 'invalid', revision: '1' }) }), 400, 'INVALID_REFERENCE')
  vi.stubEnv('OMBELLE_SNAPSHOT_DB_PATH', dbPath)
  vi.stubEnv('OMBELLE_PUBLIC_ORIGIN', 'http://localhost')
  vi.stubEnv('OMBELLE_SNAPSHOT_RATE_SECRET', 'x'.repeat(32))
  await failure(await route.POST(new Request('http://localhost', { method: 'POST' })), 503, 'SNAPSHOT_SERVICE_UNAVAILABLE')
  const head = await readRoute.HEAD(new Request('http://localhost', { method: 'HEAD' }), { params })
  expect(head.status).toBe(503); expect(head.headers.get('x-request-id')).toMatch(/^[0-9a-f-]{36}$/)
  expect(await head.text()).toBe('')
  await expect(stat(dbPath)).rejects.toMatchObject({ code: 'ENOENT' })
  const { normalizePublishedPreset } = await import('@ombelle/compiler')
  expect((await normalizePublishedPreset(preset)).data.id).toBe(preset.id)
})

it('unsupported methods and OPTIONS return safe request IDs without config or database access', async () => {
  for (const name of ['OMBELLE_SNAPSHOT_DB_PATH', 'OMBELLE_PUBLIC_ORIGIN', 'OMBELLE_SNAPSHOT_RATE_SECRET']) vi.stubEnv(name, undefined)
  const collection = await import('../../apps/www/src/app/api/v1/presets/route.js') as unknown as Record<string, (request: Request) => Promise<Response>>
  const single = await import('../../apps/www/src/app/api/v1/presets/[id]/[revision]/route.js') as unknown as Record<string, (request: Request) => Promise<Response>>
  for (const [route, methods, allow] of [
    [collection, ['GET', 'HEAD', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'], 'POST, OPTIONS'],
    [single, ['POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'], 'GET, HEAD, OPTIONS'],
  ] as const) {
    for (const method of methods) {
      expect(route[method]).toBeTypeOf('function')
      const response = await route[method](new Request('http://localhost/api/v1/presets', { method }))
      expect(response.headers.get('allow')).toBe(allow)
      expect(response.headers.get('access-control-allow-origin')).toBeNull()
      expect(response.headers.get('cache-control')).toBe('no-store')
      expect(response.headers.get('x-request-id')).toMatch(/^[0-9a-f-]{36}$/)
      if (method === 'OPTIONS') { expect(response.status).toBe(204); expect(await response.text()).toBe('') }
      else if (method === 'HEAD') { expect(response.status).toBe(405); expect(await response.text()).toBe('') }
      else await failure(response, 405, 'METHOD_NOT_ALLOWED')
    }
  }
})
