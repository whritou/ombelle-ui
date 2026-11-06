import { expect, it } from 'vitest'
import { compileComponentRecipe } from '@ombelle/compiler'
import badge from '../../../../examples/component-recipe.badge.json'
import { verifyCatalogPreviewRender } from './catalog-preview-protocol'

it('rejects stale and mismatched renders and revalidates the stylesheet', async () => {
  const result = await compileComponentRecipe({ recipe: badge })
  const message = { type: 'catalog-render', component: 'badge', requestId: 3, result, mode: 'light', viewport: 'wide' }
  expect(await verifyCatalogPreviewRender(message, 'badge', 3)).toBeNull()
  expect(await verifyCatalogPreviewRender({ ...message, component: 'button' }, 'badge', 2)).toBeNull()
  expect(await verifyCatalogPreviewRender({ ...message, result: { ...result, scope: '0'.repeat(64) } }, 'badge', 2)).toBeNull()
  expect(await verifyCatalogPreviewRender(message, 'badge', 2)).toEqual(message)
})
