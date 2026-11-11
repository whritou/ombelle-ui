import { expect, it } from 'vitest'
import { compileComponentRecipe } from '@ombelle/compiler'
import badge from '../../../../examples/component-recipe.badge.json'
import { acceptButtonMeasure, acceptCatalogMeasure, verifyCatalogMatrixRender, verifyCatalogPreviewRender } from './catalog-preview-protocol'
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

it('the catalog measure accepts measured colours as hex only', () => {
  const ok = { type: 'catalog-measure', requestId: 4, parts: { badge: { paddingXPx: 8, backgroundColor: '#1D4ED8', color: '#FFFFFF80' } } }
  expect(acceptCatalogMeasure(ok, 'badge')?.parts.badge).toEqual({ paddingXPx: 8, backgroundColor: '#1D4ED8', color: '#FFFFFF80' })
  expect(acceptCatalogMeasure({ ...ok, parts: { badge: { backgroundColor: 'red' } } }, 'badge')).toBeNull()
  expect(acceptCatalogMeasure({ ...ok, parts: { badge: { backgroundColor: 1 } } }, 'badge')).toBeNull()
  expect(acceptCatalogMeasure({ ...ok, parts: { badge: { paddingXPx: 4 } } }, 'badge')).not.toBeNull()
})

it('the Button measure accepts measured colours as hex only', () => {
  const ok = { type: 'catalog-measure', requestId: 2, parts: { button: { paddingXPx: 22, backgroundColor: '#1D4ED8' } } }
  expect(acceptButtonMeasure(ok)?.values).toEqual({ paddingXPx: 22, backgroundColor: '#1D4ED8' })
  expect(acceptButtonMeasure({ ...ok, parts: { button: { borderColor: 'oklch(0.5 0 0)' } } })).toBeNull()
})

it('verifies a catalog matrix and rejects malformed ones', async () => {
  const cell = async (variant: string, current: boolean) => ({ row: variant, column: null, current,
    result: await compileComponentRecipe({ recipe: { ...badge, props: { variant } } }) })
  const message = { type: 'catalog-matrix-render', component: 'badge', requestId: 3, rows: 'variant', columns: null,
    cells: [await cell('default', true), await cell('outline', false)], mode: 'dark', viewport: 'narrow' }
  expect(await verifyCatalogMatrixRender(message, 'badge', 2)).toEqual(message)
  expect(await verifyCatalogMatrixRender({ ...message, cells: [] }, 'badge', 2)).toBeNull()
  expect(await verifyCatalogMatrixRender({ ...message, cells: Array(49).fill(message.cells[1]) }, 'badge', 2)).toBeNull()
  expect(await verifyCatalogMatrixRender({ ...message, cells: message.cells.map((c) => ({ ...c, current: false })) }, 'badge', 2)).toBeNull()
  expect(await verifyCatalogMatrixRender({ ...message, extra: 1 }, 'badge', 2)).toBeNull()
  expect(await verifyCatalogMatrixRender({ ...message, cells: [{ ...message.cells[0]!, result: { ...message.cells[0]!.result, scope: '0'.repeat(64) } }, message.cells[1]] }, 'badge', 2)).toBeNull()
  expect(await verifyCatalogMatrixRender({ ...message, reducedTransparency: true }, 'badge', 2)).not.toBeNull()
  expect(await verifyCatalogMatrixRender({ ...message, reducedTransparency: 'yes' }, 'badge', 2)).toBeNull()
  expect(await verifyCatalogMatrixRender(message, 'card', 2)).toBeNull()
})
