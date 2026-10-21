import type { Recipe } from '@ombelle/contracts'
export function recipeFixtures(): readonly Recipe[] {
  return ['flat', 'minimalist', 'neo-brutalism'].map((family) => ({
    schemaVersion: '1.0',
    id: 'rc_' + family.replaceAll('-', '_') + '_button',
    revision: 1,
    component: 'button',
    presetRef: {
      id: 'builtin-' + family,
      revision: 1,
      catalogRelease: '0.1.0',
      compilerVersion: '0.1.0',
    },
    props: { variant: 'default', size: 'lg' },
    content: 'Recipe action',
    overrides: {
      radiusRem: 0,
      borderWidthPx: 2,
      minHeightPx: 44,
      shadowOffsetXPx: 6,
      shadowOffsetYPx: 6,
    },
  }))
}
