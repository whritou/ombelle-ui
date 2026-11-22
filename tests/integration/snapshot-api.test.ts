import { beforeAll, expect, it, vi } from 'vitest'
import { randomUUID, createHash } from 'node:crypto'
import { readFile, stat, mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { DatabaseSync } from 'node:sqlite'
import { canonicalize, normalizePublishedPreset } from '@ombelle/compiler'
import { parseSnapshotReference, type PresetSnapshot } from '@ombelle/contracts'
import presetExample from '../../examples/preset.example.json'
import { publicationApi, publicationApiContract, publicationFailure as failure, type PublicationApiKind } from '../helpers/publication-api-contract.js'
import { openSnapshotStore } from '../../apps/www/src/snapshots/server/sqlite-store.js'
import { handleSnapshotPublish, handleSnapshotRead } from '../../apps/www/src/snapshots/server/http.js'
import { createSnapshotService } from '../../apps/www/src/snapshots/server/service.js'
import type { SnapshotStore } from '../../apps/www/src/snapshots/server/store.js'

const presetApi: PublicationApiKind = {
  name: 'preset',
  field: 'preset',
  endpoint: '/api/v1/presets',
  idPattern: /^ps_[a-f0-9]{32}$/,
  content: () => structuredClone(presetExample) as Record<string, unknown>,
  changed: (content) => ({ ...content, name: 'Changed' }),
  normalized: async (content) => (await normalizePublishedPreset(content)).data,
  unknownFields: (content) => [{ ...content, extra: true }, { ...content, design: { private: 'secret' } }],
  unsupported: {
    schemaVersion: (content) => ({ ...content, schemaVersion: '2.0' }),
    catalogRelease: (content) => ({ ...content, catalogRelease: '9.0.0' }),
    compilerVersion: (content) => ({ ...content, compilerVersion: '9.0.0' }),
    styleFamily: (content) => ({ ...content, styleFamily: 'aurora' }),
  },
  withdraw: (store, id) => store.withdraw(parseSnapshotReference(`${id}@1`), 'security', Date.now()),
  read: (request, params, service) => handleSnapshotRead(request, params, service as never),
  routes: async () => ({
    collection: await import('../../apps/www/src/app/api/v1/presets/route.js') as never,
    single: await import('../../apps/www/src/app/api/v1/presets/[id]/[revision]/route.js') as never,
  }),
}
publicationApiContract(presetApi)

// Preset-specific cases.
let preset: Record<string, unknown>
beforeAll(async () => { preset = JSON.parse(await readFile('examples/preset.example.json', 'utf8')) })
const api = publicationApi(presetApi)
const fixture = api.fixture
const cleanups = { push: api.cleanup }
function post(origin: string, key: string = randomUUID(), body: unknown = { preset }) {
  return api.post(origin, { key, body })
}

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

it('publishes and retrieves a liquid-glass draft below the contrast bound', async () => {
  const { origin } = await fixture()
  const glass = JSON.parse(await readFile('packages/catalog/src/presets/liquid-glass.json', 'utf8'))
  const failing = { ...glass, design: { ...glass.design, glassOpacity: 0.3 } }
  const published = await post(origin, randomUUID(), { preset: failing })
  expect(published.status).toBe(201)
  const snapshot = await published.json() as PresetSnapshot
  expect(snapshot).toMatchObject({ validationStatus: 'draft', preset: { styleFamily: 'liquid-glass', design: { glassOpacity: 0.3 } } })
  const read = await fetch(origin + published.headers.get('location'))
  expect(read.status).toBe(200)
  expect(await read.json()).toEqual(snapshot)
})

it('maps storage capacity to a bounded safe response', async () => {
  const { origin, dbPath } = await fixture()
  const db = new DatabaseSync(dbPath)
  try { db.exec('UPDATE capacity SET records = 100000') } finally { db.close() }
  await failure(await post(origin), 503, 'SNAPSHOT_CAPACITY_REACHED')
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

it('publishes a preset that uses font pairs under schema version 1.1', async () => {
  const { origin } = await fixture()
  const fonted = {
    ...preset,
    schemaVersion: '1.1',
    design: { ...(preset.design as Record<string, unknown>), fontFamilyId: 'inter', headingFontFamilyId: 'fraunces' },
  }
  const response = await post(origin, randomUUID(), { preset: fonted })
  expect(response.status).toBe(201)
  const snapshot = (await response.json()) as PresetSnapshot
  expect(snapshot.preset.schemaVersion).toBe('1.1')
  expect(snapshot.preset.design).toMatchObject({ fontFamilyId: 'inter', headingFontFamilyId: 'fraunces' })
})
