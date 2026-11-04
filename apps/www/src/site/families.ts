import type { StableStyleFamily } from '@ombelle/contracts'
import { offeredStyleFamilies } from '../snapshots/install-command'

/**
 * Stable style families the public site offers: the same gate as the editors,
 * so copy never names a family the published installer cannot install.
 */
export const siteStableFamilies = offeredStyleFamilies().filter(
  (family): family is StableStyleFamily => family !== 'liquid-glass',
)

const proseNames: Record<StableStyleFamily, string> = {
  flat: 'flat',
  minimalist: 'minimalist',
  'neo-brutalism': 'neo-brutalism',
  ombelle: 'Ombelle',
}

export const familyHeadings: Record<StableStyleFamily, string> = {
  flat: 'Flat',
  minimalist: 'Minimalist',
  'neo-brutalism': 'Neo-Brutalism',
  ombelle: 'Ombelle',
}

/** "flat, minimalist and neo-brutalism" for the given families. */
export function familyList(families: readonly StableStyleFamily[] = siteStableFamilies): string {
  const names = families.map((family) => proseNames[family])
  if (names.length < 2) return names.join('')
  return names.slice(0, -1).join(', ') + ' and ' + names.at(-1)
}
