export const supportedStyleFamilies = ['flat', 'minimalist', 'neo-brutalism'] as const
export type StyleFamily = typeof supportedStyleFamilies[number]
export function isStyleFamily(value: unknown): value is StyleFamily {
  return typeof value === 'string' && supportedStyleFamilies.some(family => family === value)
}
