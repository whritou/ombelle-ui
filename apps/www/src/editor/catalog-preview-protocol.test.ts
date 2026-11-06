import { expect, it } from 'vitest'
import { compileComponentRecipe } from '@ombelle/compiler'
import badge from '../../../../examples/component-recipe.badge.json'
import { acceptCatalogMeasure, verifyCatalogPreviewRender } from './catalog-preview-protocol'

it('rejects stale and mismatched renders and revalidates the stylesheet', async () => {
  const result = await compileComponentRecipe({ recipe: badge })
  const message = { type: 'catalog-render', component: 'badge', requestId: 3, result, mode: 'light', viewport: 'wide' }
  expect(await verifyCatalogPreviewRender(message, 'badge', 3)).toBeNull()
  expect(await verifyCatalogPreviewRender({ ...message, component: 'button' }, 'badge', 2)).toBeNull()
  expect(await verifyCatalogPreviewRender({ ...message, result: { ...result, scope: '0'.repeat(64) } }, 'badge', 2)).toBeNull()
  expect(await verifyCatalogPreviewRender(message, 'badge', 2)).toEqual(message)
})

it('accepts only finite dimensions for the parts of the component', () => {
  const message = { type: 'catalog-measure', requestId: 4, parts: { badge: { paddingXPx: 8, radiusRem: 0.5 } } }
  expect(acceptCatalogMeasure(message, 'badge')).toEqual(message)
  expect(acceptCatalogMeasure({ ...message, parts: { card: { paddingXPx: 8 } } }, 'badge')).toBeNull()
  expect(acceptCatalogMeasure({ ...message, parts: { badge: { colors: 1 } } }, 'badge')).toBeNull()
  expect(acceptCatalogMeasure({ ...message, parts: { badge: { gapPx: Number.NaN } } }, 'badge')).toBeNull()
  expect(acceptCatalogMeasure({ ...message, requestId: 0 }, 'badge')).toBeNull()
  expect(acceptCatalogMeasure({ ...message, extra: true }, 'badge')).toBeNull()
})
