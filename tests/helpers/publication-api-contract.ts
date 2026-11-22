import { afterEach, describe, expect, it, vi } from 'vitest'
import { createHash, randomUUID } from 'node:crypto'
import { canonicalize } from '@ombelle/compiler'
import { startSnapshotService } from './snapshot-service.js'
import { openSnapshotStore } from '../../apps/www/src/snapshots/server/sqlite-store.js'
import { publicationQuotas as Q } from '../../apps/www/src/snapshots/server/quotas.js'

type SqliteStore = ReturnType<typeof openSnapshotStore>
type Route = Record<string, (request: Request) => Promise<Response>>
type Snapshot = { id: string } & Record<string, unknown>

/** What differs between the preset and recipe publication APIs. */
export type PublicationApiKind = {
  name: 'preset' | 'recipe'
  /** The single envelope field: `preset` or `recipe`. */
  field: 'preset' | 'recipe'
  endpoint: '/api/v1/presets' | '/api/v1/recipes'
  idPattern: RegExp
  /** Publishable content; each call returns a fresh copy. */
  content(): Record<string, unknown>
  /** Different content that must not reuse an idempotency key. */
  changed(content: Record<string, unknown>): Record<string, unknown>
  /** The content once the service has normalized it. */
  normalized(content: Record<string, unknown>): Promise<unknown>
  /** Content with an unknown field inside it, at each depth worth checking. */
  unknownFields(content: Record<string, unknown>): Record<string, unknown>[]
  /** Content pinned to each release the service refuses with 422. */
  unsupported: Record<string, (content: Record<string, unknown>) => Record<string, unknown>>
  withdraw(store: SqliteStore, id: string): void
  /** The read handler, given a service that must not be reached. */
  read(request: Request, params: { id: string; revision: string }, service: { read(): never; publish(): never }): Promise<Response>
  routes(): Promise<{ collection: Route; single: Route }>
}

export async function publicationFailure(response: Response, status: number, code: string) {
  expect(response.status).toBe(status)
  expect(response.headers.get('cache-control')).toBe('no-store')
  expect(response.headers.get('x-content-type-options')).toBe('nosniff')
  const payload = await response.json()
  expect(payload).toMatchObject({ code, issues: expect.any(Array), requestId: response.headers.get('x-request-id') })
  expect(payload.requestId).toMatch(/^[0-9a-f-]{36}$/)
  expect(JSON.stringify(payload)).not.toMatch(/sqlite|SELECT|postgresql|private|Create project|Neo Brutalism Yellow/)
}

/** Starts a snapshot service per test and posts to one publication endpoint of it. */
export function publicationApi(kind: Pick<PublicationApiKind, 'field' | 'endpoint' | 'content'>) {
  const cleanups: (() => Promise<void>)[] = []
  afterEach(async () => { vi.useRealTimers(); vi.unstubAllEnvs(); for (const close of cleanups.splice(0)) await close() })
  return {
    async fixture() { const service = await startSnapshotService(); cleanups.push(service.close); return service },
    cleanup(close: () => Promise<void>) { cleanups.push(close) },
    post(origin: string, options: { key?: string; body?: unknown; headers?: Record<string, string> } = {}) {
      const { key = randomUUID(), body = { [kind.field]: kind.content() }, headers = {} } = options
      return fetch(origin + kind.endpoint, { method: 'POST', headers: { Origin: origin, 'Content-Type': 'application/json', 'Idempotency-Key': key, ...headers }, body: JSON.stringify(body) })
    },
  }
}

/** The publication API cases presets and recipes share. Kind-specific cases stay in each kind's test file. */
export function publicationApiContract(kind: PublicationApiKind) {
  describe(`${kind.name} publication API`, () => {
    const { fixture, post } = publicationApi(kind)
    const failure = publicationFailure
    const body = (content = kind.content()) => ({ [kind.field]: content })

    it('publishes normalized canonical bytes on 201, replays them on 200 and returns a relative exact Location', async () => {
      const { origin } = await fixture(), key = randomUUID()
      const first = await post(origin, { key }), retry = await post(origin, { key })
      expect(first.status).toBe(201); expect(retry.status).toBe(200)
      expect(first.headers.get('cache-control')).toBe('no-store')
      const bytes = await first.text()
      expect(await retry.text()).toBe(bytes)
      expect(first.headers.get('x-request-id')).not.toBe(retry.headers.get('x-request-id'))
      const snapshot = JSON.parse(bytes) as Snapshot
      expect(snapshot.id).toMatch(kind.idPattern)
      expect(snapshot[kind.field]).toEqual(await kind.normalized(kind.content()))
      expect(bytes).toBe(canonicalize(snapshot))
      expect(first.headers.get('location')).toBe(`${kind.endpoint}/${snapshot.id}/1`)
      expect((await (await post(origin)).json()).id).not.toBe(snapshot.id)
    })

    it('returns HEAD, ETag and 304 only while available, and withdrawal stops reads and retry replay', async () => {
      const { origin, dbPath } = await fixture(), key = randomUUID()
      const created = await post(origin, { key }), snapshot = await created.json() as Snapshot
      const path = created.headers.get('location')!, read = await fetch(origin + path), text = await read.text()
      expect(read.status).toBe(200)
      expect(read.headers.get('cache-control')).toBe('public, max-age=0, must-revalidate')
      const etag = read.headers.get('etag')!
      expect(etag).toBe('"' + createHash('sha256').update(text).digest('hex') + '"')
      const head = await fetch(origin + path, { method: 'HEAD' })
      expect(head.status).toBe(200); expect(await head.text()).toBe(''); expect(head.headers.get('etag')).toBe(etag)
      const cached = await fetch(origin + path, { headers: { 'If-None-Match': 'W/' + etag } })
      expect(cached.status).toBe(304); expect(await cached.text()).toBe('')
      const store = openSnapshotStore(dbPath)
      try { kind.withdraw(store, snapshot.id) } finally { store.close() }
      await failure(await fetch(origin + path, { headers: { 'If-None-Match': etag } }), 410, 'SNAPSHOT_WITHDRAWN')
      const gone = await fetch(origin + path, { method: 'HEAD', headers: { 'If-None-Match': etag } })
      expect(gone.status).toBe(410); expect(await gone.text()).toBe('')
      // A lost response followed by withdrawal cannot replay the payload.
      const retry = await post(origin, { key })
      const retryText = await retry.clone().text()
      for (const value of Object.values(snapshot)) if (typeof value === 'string' && /^[a-f0-9]{64}$/.test(value)) expect(retryText).not.toContain(value)
      await failure(retry, 410, 'SNAPSHOT_WITHDRAWN')
    })

    it('conflicts on different content under the same key', async () => {
      const { origin } = await fixture(), key = randomUUID()
      expect((await post(origin, { key })).status).toBe(201)
      await failure(await post(origin, { key, body: body(kind.changed(kind.content())) }), 409, 'IDEMPOTENCY_CONFLICT')
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
      await failure(await post(origin, { headers }), status, code)
    })

    it.each([{ ...body(), private: 'secret' }, ...kind.unknownFields(kind.content()).map((content) => body(content))])('rejects unknown publication fields %#', async (rejected) => {
      const { origin } = await fixture()
      await failure(await post(origin, { body: rejected }), 400, 'INVALID_DATA')
    })

    it.each(Object.keys(kind.unsupported))('reports unsupported %s as 422', async (field) => {
      const { origin } = await fixture()
      await failure(await post(origin, { body: body(kind.unsupported[field]!(kind.content())) }), 422, 'UNSUPPORTED_RELEASE')
    })

    it('enforces bounded bodies, depth and the minute attempt budget', async () => {
      // Start at a minute boundary so the attempt burst cannot straddle two windows.
      vi.useFakeTimers({ toFake: ['Date'] }); vi.setSystemTime(Math.ceil(Date.now() / 60_000) * 60_000)
      const { origin } = await fixture()
      await failure(await post(origin, { body: { ...body(), padding: 'x'.repeat(65_536) } }), 413, 'PAYLOAD_TOO_LARGE')
      let deep: unknown = {}
      for (let n = 0; n < 17; n++) deep = { child: deep }
      await failure(await post(origin, { body: deep }), 400, 'INVALID_DATA')
      // Oversized and malformed bodies are refused before they count as attempts.
      for (let n = 0; n < Q.attemptsPerMinute; n++) await post(origin)
      const limited = await post(origin)
      expect(Number(limited.headers.get('retry-after'))).toBeGreaterThan(0)
      expect(Number(limited.headers.get('retry-after'))).toBeLessThanOrEqual(60)
      await failure(limited, 429, 'RATE_LIMITED')
    })

    it('validates malformed paths before any storage access and exposes no listing', async () => {
      const unused = () => { throw new Error('Storage must not be called') }
      for (const id of ['invalid', kind.name === 'preset' ? 'rc_' + 'a'.repeat(32) : 'ps_' + 'a'.repeat(32)])
        await failure(await kind.read(new Request('http://localhost'), { id, revision: '1' }, { read: unused, publish: unused }), 400, 'INVALID_REFERENCE')
      const { origin } = await fixture()
      const prefix = kind.name === 'preset' ? 'ps_' : 'rc_'
      await failure(await fetch(`${origin}${kind.endpoint}/${prefix}${'0'.repeat(32)}/1`), 404, 'SNAPSHOT_NOT_FOUND')
      expect((await fetch(origin + kind.endpoint)).status).toBe(405)
    })

    it('exports safe method handlers without configuration or database side effects', async () => {
      for (const name of ['OMBELLE_SNAPSHOT_BACKEND', 'OMBELLE_SNAPSHOT_DB_PATH', 'OMBELLE_PUBLIC_ORIGIN', 'OMBELLE_SNAPSHOT_RATE_SECRET']) vi.stubEnv(name, undefined)
      const { collection, single } = await kind.routes()
      for (const [route, methods, allow] of [
        [collection, ['GET', 'HEAD', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'], 'POST, OPTIONS'],
        [single, ['POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'], 'GET, HEAD, OPTIONS'],
      ] as const) {
        for (const method of methods) {
          expect(route[method]).toBeTypeOf('function')
          const response = await route[method]!(new Request('http://localhost' + kind.endpoint, { method }))
          expect(response.headers.get('allow')).toBe(allow)
          expect(response.headers.get('access-control-allow-origin')).toBeNull()
          expect(response.headers.get('cache-control')).toBe('no-store')
          expect(response.headers.get('x-request-id')).toMatch(/^[0-9a-f-]{36}$/)
          if (method === 'OPTIONS') { expect(response.status).toBe(204); expect(await response.text()).toBe('') }
          else if (method === 'HEAD') { expect(response.status).toBe(405); expect(await response.text()).toBe('') }
          else await failure(response, 405, 'METHOD_NOT_ALLOWED')
        }
      }
      await failure(await collection.POST!(new Request('http://localhost', { method: 'POST' })), 503, 'SNAPSHOT_SERVICE_UNAVAILABLE')
    })
  })
}
