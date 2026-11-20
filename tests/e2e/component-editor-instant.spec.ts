import { expect, test, type Page } from '@playwright/test'
import { compileComponentRecipe, compileRecipe } from '@ombelle/compiler'
import { styleSupport, type ComponentRecipe } from '@ombelle/contracts'
import { catalogDraftKey } from '../../apps/www/src/editor/catalog-draft.js'
import { DRAFT_STORAGE_KEY } from '../../apps/www/src/editor/storage.js'
import { defaultButtonRecipe, defaultCatalogRecipe, precompiledFamilies } from '../../apps/www/src/editor/precompiled-defaults.js'

// The component editor's preview shows the default recipe it was built with before the compiler worker answers;
// the first compile and every edit then go through the verified render path as before. Run against a server
// that serves the built preview or the Vite preview (pnpm build:packages and pnpm generate:preview first).
const origin = 'http://127.0.0.1:3000'
const status = (page: Page) => page.getByLabel('Live preview').locator('[data-status]')
const frame = (page: Page, name: string) => page.locator(`iframe[title="${name} recipe preview"]`).contentFrame()

/** Stops the compiler worker from ever answering; returns how many times it was requested. */
async function blockWorker(page: Page) {
  let requested = 0
  await page.route('**/editor-compiler.worker.js*', () => { requested++ })
  return () => requested
}

async function storeDraft(page: Page, key: string, value: unknown) {
  await page.addInitScript(([storageKey, text]) => localStorage.setItem(storageKey, text), [key, JSON.stringify(value)] as const)
}

test.describe('before the first compile, in each precompiled family', () => {
  for (const family of precompiledFamilies) {
    test(`the Button preview shows the ${family} default`, async ({ page }) => {
      const requested = await blockWorker(page)
      const recipe = defaultButtonRecipe(family)
      await storeDraft(page, DRAFT_STORAGE_KEY, { storageVersion: 1, recipe })
      const expected = await compileRecipe({ recipe })
      await page.goto(`${origin}/editor/component/button`)
      const specimen = frame(page, 'Button').locator('[data-slot="recipe-button"]')
      await expect(specimen).toHaveAttribute('data-ombelle-recipe', expected.scope)
      await expect(specimen).toHaveText(recipe.content)
      // The worker never answered: the editor still waits for its first compile.
      expect(requested()).toBeGreaterThan(0)
      await expect(status(page)).toHaveText('Compiling preview…')
    })

    for (const component of ['badge', 'card'] as const satisfies ComponentRecipe['component'][]) {
      if (styleSupport(component, family) === 'unavailable') continue
      test(`the ${component} preview shows the ${family} default`, async ({ page }) => {
        await blockWorker(page)
        const recipe = defaultCatalogRecipe(component, family)
        await storeDraft(page, catalogDraftKey(component), { storageVersion: 1, recipe })
        const expected = await compileComponentRecipe({ recipe })
        const name = component[0]!.toUpperCase() + component.slice(1)
        await page.goto(`${origin}/editor/component/${component}`)
        const stage = frame(page, name).locator(`.recipe-stage[data-component="${component}"]`)
        await expect(stage).toHaveAttribute('data-ombelle-recipe', expected.scope)
        await expect(stage.locator(`[data-slot="recipe-${component}"]`).first()).toBeVisible()
        await expect(status(page)).toHaveText('Compiling preview…')
      })
    }
  }
})

test('a restored draft that is not a default waits for its own compile', async ({ page }) => {
  await blockWorker(page)
  const recipe = { ...defaultCatalogRecipe('badge', 'ombelle'), content: { label: 'Restored edit' } } as ComponentRecipe
  await storeDraft(page, catalogDraftKey('badge'), { storageVersion: 1, recipe })
  await page.goto(`${origin}/editor/component/badge`)
  const iframe = page.locator('iframe[title="Badge recipe preview"]')
  await expect(iframe).not.toHaveAttribute('src', /default=/)
  await expect(page.getByLabel('Label', { exact: true })).toHaveValue('Restored edit')
  // The preview has loaded and announced itself, and still shows nothing until a compile arrives.
  await expect(iframe.contentFrame().locator('.editor-preview')).toBeAttached()
  await page.waitForTimeout(1500)
  await expect(iframe.contentFrame().locator('[data-ombelle-recipe]')).toHaveCount(0)
})

test('the first compile keeps the default and the first edit replaces it', async ({ page }) => {
  const recipe = defaultCatalogRecipe('badge', 'ombelle')
  const expected = await compileComponentRecipe({ recipe })
  await page.goto(`${origin}/editor/component/badge`)
  const specimen = frame(page, 'Badge').locator('[data-slot="recipe-badge"]')
  const stage = frame(page, 'Badge').locator('.recipe-stage')
  await expect(stage).toHaveAttribute('data-ombelle-recipe', expected.scope)
  // The worker's compile of the same recipe is verified and applied over the default without a change.
  await expect(status(page)).toHaveText('Matches current recipe', { timeout: 30000 })
  await expect(stage).toHaveAttribute('data-ombelle-recipe', expected.scope)
  await page.getByLabel('Label', { exact: true }).fill('First edit')
  await expect(specimen).toHaveText('First edit')
  await expect(status(page)).toHaveText('Matches current recipe', { timeout: 30000 })
  await expect(stage).not.toHaveAttribute('data-ombelle-recipe', expected.scope)
})

test('the Button default gives way to the first edit', async ({ page }) => {
  const expected = await compileRecipe({ recipe: defaultButtonRecipe('ombelle') })
  await page.goto(`${origin}/editor/component/button`)
  const specimen = frame(page, 'Button').locator('[data-slot="recipe-button"]')
  await expect(specimen).toHaveAttribute('data-ombelle-recipe', expected.scope)
  await page.getByLabel('Button text').fill('Ship release')
  await expect(specimen).toHaveText('Ship release')
  await expect(specimen).not.toHaveAttribute('data-ombelle-recipe', expected.scope)
})

test('a family chosen during draft recovery names no default for the new draft', async ({ page }) => {
  await blockWorker(page)
  await page.addInitScript((key) => localStorage.setItem(key, '{"storageVersion":1,"recipe":'), catalogDraftKey('badge'))
  await page.goto(`${origin}/editor/component/badge`)
  await expect(page.getByRole('heading', { name: 'Your saved draft needs recovery' })).toBeVisible()
  // The inspector is hidden during recovery; the command palette still switches the family.
  await page.getByRole('button', { name: /Commands/ }).click()
  await page.getByRole('dialog', { name: 'Editor commands' }).getByRole('option', { name: 'Switch to Papier' }).click()
  await page.getByRole('button', { name: 'Start new draft', exact: true }).click()
  const iframe = page.locator('iframe[title="Badge recipe preview"]')
  await expect(iframe).toHaveAttribute('src', /component=badge/)
  await expect(iframe).not.toHaveAttribute('src', /default=/)
  await expect(iframe.contentFrame().locator('.editor-preview')).toBeAttached()
  await page.waitForTimeout(1500)
  await expect(iframe.contentFrame().locator('[data-ombelle-recipe]')).toHaveCount(0)
})

test('the preview keeps its URL when an edit leaves the default', async ({ page }) => {
  await page.goto(`${origin}/editor/component/badge`)
  const iframe = page.locator('iframe[title="Badge recipe preview"]')
  await expect(iframe.contentFrame().locator('.recipe-stage')).toBeAttached()
  const src = await iframe.getAttribute('src')
  expect(src).toContain('default=ombelle')
  await page.getByRole('radiogroup', { name: 'Style family', exact: true }).getByRole('radio', { name: /^Papier/ }).click()
  await expect(status(page)).toHaveText('Matches current recipe', { timeout: 30000 })
  await expect(iframe).toHaveAttribute('src', src!)
})
