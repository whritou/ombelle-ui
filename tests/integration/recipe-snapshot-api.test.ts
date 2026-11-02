import { afterEach, expect, it, vi } from 'vitest'
import { createHash, randomUUID } from 'node:crypto'
import { DatabaseSync } from 'node:sqlite'
import { canonicalize, normalizePublishedRecipe } from '@ombelle/compiler'
import { parseRecipeSnapshotReference, type RecipeSnapshot } from '@ombelle/contracts'
import example from '../../examples/recipe.example.json'
import presetExample from '../../examples/preset.example.json'
import { startSnapshotService } from '../helpers/snapshot-service.js'
import { openSnapshotStore } from '../../apps/www/src/snapshots/server/sqlite-store.js'
import { handleRecipeSnapshotRead } from '../../apps/www/src/snapshots/server/recipe-http.js'
import type { RecipeSnapshotService } from '../../apps/www/src/snapshots/server/recipe-service.js'

const cleanups: Array<() => Promise<void>> = []
afterEach(async () => { vi.unstubAllEnvs(); for (const close of cleanups.splice(0)) await close() })
async function fixture() { const service = await startSnapshotService(); cleanups.push(service.close); return service }
function post(origin: string, body: unknown = { recipe: example }, key = randomUUID(), headers: Record<string, string> = {}) {
  return fetch(origin + '/api/v1/recipes', { method: 'POST', body: JSON.stringify(body), headers: { Origin: origin, 'Content-Type': 'application/json', 'Idempotency-Key': key, ...headers } })
}
async function failure(response: Response, status: number, code: string) {
  expect(response.status).toBe(status)
  expect(response.headers.get('cache-control')).toBe('no-store')
  expect(response.headers.get('x-content-type-options')).toBe('nosniff')
  const value = await response.json()
  expect(value).toMatchObject({ code, requestId: response.headers.get('x-request-id'), issues: expect.any(Array) })
  expect(JSON.stringify(value)).not.toMatch(/SELECT|sqlite|postgresql|Create project/)
}

it('publishes normalized canonical recipe bytes with immutable distribution identity', async () => {
  const { origin } = await fixture(), key = randomUUID()
  const first = await post(origin, { recipe: example }, key), text = await first.text()
  expect(first.status).toBe(201)
  const snapshot = JSON.parse(text) as RecipeSnapshot
  const normalized = await normalizePublishedRecipe(example)
  expect(snapshot.recipe).toEqual(normalized.recipe.data)
  expect(snapshot.preset).toEqual(normalized.preset.data)
  expect(snapshot.recipeHash).toBe(normalized.recipe.hash)
  expect(text).toBe(canonicalize(snapshot))
  expect(snapshot.id).toMatch(/^rc_[a-f0-9]{32}$/)
  expect(snapshot.recipe.id).toBe(example.id)
  expect(first.headers.get('location')).toBe(`/api/v1/recipes/${snapshot.id}/1`)
  const replay = await post(origin, { recipe: example }, key)
  expect(replay.status).toBe(200)
  expect(await replay.text()).toBe(text)
  expect((await (await post(origin)).json()).id).not.toBe(snapshot.id)
})
it('checks withdrawal before conditional recipe reads and retry replay', async () => {
  const { origin, dbPath } = await fixture(), key = randomUUID()
  const created = await post(origin, { recipe: example }, key), snapshot = await created.json() as RecipeSnapshot
  const path = created.headers.get('location')!, read = await fetch(origin + path), etag = read.headers.get('etag')!
  expect(read.status).toBe(200)
  const text = await read.text()
  expect(etag).toBe('"' + createHash('sha256').update(text).digest('hex') + '"')
  const head = await fetch(origin + path, { method: 'HEAD' })
  expect(head.status).toBe(200); expect(await head.text()).toBe(''); expect(head.headers.get('etag')).toBe(etag)
  expect((await fetch(origin + path, { headers: { 'If-None-Match': 'W/' + etag } })).status).toBe(304)
  const store = openSnapshotStore(dbPath)
  try { store.withdrawRecipe(parseRecipeSnapshotReference(snapshot.id + '@1'), 'security', Date.now()) } finally { store.close() }
  await failure(await fetch(origin + path, { headers: { 'If-None-Match': etag } }), 410, 'SNAPSHOT_WITHDRAWN')
  await failure(await post(origin, { recipe: example }, key), 410, 'SNAPSHOT_WITHDRAWN')
  const gone = await fetch(origin + path, { method: 'HEAD', headers: { 'If-None-Match': etag } })
  expect(gone.status).toBe(410); expect(await gone.text()).toBe('')
})
it('conflicts on different content and on a preset key reused for a recipe', async () => {
  const { origin } = await fixture(), key = randomUUID()
  await post(origin, { recipe: example }, key)
  await failure(await post(origin, { recipe: { ...example, content: 'Changed' } }, key), 409, 'IDEMPOTENCY_CONFLICT')
  const presetKey = randomUUID()
  expect((await fetch(origin + '/api/v1/presets', { method: 'POST', body: JSON.stringify({ preset: presetExample }), headers: { Origin: origin, 'Content-Type': 'application/json', 'Idempotency-Key': presetKey } })).status).toBe(201)
  await failure(await post(origin, { recipe: example }, presetKey), 409, 'IDEMPOTENCY_CONFLICT')
})
it.each([
  [{ Origin: 'https://foreign.test' }, 403, 'ORIGIN_NOT_ALLOWED'],
  [{ Origin: 'null' }, 403, 'ORIGIN_NOT_ALLOWED'],
  [{ 'Sec-Fetch-Site': 'cross-site' }, 403, 'ORIGIN_NOT_ALLOWED'],
  [{ 'Content-Type': 'text/plain' }, 415, 'UNSUPPORTED_MEDIA_TYPE'],
  [{ 'Content-Encoding': 'gzip' }, 415, 'UNSUPPORTED_MEDIA_TYPE'],
  [{ 'Idempotency-Key': 'invalid' }, 400, 'INVALID_IDEMPOTENCY_KEY'],
] as const)('rejects invalid recipe request headers %j', async (headers, status, code) => {
  const { origin } = await fixture()
  await failure(await post(origin, { recipe: example }, randomUUID(), headers), status, code)
})
it.each([
  { recipe: example, extra: true },
  { recipe: { ...example, extra: true } },
  { recipe: { ...example, props: { ...example.props, extra: true } } },
])('rejects unknown recipe publication fields %#', async body => {
  const { origin } = await fixture()
  await failure(await post(origin, body), 400, 'INVALID_DATA')
})
it.each(['schemaVersion', 'catalogRelease', 'compilerVersion'])('reports unsupported recipe %s as 422', async field => {
  const { origin } = await fixture()
  const recipe = field === 'schemaVersion' ? { ...example, schemaVersion: '2.0' }
    : { ...example, presetRef: { ...example.presetRef, [field]: '9.0.0' } }
  await failure(await post(origin, { recipe }), 422, 'UNSUPPORTED_RELEASE')
})
it('enforces bounded bodies, depth, and the shared minute attempt budget', async () => {
  const { origin } = await fixture()
  await failure(await post(origin, { recipe: example, padding: 'x'.repeat(65_536) }), 413, 'PAYLOAD_TOO_LARGE')
  let deep: unknown = {}
  for (let n = 0; n < 17; n++) deep = { child: deep }
  await failure(await post(origin, deep), 400, 'INVALID_DATA')
  for (let n = 0; n < 5; n++) await post(origin)
  const limited = await post(origin)
  expect(Number(limited.headers.get('retry-after'))).toBeGreaterThan(0)
  await failure(limited, 429, 'RATE_LIMITED')
})
it('validates malformed recipe paths before any storage access', async () => {
  const unused = async () => { throw new Error('Storage must not be called') }
  const service: RecipeSnapshotService = { read: unused, publish: unused }
  for (const id of ['invalid', 'ps_' + 'a'.repeat(32)])
    await failure(await handleRecipeSnapshotRead(new Request('http://localhost'), { id, revision: '1' }, service), 400, 'INVALID_REFERENCE')
  const { origin } = await fixture()
  await failure(await fetch(origin + '/api/v1/recipes/rc_' + '0'.repeat(32) + '/1'), 404, 'SNAPSHOT_NOT_FOUND')
})
it('fails closed on hash-valid but non-normalized recipe storage before a 304 response', async () => {
  const { origin, dbPath } = await fixture(), created = await post(origin)
  const snapshot = await created.json() as RecipeSnapshot, db = new DatabaseSync(dbPath)
  delete snapshot.recipe.props.type
  snapshot.recipeHash = createHash('sha256').update(canonicalize(snapshot.recipe)).digest('hex')
  const response = canonicalize(snapshot)
  try {
    db.exec('DROP TRIGGER recipe_snapshots_no_update')
    db.prepare('UPDATE recipe_snapshots SET response=?,response_hash=?,recipe_hash=?,bytes=?').run(response, createHash('sha256').update(response).digest('hex'), snapshot.recipeHash, Buffer.byteLength(response))
  } finally { db.close() }
  await failure(await fetch(origin + created.headers.get('location')!, { headers: { 'If-None-Match': '*' } }), 503, 'SNAPSHOT_SERVICE_UNAVAILABLE')
})
it('exports safe recipe method handlers without configuration or database side effects', async () => {
  for (const key of ['OMBELLE_SNAPSHOT_BACKEND', 'OMBELLE_SNAPSHOT_DB_PATH', 'OMBELLE_PUBLIC_ORIGIN', 'OMBELLE_SNAPSHOT_RATE_SECRET']) vi.stubEnv(key, undefined)
  const collection = await import('../../apps/www/src/app/api/v1/recipes/route.js') as unknown as Record<string, (request: Request) => Promise<Response>>
  const single = await import('../../apps/www/src/app/api/v1/recipes/[id]/[revision]/route.js') as unknown as Record<string, (request: Request) => Promise<Response>>
  for (const [route, methods, allow] of [[collection, ['GET', 'HEAD', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'], 'POST, OPTIONS'], [single, ['POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'], 'GET, HEAD, OPTIONS']] as const)
    for (const method of methods) {
      const response = await route[method](new Request('http://localhost', { method }))
      expect(response.status).toBe(method === 'OPTIONS' ? 204 : 405)
      expect(response.headers.get('allow')).toBe(allow)
      expect(response.headers.get('access-control-allow-origin')).toBeNull()
      expect(response.headers.get('cache-control')).toBe('no-store')
    }
  await failure(await collection.POST(new Request('http://localhost', { method: 'POST' })), 503, 'SNAPSHOT_SERVICE_UNAVAILABLE')
})
