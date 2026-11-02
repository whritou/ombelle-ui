import { afterEach, expect, it, vi } from 'vitest'
import { getCatalog } from '@ombelle/catalog'
import {
  normalizePublishedRecipe,
  verifyRecipeSnapshot,
} from '@ombelle/compiler'
import type { RecipeSnapshot, RecipeCompileResult } from '@ombelle/contracts'
import example from '../../../../examples/recipe.example.json'
type ResolvedRecipe = RecipeCompileResult['recipe']
const presets = new Map<string, RecipeCompileResult['preset']>()
import { createRecipePublicationController } from './use-publication'
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
async function recipe(family: 'flat' | 'minimalist' = 'flat') {
  const preset = getCatalog('0.1.0').presets[family]
  const result = await normalizePublishedRecipe({ ...example, presetRef: { id: preset.id, revision: preset.revision, catalogRelease: preset.catalogRelease, compilerVersion: preset.compilerVersion } })
  presets.set(result.recipe.hash, result.preset)
  return result.recipe
}
function envelope(p: ResolvedRecipe): RecipeSnapshot {
  return {
    snapshotVersion: '1.0',
    id: 'rc_0123456789abcdef0123456789abcdef',
    revision: 1,
    recipe: p.data,
    recipeHash: p.hash,
    preset: presets.get(p.hash)!.data,
    presetHash: presets.get(p.hash)!.hash,
    catalogRelease: '0.1.0',
    compilerVersion: '0.1.0',
    createdAt: '2026-10-27T12:34:56.000Z',
    validationStatus: 'draft',
  }
}
const response = (p: ResolvedRecipe) =>
  Response.json(envelope(p), { status: 201 })
afterEach(() => vi.useRealTimers())

it('does not recover a withdrawn attempt as retryable after refresh', async () => {
  const p = await recipe(), session = storage()
  const fetcher = vi.fn(async () => new Response(null, { status: 410 }))
  const options = { fetch: fetcher, storage: () => session }
  const first = createRecipePublicationController(options)
  first.update(p, true)
  first.confirm()
  const withdrawnKey = first.state.attempt!.key
  await first.publish()
  expect(first.state.status).toBe('withdrawn')
  first.dispose()

  const recovered = createRecipePublicationController(options)
  recovered.update(p, true)
  await recovered.retry()
  expect(fetcher).toHaveBeenCalledTimes(1)
  expect(recovered.state.status).toBe('idle')
  expect(session.getItem(publicationStorageKey)).toBeNull()
  recovered.confirm()
  expect(recovered.state.status).toBe('validating')
  expect(recovered.state.attempt!.key).not.toBe(withdrawnKey)
  expect(fetcher).toHaveBeenCalledTimes(1)
  recovered.dispose()
})

it('only explicit confirmed publication posts captured content; cancel and restore never submit', async () => {
  const p = await recipe(),
    session = storage(),
    fetcher = vi.fn(async () => response(p))
  const c = createRecipePublicationController({
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
  const restored = createRecipePublicationController({
    fetch: fetcher,
    storage: () => session,
  })
  restored.update(p, true)
  expect(restored.state.status).toBe('failed')
  expect(fetcher).not.toHaveBeenCalled()
  await restored.retry()
  expect(restored.state.status).toBe('published')
  const [url, init] = fetcher.mock.calls[0] as unknown as [string, RequestInit]
  expect(url).toBe('/api/v1/recipes')
  expect(JSON.parse(init.body as string)).toEqual({ recipe: p.data })
  expect(init.redirect).toBe('error')
  expect(session.getItem(publicationStorageKey)).toBeNull()
})
it('retries the captured key, rejects duplicate submits, and replaces the key after an edit', async () => {
  const p = await recipe(),
    q = await recipe('minimalist'),
    wait = deferred<Response>()
  const requests: RequestInit[] = []
  const c = createRecipePublicationController({
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
  const p = await recipe(),
    wait = deferred<Response>(),
    announce = vi.fn()
  const c = createRecipePublicationController({
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
    const p = await recipe(),
      wait = deferred<void>(),
      announce = vi.fn()
    let verifying = false
    const c = createRecipePublicationController({
      fetch: async () => response(p),
      announce,
      verify: async (value) => {
        verifying = true
        await wait.promise
        return verifyRecipeSnapshot(value)
      },
    })
    c.update(p, true)
    c.confirm()
    const pending = c.publish()
    await vi.waitFor(() => expect(verifying).toBe(true))
    if (action === 'edit') c.update(await recipe('minimalist'), true)
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
  const p = await recipe(),
    wait = deferred<Response>(),
    announce = vi.fn()
  let current = true
  const c = createRecipePublicationController({
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
  const p = await recipe(),
    wait = deferred<Response>(),
    announce = vi.fn(),
    notify = vi.fn()
  const c = createRecipePublicationController({
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
    const p = await recipe(),
      announce = vi.fn()
    const c = createRecipePublicationController({
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
  const p = await recipe(),
    reached = deferred<void>(),
    session = storage()
  let requestSignal: AbortSignal | undefined
  const c = createRecipePublicationController({
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
  const p = await recipe()
  let cancelled = false
  const body = new ReadableStream({
    cancel() {
      cancelled = true
    },
  })
  const c = createRecipePublicationController({
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
  const p = await recipe(),
    keys: string[] = []
  const c = createRecipePublicationController({
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
  expect(c.state.attempt?.recipe).toEqual(p.data)
})
it('withdrawn publication is terminal, keeps Cancel available, and cannot be retried', async () => {
  const p = await recipe(),
    fetcher = vi.fn(async () => new Response(null, { status: 410 }))
  const c = createRecipePublicationController({ fetch: fetcher })
  c.update(p, true)
  c.confirm()
  await c.publish()
  expect(c.state.status).toBe('withdrawn')
  expect(c.state.attempt?.recipeHash).toBe(p.hash)
  await c.retry()
  expect(fetcher).toHaveBeenCalledTimes(1)
  c.cancel()
  expect(c.state.status).toBe('idle')
  c.confirm()
  expect(c.state.status).toBe('validating')
})
it('rejects a valid server snapshot of different content, malformed and over-budget responses', async () => {
  const p = await recipe(),
    q = await recipe('minimalist')
  for (const result of [
    response(q),
    Response.json({ broken: true }),
    new Response('é'.repeat(70_000), {
      headers: { 'Content-Type': 'application/json' },
    }),
  ]) {
    const c = createRecipePublicationController({ fetch: async () => result })
    c.update(p, true)
    c.confirm()
    await c.publish()
    expect(c.state.status).toBe('failed')
    expect(c.state.lastPublished).toBeNull()
  }
})
it('retains the verified published hash while marking edits unpublished', async () => {
  const p = await recipe()
  const c = createRecipePublicationController({ fetch: async () => response(p) })
  c.update(p, true)
  c.confirm()
  await c.publish()
  c.update(await recipe('minimalist'), true)
  expect(c.state.status).toBe('idle')
  expect(c.state.lastPublished?.recipeHash).toBe(p.hash)
})
it('rejects a tampered restored hash before POST and expires an in-memory retry at 24 hours', async () => {
  const p = await recipe(),
    session = storage(),
    fetcher = vi.fn(async () => response(p))
  writePublishAttempt(session, {
    ...createPublishAttempt(p, Date.now()),
    recipeHash: 'f'.repeat(64),
  })
  const c = createRecipePublicationController({
    fetch: fetcher,
    storage: () => session,
  })
  c.update({ ...p, hash: 'f'.repeat(64) }, true)
  await c.retry()
  expect(fetcher).not.toHaveBeenCalled()
  expect(c.state.status).toBe('failed')
  let now = 100
  const expired = createRecipePublicationController({
    fetch: fetcher,
    now: () => now,
  })
  expired.update(p, true)
  expired.confirm()
  now += 86_400_000
  await expired.publish()
  expect(fetcher).not.toHaveBeenCalled()
})
