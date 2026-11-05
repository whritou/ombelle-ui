import type { ComponentId } from './component-ids.js'

// Kept free of runtime imports: scripts load this file directly with Node.
export const supportedStyleFamilies = ['flat', 'minimalist', 'neo-brutalism', 'ombelle'] as const
export const styleFamilies = [...supportedStyleFamilies, 'liquid-glass'] as const
export type StyleFamily = typeof styleFamilies[number]
export type StableStyleFamily = typeof supportedStyleFamilies[number]
export type StyleSupport = 'stable' | 'experimental' | 'unavailable'

export function isStyleFamily(value: unknown): value is StyleFamily {
  return typeof value === 'string' && styleFamilies.some(family => family === value)
}

const glassExperimental: ReadonlySet<ComponentId> = new Set<ComponentId>([
  'alert',
  'button',
  'badge',
  'card',
  'checkbox',
  'dialog',
  'dropdown-menu',
  'input',
  'label',
  'native-select',
  'popover',
  'radio-group',
  'switch',
  'tabs',
  'textarea',
  'tooltip',
])

export function styleSupport(id: ComponentId, family: StyleFamily): StyleSupport {
  if (family !== 'liquid-glass') return 'stable'
  return glassExperimental.has(id) ? 'experimental' : 'unavailable'
}
