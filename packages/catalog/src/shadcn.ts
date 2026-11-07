// Component styles of the pinned shadcn 4.22.1 that Ombelle installs into.
// Radix styles are the ones verified with Radix templates; base styles are
// every Base UI style the pinned release offers (`shadcn/preset` PRESET_STYLES).
export const shadcnRadixStyles = ['radix-nova', 'new-york'] as const
export const shadcnBaseStyles = [
  'base-nova',
  'base-vega',
  'base-maia',
  'base-lyra',
  'base-mira',
  'base-luma',
  'base-sera',
  'base-rhea',
] as const
/**
 * sha256 of utility files the pinned shadcn generates, which Ombelle may
 * replace without a conflict: `export { cn } from "cn"` (4.22.1 templates).
 */
export const knownShadcnUtilityHashes = [
  '14300d758170c270c75b057f38fedb3793a5920ea872f0477e29fb131185e8a7',
] as const
