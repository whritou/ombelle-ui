import { expect, it, vi } from 'vitest'
import { normalizePublishedRecipe } from '@ombelle/compiler'
import example from '../../../../examples/recipe.example.json'
import { createRecipePublicationController } from './use-publication'
import { createPublishAttempt } from './publication'
import { publicationStorageKey, writePublishAttempt } from './publication-storage'

function storage(): Storage {
  const values = new Map<string, string>()
  return { get length() { return values.size }, clear: () => values.clear(), key: i => [...values.keys()][i] ?? null, getItem: k => values.get(k) ?? null, setItem: (k, v) => { values.set(k, v) }, removeItem: k => { values.delete(k) } }
}
async function fixture() {
  const result = await normalizePublishedRecipe(example)
  const snapshot = { snapshotVersion: '1.0', id: 'rc_' + 'a'.repeat(32), revision: 1, recipe: result.recipe.data, recipeHash: result.recipe.hash, preset: result.preset.data, presetHash: result.preset.hash, catalogRelease: '0.1.0', compilerVersion: '0.1.0', createdAt: '2026-11-01T12:00:00.000Z', validationStatus: 'draft' }
  return { result, snapshot }
}
it('publishes only an explicitly confirmed recipe and suppresses duplicate requests', async () => {
  const { result, snapshot } = await fixture(), fetcher = vi.fn(async () => Response.json(snapshot, { status: 201 }))
  const c = createRecipePublicationController({ fetch: fetcher })
  c.update(result.recipe, true); await c.publish(); expect(fetcher).not.toHaveBeenCalled()
  c.confirm(); await Promise.all([c.publish(), c.publish()])
  expect(fetcher).toHaveBeenCalledTimes(1)
  const [url, init] = fetcher.mock.calls[0] as unknown as [string, RequestInit]
  expect(url).toBe('/api/v1/recipes')
  expect(JSON.parse(init.body as string)).toEqual({ recipe: result.recipe.data })
  expect(c.state.lastPublished).toEqual(snapshot)
})
it.each(['edit', 'cancel', 'dispose'] as const)('retires an in-flight success after %s', async mode => {
  const { result, snapshot } = await fixture()
  let reply!: (value: Response) => void
  const fetcher = vi.fn(() => new Promise<Response>(resolve => { reply = resolve }))
  const c = createRecipePublicationController({ fetch: fetcher })
  c.update(result.recipe, true); c.confirm(); const pending = c.publish()
  await vi.waitFor(() => expect(fetcher).toHaveBeenCalledTimes(1))
  if (mode === 'edit') c.update((await normalizePublishedRecipe({ ...example, content: 'new content' })).recipe, true)
  else if (mode === 'cancel') c.cancel()
  else c.dispose()
  reply(Response.json(snapshot)); await pending
  expect(c.state.lastPublished).toBeNull()
})
it('recovers without posting and retries the original key after a lost response', async () => {
  const { result, snapshot } = await fixture(), session = storage(), fetcher = vi.fn(async () => Response.json(snapshot))
  const attempt = createPublishAttempt(result.recipe, Date.now())
  writePublishAttempt(session, attempt)
  const c = createRecipePublicationController({ fetch: fetcher, storage: () => session })
  c.update(result.recipe, true); expect(fetcher).not.toHaveBeenCalled(); expect(c.state.status).toBe('failed')
  await c.retry()
  expect((fetcher.mock.calls[0] as unknown as [string, RequestInit])[1].headers).toMatchObject({ 'Idempotency-Key': attempt.key })
  expect(c.state.status).toBe('published'); expect(session.getItem(publicationStorageKey)).toBeNull()
})
it('treats withdrawal as terminal and keeps memory retry usable when storage is denied', async () => {
  const { result } = await fixture(), fetcher = vi.fn(async () => new Response(null, { status: 410 }))
  const c = createRecipePublicationController({ fetch: fetcher, storage: () => { throw new Error('Denied') } })
  c.update(result.recipe, true); c.confirm(); await c.publish(); await c.retry()
  expect(c.state.status).toBe('withdrawn'); expect(fetcher).toHaveBeenCalledTimes(1)
})
