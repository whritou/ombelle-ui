import { publishAttempt, type PublishAttempt } from './attempt'
import {
  capitalized,
  fieldOf,
  publicationContentMaxBytes,
  publicationMaxAge,
  publicationMaxBytes,
  supportedRelease,
  type PublicationKind,
  type PublicationTypes,
} from './kind'

const bytes = (value: string) => new TextEncoder().encode(value).byteLength

function validateAttempt<T extends PublicationTypes>(
  kind: PublicationKind<T>,
  input: unknown,
): PublishAttempt<T> {
  if (!input || typeof input !== 'object' || Array.isArray(input))
    throw new Error('Invalid publication attempt.')
  const value = input as Record<string, unknown>
  const hash = fieldOf(value, kind.hashField)
  if (
    Object.keys(value).length !== 5 ||
    value.storageVersion !== 1 ||
    typeof value.key !== 'string' ||
    !/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
      value.key,
    ) ||
    !Number.isSafeInteger(value.createdAt) ||
    (value.createdAt as number) < 0 ||
    typeof hash !== 'string' ||
    !/^[a-f0-9]{64}$/.test(hash)
  )
    throw new Error('Invalid publication attempt.')
  const stack = [{ value: fieldOf(value, kind.field), depth: 0 }]
  while (stack.length) {
    const next = stack.pop()!
    if (next.depth > 16)
      throw new Error(`${capitalized(kind.noun)} is too deeply nested.`)
    if (next.value && typeof next.value === 'object')
      for (const child of Object.values(next.value))
        stack.push({ value: child, depth: next.depth + 1 })
  }
  const data = kind.validate(fieldOf(value, kind.field))
  if (
    !supportedRelease(kind.release(data)) ||
    kind.supported?.(data) === false ||
    bytes(JSON.stringify(data)) > publicationContentMaxBytes
  )
    throw new Error('Unsupported publication attempt.')
  return publishAttempt(kind, {
    key: value.key,
    createdAt: value.createdAt as number,
    data: structuredClone(data),
    hash,
  })
}

export function readPublishAttempt<T extends PublicationTypes>(
  kind: PublicationKind<T>,
  storage: Storage,
  now: number,
  storageKey = kind.storageKey,
): PublishAttempt<T> | null {
  const raw = storage.getItem(storageKey)
  if (raw === null) return null
  try {
    if (bytes(raw) > publicationMaxBytes)
      throw new Error('Publication attempt is too large.')
    const attempt = validateAttempt(kind, JSON.parse(raw))
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
      storage.removeItem(storageKey)
    } catch {
      /* denied storage */
    }
    return null
  }
}

export function writePublishAttempt<T extends PublicationTypes>(
  kind: PublicationKind<T>,
  storage: Storage,
  attempt: PublishAttempt<T>,
  storageKey = kind.storageKey,
): void {
  const raw = JSON.stringify(attempt)
  if (bytes(raw) > publicationMaxBytes)
    throw new Error('Publication attempt is too large.')
  validateAttempt(kind, attempt)
  storage.setItem(storageKey, raw)
}
