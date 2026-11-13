import { expect, test, type Page } from '@playwright/test'
import AxeBuilder from '@axe-core/playwright'
import { catalogDraftKey, catalogPresetRef, createCatalogDraft } from '../../apps/www/src/editor/catalog-draft.js'
import { createEditorDraft } from '../../apps/www/src/editor/model.js'
import { DRAFT_STORAGE_KEY, serializeDraft } from '../../apps/www/src/editor/storage.js'
import { hexFromComputedColor } from '../../apps/www/src/editor/measured-color.js'
import { propValue } from '../../apps/www/src/editor/matrix.js'
import { segment } from '../helpers/preset-editor-ui.js'

const site = 'http://127.0.0.1:3000'
const frame = (page: Page, title: string) => page.locator(`iframe[title="${title}"]`).contentFrame()
const matrix = (page: Page, title: string) => frame(page, title).getByTestId('variant-matrix')

async function seed(page: Page, entries: [string, string][]) {
  await page.addInitScript((drafts) => {
    if (location.origin !== 'http://127.0.0.1:3000') return
    for (const [key, value] of drafts) localStorage.setItem(key, value)
  }, entries)
}

async function chooseMenuItem(page: Page, name: string) {
  await page.getByRole('button', { name: 'More actions', exact: true }).click()
  await page.getByRole('menuitem', { name, exact: true }).click()
}

// The computed background through a canvas, as the preview's measurement reads OKLCH and other syntaxes.
const computedHex = async (page: Page, title: string, selector: string) =>
  hexFromComputedColor(await frame(page, title).locator(selector).first().evaluate((element) => {
    const context = document.createElement('canvas').getContext('2d')!
    context.fillStyle = getComputedStyle(element).backgroundColor
    context.fillRect(0, 0, 1, 1)
    const [red, green, blue, alpha] = context.getImageData(0, 0, 1, 1).data
    return `rgba(${red}, ${green}, ${blue}, ${alpha! / 255})`
  }))

test('colour placeholders show the rendered colour', async ({ page }) => {
  await page.goto(`${site}/editor/component/badge`)
  const field = page.locator('#catalog-color-background')
  const light = await computedHex(page, 'Badge recipe preview', "[data-slot='recipe-badge']")
  expect(light).toMatch(/^#[0-9A-F]{6}/)
  await expect(field).toHaveAttribute('placeholder', light!)
  await segment(page, 'Preview mode', 'Dark').click()
  await segment(page, 'Color mode', 'Dark').click()
  await expect.poll(() => computedHex(page, 'Badge recipe preview', "[data-slot='recipe-badge']")).not.toBe(light)
  const dark = await computedHex(page, 'Badge recipe preview', "[data-slot='recipe-badge']")
  await expect(field).toHaveAttribute('placeholder', dark!)
  // The light field shows the inherited label while the preview is dark.
  await segment(page, 'Color mode', 'Light').click()
  await expect(field).toHaveAttribute('placeholder', 'Preset')
})

test('the Button matrix shows every variant and size, the states and the edits', async ({ page }) => {
  const draft = createEditorDraft('flat')
  draft.recipe.overrides = { colors: { light: { background: '#123456' } } }
  await seed(page, [[DRAFT_STORAGE_KEY, serializeDraft(draft)]])
  await page.goto(`${site}/editor/component/button`)
  await segment(page, 'Preview layout', 'Matrix').click()
  // The wait is announced until every cell compiled, then the status goes away.
  await expect(page.getByTestId('matrix-pending')).toHaveText('Compiling the matrix…')
  const table = matrix(page, 'Button recipe preview')
  await expect(table).toBeVisible({ timeout: 60000 })
  await expect(page.getByTestId('matrix-pending')).toHaveCount(0)
  await expect(table.locator('thead th[scope="col"]')).toHaveCount(4)
  await expect(table.locator('tbody th[scope="row"]')).toHaveCount(8)
  await expect(table.locator('.recipe-matrix-state')).toHaveCount(5)
  await expect(table.locator('td[aria-current="true"]')).toHaveCount(1)
  // Every cell is this recipe with its own variant and size: the colour edit shows in the default row.
  const defaultRow = table.locator('tbody tr').filter({ has: page.locator('th', { hasText: /^default$/ }) }).first()
  const backgrounds = await defaultRow.locator("[data-slot='recipe-button']").evaluateAll((buttons) => buttons.map((button) => getComputedStyle(button).backgroundColor))
  expect(backgrounds.length).toBe(4)
  for (const color of backgrounds) expect(hexFromComputedColor(color)).toBe('#123456')
})

test('Badge and Card matrices change axes and mark the current cell', async ({ page }) => {
  await page.goto(`${site}/editor/component/badge`)
  await segment(page, 'Preview layout', 'Matrix').click()
  const table = matrix(page, 'Badge recipe preview')
  await expect(table).toBeVisible({ timeout: 60000 })
  await page.getByLabel('Columns', { exact: true }).selectOption('appearance')
  await expect(table.locator('thead th[scope="col"]')).toHaveCount(3)
  const current = table.locator('td[aria-current="true"]')
  await expect(current).toHaveCount(1)
  // A fresh Badge draft keeps the schema default variant, which the inspector shows.
  await expect(current.locator('xpath=ancestor::tr/th')).toHaveText(String(propValue(createCatalogDraft('badge').recipe, 'variant', 'badge')))
  const results = await new AxeBuilder({ page }).include(['iframe[title="Badge recipe preview"]', '[data-testid="variant-matrix"]']).analyze()
  expect(results.violations.map((violation) => violation.id)).toEqual([])

  await page.goto(`${site}/editor/component/card`)
  await segment(page, 'Preview layout', 'Matrix').click()
  await expect(matrix(page, 'Card recipe preview').locator('td[aria-current="true"]')).toHaveCount(1, { timeout: 60000 })
})

test('the cap message', async () => {
  test.skip(true, 'No component has more than 48 cells with its default axes; the cap is pinned by matrix.test.ts.')
})

test('Changes and the Get code summary', async ({ page }) => {
  await page.goto(`${site}/editor/component/card`)
  await page.locator('#catalog-color-background').fill('#123456')
  await expect(page.getByRole('button', { name: 'Get code', exact: true })).toBeEnabled()
  await page.getByRole('tab', { name: 'CSS', exact: true }).click()
  await segment(page, 'Show', 'Changes').click()
  const changes = page.locator('#artifact-changes')
  await expect(changes).toContainText('+ ')
  await expect(changes).toContainText(/123456/i)
  await page.getByRole('button', { name: 'Get code', exact: true }).click()
  const dialog = page.getByRole('dialog', { name: 'Get code' })
  await expect(dialog.getByTestId('changes-summary')).toHaveText(/^Changes from the catalog default: \d+ files?, \+\d+ −\d+$/)
  const results = await new AxeBuilder({ page }).include('[role="dialog"]').analyze()
  expect(results.violations.map((violation) => violation.id)).toEqual([])
  await dialog.getByRole('button', { name: 'Show changes', exact: true }).click()
  await expect(changes).toBeFocused()
  await chooseMenuItem(page, 'Reset recipe')
  await expect(page.getByRole('button', { name: 'Get code', exact: true })).toBeEnabled()
  await page.getByRole('button', { name: 'Get code', exact: true }).click()
  await expect(dialog.getByTestId('changes-summary')).toHaveText('Same as the catalog default.')
})

test('the preset editor Get code summary', async ({ page }) => {
  await page.goto(`${site}/editor/preset?page=gallery`)
  await expect(page.getByTestId('preset-preview-status')).toHaveText('Preview ready', { timeout: 60000 })
  await page.getByLabel('Corner radius', { exact: true }).fill('0.3')
  await expect(page.getByTestId('preset-preview-status')).toHaveText('Preview ready', { timeout: 60000 })
  await page.getByRole('button', { name: 'Get code', exact: true }).click()
  await expect(page.getByRole('dialog', { name: 'Get code' }).getByTestId('changes-summary')).toHaveText(/^Changes from the catalog default: /)
})

test('the matrix with reduced transparency', async ({ page }) => {
  const recipe = { ...createCatalogDraft('card').recipe, presetRef: catalogPresetRef('liquid-glass') }
  await seed(page, [[catalogDraftKey('card'), JSON.stringify({ storageVersion: 1, recipe })]])
  await page.goto(`${site}/editor/component/card`)
  await segment(page, 'Preview transparency', 'Reduced').click()
  await segment(page, 'Preview layout', 'Matrix').click()
  const table = matrix(page, 'Card recipe preview')
  await expect(table).toBeVisible({ timeout: 60000 })
  const filters = await table.locator("[data-slot='recipe-card']").evaluateAll((cards) => cards.map((card) => getComputedStyle(card).backdropFilter))
  expect(filters.length).toBeGreaterThan(1)
  expect(new Set(filters)).toEqual(new Set(['none']))
})

test('forced states survive switching between Single and Matrix', async ({ page }) => {
  await page.goto(`${site}/editor/component/button`)
  const preview = frame(page, 'Button recipe preview')
  const single = preview.locator("[data-slot='recipe-button']").first()
  // Hover may change the colour, shadow, filter or offset, depending on the family.
  const look = (element: Element) => { const style = getComputedStyle(element); return [style.backgroundColor, style.color, style.boxShadow, style.filter, style.opacity, style.transform].join(' | ') }
  const background = () => single.evaluate(look)
  await expect(single).toBeVisible({ timeout: 60000 })
  const rest = await background()
  await segment(page, 'Preview state', 'Hover').click()
  await expect.poll(background).not.toBe(rest)
  const hover = await background()
  await segment(page, 'Preview state', 'Rest').click()
  await segment(page, 'Preview layout', 'Matrix').click()
  const table = matrix(page, 'Button recipe preview')
  await expect(table).toBeVisible({ timeout: 60000 })
  // The States row's hover cell is drawn with the hover rules.
  const hoverCell = table.locator(".recipe-matrix-state").filter({ hasText: 'hover' }).locator("[data-slot='recipe-button']")
  expect(await hoverCell.evaluate(look)).toBe(hover)
  await segment(page, 'Preview layout', 'Single').click()
  await expect(table).toHaveCount(0)
  await segment(page, 'Preview state', 'Hover').click()
  await expect.poll(background).toBe(hover)
})

for (const [path, title] of [['badge', 'Badge recipe preview'], ['button', 'Button recipe preview']] as const)
  test(`the ${path} matrix stays still while nothing changes`, async ({ page }) => {
    await page.goto(`${site}/editor/component/${path}`)
    await segment(page, 'Preview layout', 'Matrix').click()
    const root = frame(page, title).locator('[data-layout="matrix"]')
    await expect(root).toBeVisible({ timeout: 60000 })
    await expect(page.getByTestId('matrix-pending')).toHaveCount(0, { timeout: 60000 })
    const first = await root.getAttribute('data-request')
    // No edit, no new render: the matrix is not sent again.
    await page.waitForTimeout(4000)
    expect(await root.getAttribute('data-request')).toBe(first)
  })

test('an edit shows the matrix is recompiling, then the new cells', async ({ page }) => {
  await page.goto(`${site}/editor/component/badge`)
  await segment(page, 'Preview layout', 'Matrix').click()
  const table = matrix(page, 'Badge recipe preview')
  await expect(table).toBeVisible({ timeout: 60000 })
  await expect(page.getByTestId('matrix-pending')).toHaveCount(0, { timeout: 60000 })
  await page.getByLabel('Label', { exact: true }).fill('Recompiled')
  // The previous cells stay in view while the edit compiles, and the status says so.
  await expect(page.getByTestId('matrix-pending')).toBeVisible()
  await expect(table).toBeVisible()
  await expect(page.getByTestId('matrix-pending')).toHaveCount(0, { timeout: 60000 })
  await expect(table.locator("[data-slot='recipe-badge']").first()).toHaveText('Recompiled')
})

test('the Button matrix follows the Rows and Columns the reader chose', async ({ page }) => {
  await page.goto(`${site}/editor/component/button`)
  await segment(page, 'Preview layout', 'Matrix').click()
  const table = matrix(page, 'Button recipe preview')
  await expect(table).toBeVisible({ timeout: 60000 })
  await page.getByLabel('Rows', { exact: true }).selectOption('size')
  await expect(table.locator('caption')).toHaveText('Button variants by size and variant', { timeout: 60000 })
  await expect(table.locator('thead th[scope="col"]')).toHaveCount(7)
  await page.getByLabel('Columns', { exact: true }).selectOption('')
  await expect(table.locator('caption')).toHaveText('Button variants by size', { timeout: 60000 })
  await expect(table.locator('thead')).toHaveCount(0)
  await expect(table).not.toContainText('null')
})
