import type { ComponentId } from './component-ids.js'

// Kept free of runtime imports: scripts load this file directly with Node.
export const supportedStyleFamilies = ['flat', 'minimalist', 'neo-brutalism', 'ombelle', 'papier', 'organic', 'retro-futurism'] as const
export const styleFamilies = [...supportedStyleFamilies, 'liquid-glass'] as const
export type StyleFamily = typeof styleFamilies[number]
export type StableStyleFamily = typeof supportedStyleFamilies[number]
export type StyleSupport = 'stable' | 'experimental' | 'unavailable'

export function isStyleFamily(value: unknown): value is StyleFamily {
  return typeof value === 'string' && styleFamilies.some(family => family === value)
}

// Components liquid glass leaves out (none today). Glass is a stable family whose accessibility is not
// guaranteed: see familyAccessibilityCaveat. Listing exclusions rather than members means a new component
// is never silently refused in glass; the catalog contract test then requires its glass rules.
const glassUnavailable: ReadonlySet<ComponentId> = new Set<ComponentId>([])

export function styleSupport(id: ComponentId, family: StyleFamily): StyleSupport {
  if (family !== 'liquid-glass') return 'stable'
  return glassUnavailable.has(id) ? 'unavailable' : 'stable'
}

/** Short label for a family whose accessibility the library cannot guarantee. */
export const accessibilityCaveatLabel = 'Accessibility not guaranteed'

/**
 * Why a family's accessibility is not guaranteed, or null when it is held to the full contract.
 * Liquid glass paints translucent surfaces over whatever the app puts behind them, so its text
 * contrast depends on that background. The compile-time bound covers the declared backdrop range
 * only; transparency "reduced" makes every surface opaque and restores the full guarantee.
 */
export function familyAccessibilityCaveat(family: StyleFamily): string | null {
  return family === 'liquid-glass'
    ? 'Accessibility not guaranteed: liquid glass text contrast depends on the background behind it. ' +
      'Check contrast over your own backgrounds, or set design.transparency to "reduced" for opaque surfaces.'
    : null
}
