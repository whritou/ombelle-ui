import { expect, it } from 'vitest'
import { compileComponentRecipe } from '@ombelle/compiler'
import badge from '../../../../examples/component-recipe.badge.json'
import { acceptButtonMeasure, acceptCatalogMeasure, verifyCatalogPreviewRender } from './catalog-preview-protocol'
import { baselineText } from './components/properties-panel'

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

it('accepts the Button specimen measure only under its button slot', () => {
  const message = { type: 'catalog-measure', requestId: 2, parts: { button: { paddingXPx: 22, radiusRem: 0.6 } } }
  expect(acceptButtonMeasure(message)).toEqual({ requestId: 2, values: { paddingXPx: 22, radiusRem: 0.6 } })
  expect(acceptButtonMeasure({ ...message, parts: { badge: { paddingXPx: 8 } } })).toBeNull()
  expect(acceptButtonMeasure({ ...message, parts: { button: {}, badge: {} } })).toBeNull()
  expect(acceptButtonMeasure({ ...message, parts: { button: { gapPx: Number.POSITIVE_INFINITY } } })).toBeNull()
  expect(acceptButtonMeasure({ ...message, requestId: 0 })).toBeNull()
})

it('rounds a baseline to the field step for the empty field', () => {
  expect(baselineText(0.6000001, 0.1)).toBe('0.6')
  expect(baselineText(-0.0125, 0.01)).toBe('-0.01')
  expect(baselineText(600, 100)).toBe('600')
  expect(baselineText(undefined, 1)).toBeUndefined()
})

it('accepts the reduced-transparency flag only as true', async () => {
  const result = await compileComponentRecipe({ recipe: badge })
  const message = { type: 'catalog-render', component: 'badge', requestId: 3, result, mode: 'light', viewport: 'wide' }
  expect(await verifyCatalogPreviewRender({ ...message, reducedTransparency: true }, 'badge', 2)).toEqual({ ...message, reducedTransparency: true })
  for (const reducedTransparency of [false, 'yes'])
    expect(await verifyCatalogPreviewRender({ ...message, reducedTransparency }, 'badge', 2)).toBeNull()
  expect(await verifyCatalogPreviewRender(message, 'badge', 2)).toEqual(message)
})
