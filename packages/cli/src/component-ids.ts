import {
  FoundationError,
  isBlockId,
  supportedBlockIds,
  supportedComponentIds,
  type BlockId,
  type CatalogId,
  type ComponentId,
} from '@ombelle/contracts'

const catalogIds: readonly CatalogId[] = [...supportedComponentIds, ...supportedBlockIds]
const known: readonly string[] = catalogIds

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
export function closestCatalogIds(id: string): CatalogId[] {
  const value = id.toLowerCase()
  const limit = Math.max(2, Math.floor(value.length / 3))
  return catalogIds
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
export function assertKnownCatalogIds(
  ids: readonly string[],
): asserts ids is readonly CatalogId[] {
  const unknown = [...new Set(ids.filter((id) => !known.includes(id)))]
  if (!unknown.length) return
  const described = unknown.map((id) => {
    const close = closestCatalogIds(id)
    return close.length ? id + ' (did you mean ' + close.join(' or ') + '?)' : id
  })
  throw new FoundationError(
    'UNKNOWN_COMPONENT',
    (unknown.length === 1 ? 'Unknown component or block: ' : 'Unknown components or blocks: ') +
      described.join(', '),
    '/componentIds',
    'Choose catalog component ids: ' +
      supportedComponentIds.join(', ') +
      '. Blocks: ' +
      supportedBlockIds.join(', ') +
      '.',
  )
}

/** Splits validated catalog ids into components and blocks, keeping the given order. */
export function splitCatalogIds(ids: readonly CatalogId[]): {
  components: ComponentId[]
  blocks: BlockId[]
} {
  const components: ComponentId[] = []
  const blocks: BlockId[] = []
  for (const id of ids) {
    if (isBlockId(id)) blocks.push(id)
    else components.push(id)
  }
  return { components, blocks }
}
