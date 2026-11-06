import {
  FoundationError,
  officialSnapshotOrigin,
  normalizeSnapshotOrigin,
  parseRecipeSnapshotReference,
  type InstallableRecipe,
  type RecipeSnapshot,
  type RecipeSnapshotSource,
} from '@ombelle/contracts'
import { verifyRecipeSnapshot } from '@ombelle/compiler'
import { readRecipeFile } from '../recipe-file.js'
import { readRecipeSnapshotCache } from './recipe-cache.js'
import { fetchPublication } from './transport.js'

export type RecipeInputOptions = {
  origin?: string
  expectedHash?: string
  offline?: boolean
  cacheRoot: string
}
export type ResolvedRecipeInput = {
  recipe: InstallableRecipe
  snapshot?: RecipeSnapshot
  source?: RecipeSnapshotSource
  resolution: 'local' | 'network' | 'cache'
  networkAccess: boolean
}
const exactReference = (value: string) =>
  value.length === 37 && /^rc_[0-9a-f]{32}@1$/.test(value)


export async function resolveRecipeInput(
  value: string, options: RecipeInputOptions,
): Promise<ResolvedRecipeInput> {
  if (!exactReference(value)) {
    if (
      (/^(ps_|rc_)/i.test(value) && !/[\\/]/.test(value)) ||
      /^[a-z][a-z0-9+.-]*:\/\//i.test(value)
    )
      throw new FoundationError(
        'INVALID_DATA',
        'Choose an exact snapshot reference rc_<32 lowercase hexadecimal digits>@1, or prefix a local path with ./',
      )
    if (
      options.origin !== undefined || options.expectedHash !== undefined ||
      options.offline
    )
      throw new FoundationError(
        'INVALID_DATA',
        'Snapshot origin, hash and --offline flags require an explicit remote snapshot reference',
      )
    return {
      recipe: await readRecipeFile(value), resolution: 'local', networkAccess: false,
    }
  }
  const official = options.origin === undefined && options.expectedHash === undefined
  if (official && options.offline)
    throw new FoundationError('INVALID_DATA', 'Code-only offline installation requires --snapshot-origin and --recipe-hash from a previously verified install')
  if (!official && (
    !options.origin || !options.expectedHash || options.expectedHash.length !== 64 ||
    !/^[0-9a-f]{64}$/.test(options.expectedHash)
  ))
    throw new FoundationError(
      'INVALID_DATA',
      'Remote snapshots require --snapshot-origin <origin> and --recipe-hash <64 lowercase hexadecimal digits>',
    )
  const source: RecipeSnapshotSource = {
    origin: normalizeSnapshotOrigin(options.origin ?? officialSnapshotOrigin),
    reference: value,
    recipeHash: options.expectedHash ?? '',
  }
  if (options.offline) {
    let snapshot: RecipeSnapshot | null
    try {
      snapshot = await readRecipeSnapshotCache(options.cacheRoot, source)
    } catch (error) {
      throw new FoundationError(
        'RESOLUTION_FAILURE',
        'Cannot read snapshot cache: ' +
          (error instanceof Error ? error.message : 'invalid cache configuration'),
        value,
        'Set OMBELLE_SNAPSHOT_CACHE_DIR to an absolute private cache directory, or retry online without --offline.',
      )
    }
    if (!snapshot)
      throw new FoundationError(
        'RESOLUTION_FAILURE',
        'Offline snapshot cache is missing, unsafe, corrupt, or does not match the required hash',
        value,
        'Retry online without --offline to verify current availability and install the snapshot.',
      )
    return {
      recipe: snapshot.recipe, snapshot, source,
      resolution: 'cache', networkAccess: false,
    }
  }
  const { id, revision } = parseRecipeSnapshotReference(value)
  const snapshot = await fetchPublication(new URL(`/api/v1/recipes/${id}/${revision}`, source.origin), value, async input => {
    const verified = await verifyRecipeSnapshot(input, official ? undefined : source)
    if (verified.id !== id || verified.revision !== revision)
      throw new FoundationError('INVALID_DATA', 'Snapshot does not match the requested reference', '/id')
    return verified
  })
  source.recipeHash = snapshot.recipeHash
  return {
    recipe: snapshot.recipe, snapshot, source,
    resolution: 'network', networkAccess: true,
  }
}
