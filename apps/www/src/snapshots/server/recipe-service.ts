import { FoundationError, type RecipeSnapshot, type SnapshotReference } from '@ombelle/contracts'
import { normalizePublishedRecipe, verifyRecipeSnapshot } from '@ombelle/compiler'
import { assertPublishOrigin, readSnapshotConfig, type SnapshotConfig } from './config'
import { readPublishBody } from './body'
import { clientRateKey } from './client-key'
import { SnapshotServiceError } from './errors'
import type { SnapshotStore } from './store'
import { openConfiguredSnapshotStore } from './store-factory'

export interface RecipeSnapshotService {
  publish(request: Request): Promise<{ snapshot: RecipeSnapshot; replayed: boolean }>
  read(ref: SnapshotReference): Promise<RecipeSnapshot>
}

export function createRequestRecipeSnapshotService(): RecipeSnapshotService {
  async function use<T>(operation: (service: RecipeSnapshotService) => Promise<T>): Promise<T> {
    const config = readSnapshotConfig(process.env)
    const store = await openConfiguredSnapshotStore(config)
    try { return await operation(createRecipeSnapshotService(config, store)) }
    finally { await store.close() }
  }
  return { publish: request => use(service => service.publish(request)), read: ref => use(service => service.read(ref)) }
}
async function verified(snapshot: RecipeSnapshot): Promise<RecipeSnapshot> {
  try { return await verifyRecipeSnapshot(snapshot) }
  catch { throw new SnapshotServiceError({ status: 503, code: 'SNAPSHOT_SERVICE_UNAVAILABLE' }) }
}
export function createRecipeSnapshotService(config: SnapshotConfig, store: SnapshotStore): RecipeSnapshotService {
  return {
    async publish(request) {
      assertPublishOrigin(request.headers, config)
      const body = await readPublishBody(request), now = Date.now()
      const clientKey = clientRateKey(request.headers, config)
      await store.consumeAttempt(clientKey, now)
      const key = request.headers.get('Idempotency-Key')
      if (!key || !/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(key))
        throw new SnapshotServiceError({ status: 400, code: 'INVALID_IDEMPOTENCY_KEY' })
      if (!body || typeof body !== 'object' || Array.isArray(body) || Object.keys(body).length !== 1 || !Object.hasOwn(body, 'recipe'))
        throw new SnapshotServiceError({ status: 400, code: 'INVALID_DATA' })
      let compiled
      try { compiled = await normalizePublishedRecipe((body as { recipe: unknown }).recipe) }
      catch (error) {
        if (error instanceof FoundationError && error.code === 'UNSUPPORTED_RELEASE')
          throw new SnapshotServiceError({ status: 422, code: 'UNSUPPORTED_RELEASE' })
        throw new SnapshotServiceError({ status: 400, code: 'INVALID_DATA' })
      }
      const result = await store.publishRecipe({ compiled, idempotencyKey: key.toLowerCase(), clientKey, now })
      return { snapshot: await verified(result.snapshot), replayed: result.replayed }
    },
    async read(ref) { return verified(await store.lookupRecipe(ref)) },
  }
}
