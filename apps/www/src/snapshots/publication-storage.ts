import { isStyleFamily, validatePreset } from '@ombelle/contracts'
import {
  publicationMaxAge,
  publicationMaxBytes,
  type PublishAttempt,
} from './publication'
export const publicationStorageKey = 'ombelle:preset-editor:publication:v1'
const bytes = (value: string) => new TextEncoder().encode(value).byteLength

function validateAttempt(input: unknown): PublishAttempt {
  if (!input || typeof input !== 'object' || Array.isArray(input))
    throw new Error('Invalid publication attempt.')
  const value = input as Record<string, unknown>
  if (
    Object.keys(value).length !== 5 ||
    value.storageVersion !== 1 ||
    typeof value.key !== 'string' ||
    !/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
      value.key,
    ) ||
    !Number.isSafeInteger(value.createdAt) ||
    (value.createdAt as number) < 0 ||
    typeof value.presetHash !== 'string' ||
    !/^[a-f0-9]{64}$/.test(value.presetHash)
  )
    throw new Error('Invalid publication attempt.')
  const stack = [{ value: value.preset, depth: 0 }]
  while (stack.length) {
    const next = stack.pop()!
    if (next.depth > 16) throw new Error('Preset is too deeply nested.')
    if (next.value && typeof next.value === 'object')
      for (const child of Object.values(next.value))
        stack.push({ value: child, depth: next.depth + 1 })
  }
  const preset = validatePreset(value.preset)
  if (
    preset.schemaVersion !== '1.0' ||
    preset.catalogRelease !== '0.1.0' ||
    preset.compilerVersion !== '0.1.0' ||
    !isStyleFamily(preset.styleFamily) ||
    bytes(JSON.stringify(preset)) > 65_536
  )
    throw new Error('Unsupported publication attempt.')
  return {
    storageVersion: 1,
    key: value.key,
    createdAt: value.createdAt as number,
    preset: structuredClone(preset),
    presetHash: value.presetHash,
  }
}
export function readPublishAttempt(
  storage: Storage,
  now: number,
): PublishAttempt | null {
  const raw = storage.getItem(publicationStorageKey)
  if (raw === null) return null
  try {
    if (bytes(raw) > publicationMaxBytes)
      throw new Error('Publication attempt is too large.')
    const attempt = validateAttempt(JSON.parse(raw))
    if (
      !Number.isSafeInteger(now) ||
      now < attempt.createdAt ||
      now - attempt.createdAt >= publicationMaxAge
    )
      throw new Error('Publication attempt expired.')
    return attempt
  } catch {
    // Discard only this retry record. Draft/history recovery uses separate keys.
    try {
      storage.removeItem(publicationStorageKey)
    } catch {
      /* denied storage */
    }
    return null
  }
}
export function writePublishAttempt(
  storage: Storage,
  attempt: PublishAttempt,
): void {
  const raw = JSON.stringify(attempt)
  if (bytes(raw) > publicationMaxBytes)
    throw new Error('Publication attempt is too large.')
  validateAttempt(attempt)
  storage.setItem(publicationStorageKey, raw)
}
