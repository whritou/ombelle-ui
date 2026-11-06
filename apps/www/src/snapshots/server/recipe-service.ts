import { FoundationError, type InstallableRecipeSnapshot, type SnapshotReference } from '@ombelle/contracts'
import { normalizePublishedInstallableRecipe, verifyInstallableRecipeSnapshot } from '@ombelle/compiler'
import { assertPublishOrigin, readSnapshotConfig, type SnapshotConfig } from './config'
import { readPublishBody } from './body'
import { clientRateKey } from './client-key'
import { SnapshotServiceError } from './errors'
import type { SnapshotStore } from './store'
import { openConfiguredSnapshotStore } from './store-factory'
import { catalogRecipesAvailable } from '../install-command'

export interface RecipeSnapshotService {
  publish(request: Request): Promise<{ snapshot: InstallableRecipeSnapshot; replayed: boolean }>
  read(ref: SnapshotReference): Promise<InstallableRecipeSnapshot>
}

export function createRequestRecipeSnapshotService(): RecipeSnapshotService {
  async function use<T>(operation: (service: RecipeSnapshotService) => Promise<T>): Promise<T> {
    const config = readSnapshotConfig(process.env)
    const store = await openConfiguredSnapshotStore(config)
    try { return await operation(createRecipeSnapshotService(config, store, catalogRecipesAvailable)) }
    finally { await store.close() }
  }
  return { publish: request => use(service => service.publish(request)), read: ref => use(service => service.read(ref)) }
}
async function verified(snapshot: InstallableRecipeSnapshot): Promise<InstallableRecipeSnapshot> {
  try { return await verifyInstallableRecipeSnapshot(snapshot) }
  catch { throw new SnapshotServiceError({ status: 503, code: 'SNAPSHOT_SERVICE_UNAVAILABLE' }) }
}
export function createRecipeSnapshotService(config: SnapshotConfig, store: SnapshotStore, allowCatalogRecipes = true): RecipeSnapshotService {
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
      const input = (body as { recipe: unknown }).recipe
      if (input && typeof input === 'object' && !Array.isArray(input)) {
        const value = input as Record<string, unknown>
        if (typeof value.schemaVersion === 'string' &&
          value.schemaVersion !== '1.0' && (value.schemaVersion !== '2.0' || !allowCatalogRecipes))
          throw new SnapshotServiceError({ status: 422, code: 'UNSUPPORTED_RELEASE' })
        const ref = value.presetRef
        if (ref && typeof ref === 'object' && !Array.isArray(ref))
          for (const field of ['catalogRelease', 'compilerVersion']) {
            const release = (ref as Record<string, unknown>)[field]
            if (typeof release === 'string' && release !== '0.1.0')
              throw new SnapshotServiceError({ status: 422, code: 'UNSUPPORTED_RELEASE' })
          }
      }
      let compiled
      try { compiled = await normalizePublishedInstallableRecipe(input) }
      catch (error) {
        if (error instanceof FoundationError && error.code === 'UNSUPPORTED_RELEASE')
          throw new SnapshotServiceError({ status: 422, code: 'UNSUPPORTED_RELEASE' })
        throw new SnapshotServiceError({ status: 400, code: 'INVALID_DATA' })
      }
      const result = await store.publishRecipe({ compiled, idempotencyKey: key.toLowerCase(), clientKey, now })
      return { snapshot: await verified(result.snapshot), replayed: result.replayed }
    },
    async read(ref) {
      const snapshot = await store.lookupRecipe(ref)
      if (snapshot.snapshotVersion === '2.0' && !allowCatalogRecipes)
        throw new SnapshotServiceError({ status: 404, code: 'SNAPSHOT_NOT_FOUND' })
      return verified(snapshot)
    },
  }
}
