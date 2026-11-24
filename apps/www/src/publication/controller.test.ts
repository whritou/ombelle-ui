import { afterEach, describe, expect, it, vi } from 'vitest'
import { createPublishAttempt, type PublishAttempt } from './attempt'
import { createPublicationController, type PublicationOptions } from './controller'
import { writePublishAttempt as writeAttempt } from './storage'
import { kinds, storage, type Any, type Resolved } from './test-kinds'

function deferred<T>() {
  let resolve!: (value: T) => void
  const promise = new Promise<T>((r) => {
    resolve = r
  })
  return { resolve, promise }
}
afterEach(() => vi.useRealTimers())

describe.each(kinds)('$name publication', ({ kind, draft, envelope }) => {
const createController = (options: PublicationOptions<Any> = {}) =>
  createPublicationController(kind, options)
const writePublishAttempt = (session: Storage, attempt: PublishAttempt<Any>) =>
  writeAttempt(kind, session, attempt)
const response = (p: Resolved) => Response.json(envelope(p), { status: 201 })
const noun = kind.noun.charAt(0).toUpperCase() + kind.noun.slice(1)

it('does not recover a withdrawn attempt as retryable after refresh', async () => {
  const p = await draft(), session = storage()
  const fetcher = vi.fn(async () => new Response(null, { status: 410 }))
  const options = { fetch: fetcher, storage: () => session }
  const first = createController(options)
  first.update(p, true)
  first.confirm()
  const withdrawnKey = first.state.attempt!.key
  await first.publish()
  expect(first.state.status).toBe('withdrawn')
  first.dispose()

  const recovered = createController(options)
  recovered.update(p, true)
  await recovered.retry()
  expect(fetcher).toHaveBeenCalledTimes(1)
  expect(recovered.state.status).toBe('idle')
  expect(session.getItem(kind.storageKey)).toBeNull()
  recovered.confirm()
  expect(recovered.state.status).toBe('validating')
  expect(recovered.state.attempt!.key).not.toBe(withdrawnKey)
  expect(fetcher).toHaveBeenCalledTimes(1)
  recovered.dispose()
})

it('only explicit confirmed publication posts captured content; cancel and restore never submit', async () => {
  const p = await draft(),
    session = storage(),
    fetcher = vi.fn(async () => response(p))
  const c = createController({
    fetch: fetcher,
    storage: () => session,
  })
  c.update(p, true)
  await c.publish()
  c.confirm()
  c.cancel()
  await c.publish()
  expect(fetcher).not.toHaveBeenCalled()
  writePublishAttempt(session, createPublishAttempt(kind, p, Date.now()))
  const restored = createController({
    fetch: fetcher,
    storage: () => session,
  })
  restored.update(p, true)
  expect(restored.state.status).toBe('failed')
  expect(fetcher).not.toHaveBeenCalled()
  await restored.retry()
  expect(restored.state.status).toBe('published')
  const [url, init] = fetcher.mock.calls[0] as unknown as [string, RequestInit]
  expect(url).toBe(kind.endpoint)
  expect(JSON.parse(init.body as string)).toEqual({ [kind.field]: p.data })
  expect(init.redirect).toBe('error')
  expect(session.getItem(kind.storageKey)).toBeNull()
})
it('retries the captured key, rejects duplicate submits, and replaces the key after an edit', async () => {
  const p = await draft(),
    q = await draft('minimalist'),
    wait = deferred<Response>()
  const requests: RequestInit[] = []
  const c = createController({
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
  const p = await draft(),
    wait = deferred<Response>(),
    announce = vi.fn()
  const c = createController({
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
    const p = await draft(),
      wait = deferred<void>(),
      announce = vi.fn()
    let verifying = false
    const c = createController({
      fetch: async () => response(p),
      announce,
      verify: async (value) => {
        verifying = true
        await wait.promise
        return kind.verify(value)
      },
    })
    c.update(p, true)
    c.confirm()
    const pending = c.publish()
    await vi.waitFor(() => expect(verifying).toBe(true))
    if (action === 'edit') c.update(await draft('minimalist'), true)
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
  const p = await draft(),
    wait = deferred<Response>(),
    announce = vi.fn()
  let current = true
  const c = createController({
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
  const p = await draft(),
    wait = deferred<Response>(),
    announce = vi.fn(),
    notify = vi.fn()
  const c = createController({
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
    const p = await draft(),
      announce = vi.fn()
    const c = createController({
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
  const p = await draft(),
    reached = deferred<void>(),
    session = storage()
  let requestSignal: AbortSignal | undefined
  const c = createController({
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
  expect(JSON.parse(session.getItem(kind.storageKey)!).key).toBe(key)
})
it('cancels an invalid-media response body instead of leaving its stream open', async () => {
  const p = await draft()
  let cancelled = false
  const body = new ReadableStream({
    cancel() {
      cancelled = true
    },
  })
  const c = createController({
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
  const p = await draft(),
    keys: string[] = []
  const c = createController({
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
  expect(c.state.attempt?.[kind.field]).toEqual(p.data)
})
it('withdrawn publication is terminal, keeps Cancel available, and cannot be retried', async () => {
  const p = await draft(),
    fetcher = vi.fn(async () => new Response(null, { status: 410 }))
  const c = createController({ fetch: fetcher })
  c.update(p, true)
  c.confirm()
  await c.publish()
  expect(c.state.status).toBe('withdrawn')
  expect(c.state.attempt?.[kind.hashField]).toBe(p.hash)
  await c.retry()
  expect(fetcher).toHaveBeenCalledTimes(1)
  c.cancel()
  expect(c.state.status).toBe('idle')
  c.confirm()
  expect(c.state.status).toBe('validating')
})
it('rejects a valid server snapshot of different content, malformed and over-budget responses', async () => {
  const p = await draft(),
    q = await draft('minimalist')
  for (const result of [
    response(q),
    Response.json({ broken: true }),
    new Response('é'.repeat(70_000), {
      headers: { 'Content-Type': 'application/json' },
    }),
  ]) {
    const c = createController({ fetch: async () => result })
    c.update(p, true)
    c.confirm()
    await c.publish()
    expect(c.state.status).toBe('failed')
    expect(c.state.lastPublished).toBeNull()
  }
})
it('retains the verified published hash while marking edits unpublished', async () => {
  const p = await draft()
  const c = createController({ fetch: async () => response(p) })
  c.update(p, true)
  c.confirm()
  await c.publish()
  c.update(await draft('minimalist'), true)
  expect(c.state.status).toBe('idle')
  expect(c.state.lastPublished?.[kind.hashField]).toBe(p.hash)
})
it('rejects a tampered restored hash before POST and expires an in-memory retry at 24 hours', async () => {
  const p = await draft(),
    session = storage(),
    fetcher = vi.fn(async () => response(p))
  writePublishAttempt(session, {
    ...createPublishAttempt(kind, p, Date.now()),
    [kind.hashField]: 'f'.repeat(64),
  } as PublishAttempt<Any>)
  const c = createController({
    fetch: fetcher,
    storage: () => session,
  })
  c.update({ ...p, hash: 'f'.repeat(64) }, true)
  await c.retry()
  expect(fetcher).not.toHaveBeenCalled()
  expect(c.state.status).toBe('failed')
  let now = 100
  const expired = createController({
    fetch: fetcher,
    now: () => now,
  })
  expired.update(p, true)
  expired.confirm()
  now += 86_400_000
  await expired.publish()
  expect(fetcher).not.toHaveBeenCalled()
})
it('suppresses concurrent publishes and announces the kind on success', async () => {
  const p = await draft(),
    announce = vi.fn(),
    fetcher = vi.fn(async () => response(p))
  const c = createController({ fetch: fetcher, announce })
  c.update(p, true)
  c.confirm()
  await Promise.all([c.publish(), c.publish()])
  expect(fetcher).toHaveBeenCalledTimes(1)
  expect(c.state.lastPublished).toEqual(envelope(p))
  expect(announce).toHaveBeenCalledWith(
    `${noun} published. The public snapshot is attached to its published hash.`,
  )
})
it.each(['edit', 'cancel', 'dispose'] as const)(
  'retires an in-flight success after %s',
  async (mode) => {
    const p = await draft()
    let reply!: (value: Response) => void
    const started = deferred<void>()
    const c = createController({
      fetch: () =>
        new Promise<Response>((resolve) => {
          reply = resolve
          started.resolve()
        }),
    })
    c.update(p, true)
    c.confirm()
    const pending = c.publish()
    await started.promise
    if (mode === 'edit') c.update(await draft('minimalist'), true)
    else if (mode === 'cancel') c.cancel()
    else c.dispose()
    reply(response(p))
    await pending
    expect(c.state.lastPublished).toBeNull()
  },
)
it('recovers without posting and retries the original key after a lost response', async () => {
  const p = await draft(),
    session = storage(),
    fetcher = vi.fn(async () => response(p))
  const attempt = createPublishAttempt(kind, p, Date.now())
  writePublishAttempt(session, attempt)
  const c = createController({ fetch: fetcher, storage: () => session })
  c.update(p, true)
  expect(fetcher).not.toHaveBeenCalled()
  await c.retry()
  const [, init] = fetcher.mock.calls[0] as unknown as [string, RequestInit]
  expect(init.headers).toMatchObject({ 'Idempotency-Key': attempt.key })
  expect(c.state.status).toBe('published')
})
it('keeps a caller storage key apart from the kind key', async () => {
  const p = await draft(),
    session = storage()
  const c = createController({
    storage: () => session,
    storageKey: 'custom:publication',
    fetch: async () => new Response(null, { status: 503 }),
  })
  c.update(p, true)
  c.confirm()
  await c.publish()
  expect(c.state.status).toBe('failed')
  expect(session.getItem(kind.storageKey)).toBeNull()
  expect(JSON.parse(session.getItem('custom:publication')!).key).toBe(
    c.state.attempt!.key,
  )
})
})
