import {
  FoundationError,
  officialSnapshotOrigin,
  normalizeSnapshotOrigin,
  parseSnapshotReference,
  type Preset,
  type PresetSnapshot,
  type SnapshotSource,
} from '@ombelle/contracts'
import { verifyPresetSnapshot } from '@ombelle/compiler'
import { readPresetFile } from '../preset-file.js'
import { readSnapshotCache } from './cache.js'
import { fetchPublication } from './transport.js'

export type PresetInputOptions = {
  origin?: string
  expectedHash?: string
  offline?: boolean
  cacheRoot: string
}
export type ResolvedPresetInput = {
  preset: Preset
  snapshot?: PresetSnapshot
  source?: SnapshotSource
  resolution: 'local' | 'network' | 'cache'
  networkAccess: boolean
}
const exactReference = (value: string) =>
  value.length === 37 && /^ps_[0-9a-f]{32}@1$/.test(value)


export async function resolvePresetInput(
  value: string, options: PresetInputOptions,
): Promise<ResolvedPresetInput> {
  if (!exactReference(value)) {
    if (
      (/^(ps_|rc_)/i.test(value) && !/[\\/]/.test(value)) ||
      /^[a-z][a-z0-9+.-]*:\/\//i.test(value)
    )
      throw new FoundationError(
        'INVALID_DATA',
        'Choose an exact snapshot reference ps_<32 lowercase hexadecimal digits>@1, or prefix a local path with ./',
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
      preset: await readPresetFile(value), resolution: 'local', networkAccess: false,
    }
  }
  const official = options.origin === undefined && options.expectedHash === undefined
  if (official && options.offline)
    throw new FoundationError('INVALID_DATA', 'Code-only offline installation requires --snapshot-origin and --preset-hash from a previously verified install')
  if (!official && (
    !options.origin || !options.expectedHash || options.expectedHash.length !== 64 ||
    !/^[0-9a-f]{64}$/.test(options.expectedHash)
  ))
    throw new FoundationError(
      'INVALID_DATA',
      'Remote snapshots require --snapshot-origin <origin> and --preset-hash <64 lowercase hexadecimal digits>',
    )
  const source: SnapshotSource = {
    origin: normalizeSnapshotOrigin(options.origin ?? officialSnapshotOrigin),
    reference: value,
    presetHash: options.expectedHash ?? '',
  }
  if (options.offline) {
    let snapshot: PresetSnapshot | null
    try {
      snapshot = await readSnapshotCache(options.cacheRoot, source)
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
      preset: snapshot.preset, snapshot, source,
      resolution: 'cache', networkAccess: false,
    }
  }
  const { id, revision } = parseSnapshotReference(value)
  const snapshot = await fetchPublication(new URL(`/api/v1/presets/${id}/${revision}`, source.origin), value, async input => {
    const verified = await verifyPresetSnapshot(input, official ? undefined : source)
    if (verified.id !== id || verified.revision !== revision)
      throw new FoundationError('INVALID_DATA', 'Snapshot does not match the requested reference', '/id')
    return verified
  })
  source.presetHash = snapshot.presetHash
  return {
    preset: snapshot.preset, snapshot, source,
    resolution: 'network', networkAccess: true,
  }
}
