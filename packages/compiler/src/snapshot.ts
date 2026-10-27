import { getCatalog } from '@ombelle/catalog'
import {
  FoundationError,
  parseSnapshotReference,
  validatePresetSnapshot,
  type PresetSnapshot,
  type ResolvedPreset,
} from '@ombelle/contracts'
import { canonicalize } from './canonicalize.js'
import { resolvePreset } from './resolve.js'

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
  const normalized = await resolvePreset(input, getCatalog('0.1.0'))
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
  const normalized = await normalizePublishedPreset(snapshot.preset)
  if (canonicalize(snapshot.preset) !== canonicalize(normalized.data))
    throw new FoundationError(
      'INVALID_DATA',
      'Snapshot preset must already be normalized',
      '/preset',
    )
  if (normalized.hash !== snapshot.presetHash)
    throw new FoundationError(
      'INVALID_DATA',
      'Snapshot preset hash does not match its canonical content',
      '/presetHash',
    )
  return snapshot
}
