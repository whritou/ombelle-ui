import { afterEach, expect, it, vi } from 'vitest'
import { getCatalog } from '@ombelle/catalog'
import {
  normalizePublishedPreset,
  verifyPresetSnapshot,
} from '@ombelle/compiler'
import type { PresetSnapshot, ResolvedPreset } from '@ombelle/contracts'
import { createPublicationController } from './use-publication'
import { createPublishAttempt } from './publication'
import {
  publicationStorageKey,
  writePublishAttempt,
} from './publication-storage'

function storage(): Storage {
  const values = new Map<string, string>()
  return {
    get length() {
      return values.size
    },
    clear: () => values.clear(),
    key: (n) => [...values.keys()][n] ?? null,
    getItem: (k) => values.get(k) ?? null,
    setItem: (k, v) => {
      values.set(k, v)
    },
    removeItem: (k) => {
      values.delete(k)
    },
  }
}
function deferred<T>() {
  let resolve!: (value: T) => void
  const promise = new Promise<T>((r) => {
    resolve = r
  })
  return { resolve, promise }
}
async function preset(family: 'flat' | 'minimalist' = 'flat') {
  return normalizePublishedPreset(getCatalog('0.1.0').presets[family])
}
function envelope(p: ResolvedPreset): PresetSnapshot {
  return {
    snapshotVersion: '1.0',
    id: 'ps_0123456789abcdef0123456789abcdef',
    revision: 1,
    preset: p.data,
    presetHash: p.hash,
    catalogRelease: '0.1.0',
    compilerVersion: '0.1.0',
    createdAt: '2026-10-27T12:34:56.000Z',
    validationStatus: 'draft',
  }
}
const response = (p: ResolvedPreset) =>
  Response.json(envelope(p), { status: 201 })
afterEach(() => vi.useRealTimers())

it('only explicit confirmed publication posts captured content; cancel and restore never submit', async () => {
  const p = await preset(),
    session = storage(),
    fetcher = vi.fn(async () => response(p))
  const c = createPublicationController({
    fetch: fetcher,
    storage: () => session,
  })
  c.update(p, true)
  await c.publish()
  c.confirm()
  c.cancel()
  await c.publish()
  expect(fetcher).not.toHaveBeenCalled()
  writePublishAttempt(session, createPublishAttempt(p, Date.now()))
  const restored = createPublicationController({
    fetch: fetcher,
    storage: () => session,
  })
  restored.update(p, true)
  expect(restored.state.status).toBe('failed')
  expect(fetcher).not.toHaveBeenCalled()
  await restored.retry()
  expect(restored.state.status).toBe('published')
  const [url, init] = fetcher.mock.calls[0] as unknown as [string, RequestInit]
  expect(url).toBe('/api/v1/presets')
  expect(JSON.parse(init.body as string)).toEqual({ preset: p.data })
  expect(init.redirect).toBe('error')
  expect(session.getItem(publicationStorageKey)).toBeNull()
})
it('retries the captured key, rejects duplicate submits, and replaces the key after an edit', async () => {
  const p = await preset(),
    q = await preset('minimalist'),
    wait = deferred<Response>()
  const requests: RequestInit[] = []
  const c = createPublicationController({
    fetch: async (_url, init) => {
      requests.push(init!)
      return wait.promise
    },
    storage: () => storage(),
  })
  c.update(p, true)
  c.confirm()
  const first = c.publish()
  await vi.waitFor(() => expect(requests).toHaveLength(1))
  await c.publish()
  await c.retry()
  expect(requests).toHaveLength(1)
  wait.resolve(new Response(null, { status: 503 }))
  await first
  await c.retry()
  expect(new Headers(requests[1].headers).get('Idempotency-Key')).toBe(
    new Headers(requests[0].headers).get('Idempotency-Key'),
  )
  c.update(q, true)
  c.confirm()
  await c.publish()
  expect(new Headers(requests[2].headers).get('Idempotency-Key')).not.toBe(
    new Headers(requests[0].headers).get('Idempotency-Key'),
  )
})
it('new draft ignores an older successful response', async () => {
  const p = await preset(),
    wait = deferred<Response>(),
    announce = vi.fn()
  const c = createPublicationController({
    fetch: async () => wait.promise,
    announce,
  })
  c.update(p, true)
  c.confirm()
  const pending = c.publish()
  await vi.waitFor(() => expect(c.state.status).toBe('publishing'))
  c.update(null, false)
  wait.resolve(response(p))
  await pending
  expect(c.state.status).not.toBe('published')
  expect(announce).not.toHaveBeenCalled()
})
it.each(['edit', 'dispose', 'operation'] as const)(
  'fences async verification after %s',
  async (action) => {
    const p = await preset(),
      wait = deferred<void>(),
      announce = vi.fn()
    let verifying = false
    const c = createPublicationController({
      fetch: async () => response(p),
      announce,
      verify: async (value) => {
        verifying = true
        await wait.promise
        return verifyPresetSnapshot(value)
      },
    })
    c.update(p, true)
    c.confirm()
    const pending = c.publish()
    await vi.waitFor(() => expect(verifying).toBe(true))
    if (action === 'edit') c.update(await preset('minimalist'), true)
    else if (action === 'dispose') c.dispose()
    else {
      c.cancel()
      c.confirm()
    }
    wait.resolve()
    await pending
    expect(c.state.status).not.toBe('published')
    expect(announce).not.toHaveBeenCalled()
  },
)
it('render identity invalidates a result before the update effect', async () => {
  const p = await preset(),
    wait = deferred<Response>(),
    announce = vi.fn()
  let current = true
  const c = createPublicationController({
    fetch: async () => wait.promise,
    announce,
    isCurrent: () => current,
  })
  c.update(p, true)
  c.confirm()
  const pending = c.publish()
  await vi.waitFor(() => expect(c.state.status).toBe('publishing'))
  current = false
  wait.resolve(response(p))
  await pending
  expect(c.state.status).not.toBe('published')
  expect(announce).not.toHaveBeenCalled()
  c.dispose()
})
it('disposal while fetching suppresses later errors and notifications', async () => {
  const p = await preset(),
    wait = deferred<Response>(),
    announce = vi.fn(),
    notify = vi.fn()
  const c = createPublicationController({
    fetch: async () => wait.promise,
    announce,
    notify,
  })
  c.update(p, true)
  c.confirm()
  const pending = c.publish()
  await vi.waitFor(() => expect(c.state.status).toBe('publishing'))
  c.dispose()
  const count = notify.mock.calls.length
  wait.resolve(new Response(null, { status: 503 }))
  await pending
  expect(notify).toHaveBeenCalledTimes(count)
  expect(announce).not.toHaveBeenCalled()
})
it.each([201, 503])(
  'does not announce after outcome notification disposes the owner (%s)',
  async (status) => {
    const p = await preset(),
      announce = vi.fn()
    const c = createPublicationController({
      fetch: async () =>
        status === 201 ? response(p) : new Response(null, { status }),
      announce,
      notify: (state) => {
        if (state.status === 'published' || state.status === 'failed')
          c.dispose()
      },
    })
    c.update(p, true)
    c.confirm()
    await c.publish()
    expect(announce).not.toHaveBeenCalled()
  },
)
it('bounds a stalled request and preserves its key for an explicit retry', async () => {
  const p = await preset(),
    reached = deferred<void>(),
    session = storage()
  let requestSignal: AbortSignal | undefined
  const c = createPublicationController({
    storage: () => session,
    fetch: async (_url, init) => {
      requestSignal = init?.signal as AbortSignal
      reached.resolve()
      return new Promise<Response>(() => {})
    },
  })
  c.update(p, true)
  c.confirm()
  const key = c.state.attempt!.key
  vi.useFakeTimers()
  const pending = c.publish()
  await reached.promise
  await vi.advanceTimersByTimeAsync(10_000)
  await pending
  expect(c.state.status).toBe('failed')
  expect(requestSignal?.aborted).toBe(true)
  expect(c.state.attempt?.key).toBe(key)
  expect(JSON.parse(session.getItem(publicationStorageKey)!).key).toBe(key)
})
it('cancels an invalid-media response body instead of leaving its stream open', async () => {
  const p = await preset()
  let cancelled = false
  const body = new ReadableStream({
    cancel() {
      cancelled = true
    },
  })
  const c = createPublicationController({
    fetch: async () =>
      new Response(body, {
        status: 201,
        headers: { 'Content-Type': 'text/html' },
      }),
  })
  c.update(p, true)
  c.confirm()
  await c.publish()
  expect(c.state.status).toBe('failed')
  expect(cancelled).toBe(true)
})
it('storage denial keeps retry in memory and unavailable service leaves captured local data intact', async () => {
  const p = await preset(),
    keys: string[] = []
  const c = createPublicationController({
    storage: () => {
      throw new Error('denied')
    },
    fetch: async (_url, init) => {
      keys.push(new Headers(init?.headers).get('Idempotency-Key')!)
      return new Response(null, { status: 503 })
    },
  })
  c.update(p, true)
  c.confirm()
  await c.publish()
  await c.retry()
  expect(c.state.status).toBe('failed')
  expect(keys).toHaveLength(2)
  expect(keys[1]).toBe(keys[0])
  expect(c.state.attempt?.preset).toEqual(p.data)
})
it('rejects a valid server snapshot of different content, malformed and over-budget responses', async () => {
  const p = await preset(),
    q = await preset('minimalist')
  for (const result of [
    response(q),
    Response.json({ broken: true }),
    new Response('é'.repeat(70_000), {
      headers: { 'Content-Type': 'application/json' },
    }),
  ]) {
    const c = createPublicationController({ fetch: async () => result })
    c.update(p, true)
    c.confirm()
    await c.publish()
    expect(c.state.status).toBe('failed')
    expect(c.state.lastPublished).toBeNull()
  }
})
it('retains the verified published hash while marking edits unpublished', async () => {
  const p = await preset()
  const c = createPublicationController({ fetch: async () => response(p) })
  c.update(p, true)
  c.confirm()
  await c.publish()
  c.update(await preset('minimalist'), true)
  expect(c.state.status).toBe('idle')
  expect(c.state.lastPublished?.presetHash).toBe(p.hash)
})
it('rejects a tampered restored hash before POST and expires an in-memory retry at 24 hours', async () => {
  const p = await preset(),
    session = storage(),
    fetcher = vi.fn(async () => response(p))
  writePublishAttempt(session, {
    ...createPublishAttempt(p, Date.now()),
    presetHash: 'f'.repeat(64),
  })
  const c = createPublicationController({
    fetch: fetcher,
    storage: () => session,
  })
  c.update({ ...p, hash: 'f'.repeat(64) }, true)
  await c.retry()
  expect(fetcher).not.toHaveBeenCalled()
  expect(c.state.status).toBe('failed')
  let now = 100
  const expired = createPublicationController({
    fetch: fetcher,
    now: () => now,
  })
  expired.update(p, true)
  expired.confirm()
  now += 86_400_000
  await expired.publish()
  expect(fetcher).not.toHaveBeenCalled()
})
