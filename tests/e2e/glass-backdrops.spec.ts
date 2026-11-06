import { expect, test, type Locator, type Page } from '@playwright/test'
import type { StartingPresetId } from '@ombelle/catalog'
import { catalogDraftKey, catalogPresetRef, createCatalogDraft } from '../../apps/www/src/editor/catalog-draft.js'
import { applyStartingPreset, createPresetDraft } from '../../apps/www/src/preset-editor/model.js'
import { glassPresetBackdrop } from '../../apps/www/src/site/glass-presets.js'

// One preset per scene: Prisme, Pêche and the kit gradient.
const presets: StartingPresetId[] = ['builtin-liquid-glass-cristal', 'builtin-liquid-glass-relief', 'builtin-liquid-glass']

const previewRoot = (page: Page, title: string) =>
  page.locator(`iframe[title="${title}"]`).contentFrame().locator('html')

async function expectScene(root: Locator, scene: ReturnType<typeof glassPresetBackdrop>) {
  await expect(root).toHaveAttribute('data-backdrop', 'glass')
  // The kit is the stylesheet's own gradient; naming it would switch that gradient off.
  if (scene === 'kit') await expect(root).not.toHaveAttribute('data-glass-backdrop', /./)
  else await expect(root).toHaveAttribute('data-glass-backdrop', scene)
}

for (const id of presets) test(`${id} shows the same backdrop in the preset editor, component page and component editor`, async ({ page }) => {
  const scene = glassPresetBackdrop(id)
  const recipe = { ...createCatalogDraft('card').recipe, presetRef: catalogPresetRef('liquid-glass', id) }
  await page.addInitScript(drafts => {
    if (location.origin !== 'http://127.0.0.1:3000') return
    for (const [key, value] of drafts) localStorage.setItem(key, value)
  }, [
    ['ombelle:preset-editor:draft:v1', JSON.stringify(applyStartingPreset(createPresetDraft('liquid-glass'), id))],
    [catalogDraftKey('card'), JSON.stringify({ storageVersion: 1, recipe })],
  ])

  await page.goto('http://127.0.0.1:3000/editor/preset?page=gallery')
  // A cold compile of the gallery can outlast the default expect timeout.
  await expect(page.getByTestId('preset-preview-status')).toHaveText('Preview ready', { timeout: 30000 })
  await expectScene(previewRoot(page, 'Global preset gallery'), scene)

  await page.goto(`http://127.0.0.1:3000/components/card?glass=${id}`)
  await expectScene(previewRoot(page, 'Card preview'), scene)

  await page.goto('http://127.0.0.1:3000/editor/component/card')
  await expectScene(previewRoot(page, 'Card recipe preview'), scene)
})
