import {
  FoundationError,
  supportedComponentIds,
  type ComponentId,
} from '@ombelle/contracts'

const known: readonly string[] = supportedComponentIds

function distance(a: string, b: string): number {
  let previous = Array.from({ length: b.length + 1 }, (_, i) => i)
  for (let i = 1; i <= a.length; i++) {
    const current = [i]
    for (let j = 1; j <= b.length; j++)
      current[j] = Math.min(
        previous[j] + 1,
        current[j - 1] + 1,
        previous[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1),
      )
    previous = current
  }
  return previous[b.length]
}

/** Catalog ids close to `id`, nearest first, at most three. */
export function closestComponentIds(id: string): ComponentId[] {
  const value = id.toLowerCase()
  const limit = Math.max(2, Math.floor(value.length / 3))
  return supportedComponentIds
    .map((candidate) => ({ candidate, score: distance(value, candidate) }))
    .filter(({ score }) => score <= limit)
    .sort((a, b) => a.score - b.score || a.candidate.localeCompare(b.candidate))
    .slice(0, 3)
    .map(({ candidate }) => candidate)
}

/**
 * Rejects ids outside the catalog before any project inspection, preset
 * resolution, or style-support check, so a typo never reads as a style refusal.
 */
export function assertKnownComponentIds(
  ids: readonly string[],
): asserts ids is readonly ComponentId[] {
  const unknown = [...new Set(ids.filter((id) => !known.includes(id)))]
  if (!unknown.length) return
  const described = unknown.map((id) => {
    const close = closestComponentIds(id)
    return close.length ? id + ' (did you mean ' + close.join(' or ') + '?)' : id
  })
  throw new FoundationError(
    'UNKNOWN_COMPONENT',
    (unknown.length === 1 ? 'Unknown component: ' : 'Unknown components: ') +
      described.join(', '),
    '/componentIds',
    'Choose catalog component ids: ' + supportedComponentIds.join(', ') + '.',
  )
}
