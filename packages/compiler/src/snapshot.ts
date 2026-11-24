import { getCatalog } from '@ombelle/catalog'
import {
  FoundationError,
  contractRelease,
  isStyleFamily,
  isSupportedContractRelease,
  parseSnapshotReference,
  validatePresetSnapshot,
  type Preset,
  type PresetSnapshot,
  type ResolvedPreset,
} from '@ombelle/contracts'
import { canonicalize } from './canonicalize.js'
import { sha256 } from './hash.js'
import { normalizeColor, resolvePreset } from './resolve.js'

const maxPresetBytes = 65_536
function assertPresetSize(preset: unknown): void {
  if (
    new TextEncoder().encode(canonicalize(preset)).byteLength > maxPresetBytes
  )
    throw new FoundationError(
      'INVALID_DATA',
      'Preset exceeds the 65,536-byte UTF-8 limit',
      '/preset',
    )
}

export async function normalizePublishedPreset(
  input: unknown,
): Promise<ResolvedPreset> {
  // Schema validation runs before canonicalization so malformed non-JSON inputs
  // cannot reach the recursive canonical serializer.
  const normalized = await resolvePreset(input, getCatalog(contractRelease))
  if (!isStyleFamily(normalized.data.styleFamily))
    throw new FoundationError(
      'INVALID_DATA',
      'Style family is not available in the foundation',
      '/styleFamily',
    )
  assertPresetSize(input)
  assertPresetSize(normalized.data)
  return normalized
}

export async function verifyPresetSnapshot(
  input: unknown,
  expected?: { reference: string; presetHash: string },
): Promise<PresetSnapshot> {
  const snapshot = validatePresetSnapshot(input)
  if (expected) {
    const reference = parseSnapshotReference(expected.reference)
    if (
      reference.id !== snapshot.id ||
      reference.revision !== snapshot.revision
    )
      throw new FoundationError(
        'INVALID_DATA',
        'Snapshot does not match the requested reference',
        '/id',
      )
    if (expected.presetHash !== snapshot.presetHash)
      throw new FoundationError(
        'INVALID_DATA',
        'Snapshot does not match the expected preset hash',
        '/presetHash',
      )
  }
  // A snapshot is identified by its stored bytes (decision 0009): check its own normal form and hash, never
  // today's catalog defaults or built-ins, so a published code keeps verifying across catalog releases.
  assertStoredPresetNormalized(snapshot.preset, '/preset')
  if ((await sha256(canonicalize(snapshot.preset))) !== snapshot.presetHash)
    throw new FoundationError(
      'INVALID_DATA',
      'Snapshot preset hash does not match its canonical content',
      '/presetHash',
    )
  return snapshot
}

/**
 * Normal-form checks that need no catalog: a stored preset spells every colour canonically, names its
 * Button defaults, and is within the publication size limit. Family defaults are not re-merged here.
 */
export function assertStoredPresetNormalized(preset: Preset, path: string): void {
  if (!isStyleFamily(preset.styleFamily))
    throw new FoundationError('INVALID_DATA', 'Style family is not available in the foundation', path + '/styleFamily')
  if (!isSupportedContractRelease(preset.catalogRelease) || !isSupportedContractRelease(preset.compilerVersion))
    throw new FoundationError('UNSUPPORTED_RELEASE', 'Preset release mismatch', path + '/catalogRelease')
  const button = preset.componentDefaults?.button
  const colors = (['light', 'dark'] as const).every(mode =>
    Object.values(preset.modes[mode]).every(color => color === undefined || color === normalizeColor(color)))
  if (!button?.variant || !button.size || !colors)
    throw new FoundationError('INVALID_DATA', 'Snapshot preset must already be normalized', path)
  assertPresetSize(preset)
}
