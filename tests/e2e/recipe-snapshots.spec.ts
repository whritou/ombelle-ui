import { expect, test } from '@playwright/test'
import fs from 'node:fs/promises'
import { randomUUID } from 'node:crypto'
import { getCatalog } from '@ombelle/catalog'
import { canonicalize, compileRecipe } from '@ombelle/compiler'
import { supportedStyleFamilies, type RecipeSnapshot } from '@ombelle/contracts'
import { createEditorDraft } from '../../apps/www/src/editor/model.js'
import { withEditorPresetConsumer } from '../helpers/editor-preset-consumer.js'
import { recipeStyles } from '../helpers/recipe-measurements.js'
import { resetSnapshotBrowserQuota } from '../helpers/snapshot-browser.js'
const url = 'http://127.0.0.1:3000/editor/component/button'
// The local service shares one development rate bucket (5 publications per
// minute) across every test and worker.
test.beforeEach(async () => resetSnapshotBrowserQuota())
test('publishes a recipe only after consent and opens a read-only share page without changing the draft', async ({ page }) => {
  let posts = 0
  page.on('request', request => { if (request.method() === 'POST' && request.url().endsWith('/api/v1/recipes')) posts++ })
  await page.goto(url)
  await expect(page.getByRole('button', { name: 'Download recipe JSON', exact: true })).toBeEnabled()
  expect(posts).toBe(0)
  await page.getByRole('button', { name: 'Publish recipe…', exact: true }).click()
  const submit = page.getByRole('button', { name: 'Publish public snapshot', exact: true })
  await expect(submit).toBeDisabled()
  await page.getByLabel('I understand this recipe will be public and retained as described above.').check()
  await submit.click()
  const link = page.locator('a[href^="/recipes/rc_"]')
  await expect(link).toHaveText(/^rc_[a-f0-9]{32}@1$/)
  expect(posts).toBe(1)
  const before = await page.evaluate(() => localStorage.getItem('ombelle.button-editor.draft'))
  await link.click()
  await expect(page.getByRole('heading', { name: 'Published Button recipe', exact: true })).toBeVisible()
  await expect(page.locator('iframe[title="Button recipe preview"]').contentFrame().locator('[data-slot="recipe-button"]')).toBeVisible()
  await expect(page.getByLabel('Install command', { exact: true })).toHaveValue(/add --recipe rc_[a-f0-9]{32}@1/)
  expect(await page.evaluate(() => localStorage.getItem('ombelle.button-editor.draft'))).toBe(before)
  await page.evaluate(() => Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText: async () => { throw new DOMException('Denied', 'NotAllowedError') } } }))
  await page.getByRole('button', { name: 'Copy install command', exact: true }).click()
  await expect(page.getByRole('status')).toHaveText(/Copy unavailable/)
  const downloading = page.waitForEvent('download')
  await page.getByRole('button', { name: 'Download recipe JSON', exact: true }).click()
  const download = await downloading
  expect(download.suggestedFilename()).toBe('button.recipe.json')
  const bytes = await fs.readFile((await download.path())!, 'utf8')
  expect(JSON.parse(bytes)).toMatchObject({ schemaVersion: '1.0', component: 'button' })
  await page.setViewportSize({ width: 320, height: 800 })
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(321)
})
test('keeps local exports usable when recipe publication is unavailable', async ({ page }) => {
  await page.route('**/api/v1/recipes', route => route.fulfill({ status: 503, body: '{}' }))
  await page.goto(url)
  await expect(page.getByRole('button', { name: 'Publish recipe…', exact: true })).toBeEnabled()
  await page.getByRole('button', { name: 'Publish recipe…', exact: true }).click()
  await page.getByLabel('I understand this recipe will be public and retained as described above.').check()
  await page.getByRole('button', { name: 'Publish public snapshot', exact: true }).click()
  await expect(page.getByRole('alert').filter({ hasText: /unavailable|could not/i })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Download recipe JSON', exact: true })).toBeEnabled()
})

test('recovers a lost recipe publication after refresh and explicitly retries the original intent', async ({ page }) => {
  const keys: string[] = []
  let firstCode = ''
  await page.route('**/api/v1/recipes', async route => {
    keys.push(route.request().headers()['idempotency-key'])
    if (keys.length === 1) {
      const response = await route.fetch()
      const snapshot = await response.json() as RecipeSnapshot
      firstCode = snapshot.id + '@1'
      await route.abort()
    } else await route.continue()
  })
  await page.goto(url)
  await expect(page.getByRole('button', { name: 'Publish recipe…', exact: true })).toBeEnabled()
  await page.getByRole('button', { name: 'Publish recipe…', exact: true }).click()
  await page.getByLabel('I understand this recipe will be public and retained as described above.').check()
  await page.getByRole('button', { name: 'Publish public snapshot', exact: true }).click()
  await expect(page.getByRole('alert').filter({ hasText: /could not|unavailable/i })).toBeVisible()
  await page.reload()
  await expect(page.getByRole('alert').filter({ hasText: /recovered/i })).toBeVisible()
  expect(keys).toHaveLength(1)
  await page.getByLabel('I understand this recipe will be public and retained as described above.').check()
  await page.getByRole('button', { name: 'Retry publication', exact: true }).click()
  await expect(page.locator('a[href^="/recipes/rc_"]')).toHaveText(firstCode)
  expect(keys).toHaveLength(2); expect(keys[1]).toBe(keys[0])
})

test('can cancel a pending recipe publication without accepting its delayed result', async ({ page }) => {
  let release!: () => void
  const gate = new Promise<void>(resolve => { release = resolve })
  await page.route('**/api/v1/recipes', async route => {
    await gate
    try { await route.fulfill({ status: 503, body: '{}' }) } catch { /* Cancelled transport is expected. */ }
  })
  try {
    await page.goto(url)
    await expect(page.getByRole('button', { name: 'Publish recipe…', exact: true })).toBeEnabled()
    await page.getByRole('button', { name: 'Publish recipe…', exact: true }).click()
    await page.getByLabel('I understand this recipe will be public and retained as described above.').check()
    await page.getByRole('button', { name: 'Publish public snapshot', exact: true }).click()
    const cancel = page.getByRole('button', { name: 'Cancel publication', exact: true })
    await expect(cancel).toBeEnabled({ timeout: 3000 })
    await cancel.click(); release()
    await expect(page.getByRole('button', { name: 'Publish recipe…', exact: true })).toBeEnabled()
    expect(await page.locator('a[href^="/recipes/rc_"]').count()).toBe(0)
  } finally { release() }
})

for (const family of supportedStyleFamilies) test(`published ${family} recipe matches installed Vite and Next Buttons in both modes without changing host defaults`, async ({ page, context }) => {
  test.setTimeout(360_000)
  const recipe = { ...createEditorDraft(family).recipe, id: 'published_' + family, content: 'Shared <Button> & styles', overrides: { radiusRem: 1.25, minHeightPx: 48 } }
  const published = await page.request.post('http://127.0.0.1:3000/api/v1/recipes', { headers: { Origin: 'http://127.0.0.1:3000', 'Idempotency-Key': randomUUID() }, data: { recipe } })
  expect(published.status()).toBe(201)
  const snapshot = await published.json() as RecipeSnapshot
  const compiled = await compileRecipe({ recipe: snapshot.recipe })
  expect(compiled.recipe.hash).toBe(snapshot.recipeHash)
  await page.goto(`http://127.0.0.1:3000/recipes/${snapshot.id}/1`)
  const preview = page.locator('iframe[title="Button recipe preview"]').contentFrame()
  const previewButton = preview.locator('[data-slot="recipe-button"]')
  await expect(previewButton).toHaveText(recipe.content)
  const hostFamily = family === 'flat' ? 'minimalist' : 'flat'
  for (const framework of ['vite', 'next'] as const) {
    await withEditorPresetConsumer({ framework, family: hostFamily, presetJson: canonicalize(getCatalog('0.1.0').presets[hostFamily]), recipeSnapshot: { snapshot, origin: 'http://127.0.0.1:3000' } }, async consumer => {
      const installed = await context.newPage()
      try {
        for (const mode of ['light', 'dark']) {
          await page.getByLabel('Preview mode').selectOption(mode)
          await expect(preview.locator('.editor-preview')).toHaveClass(mode === 'dark' ? 'editor-preview dark' : 'editor-preview')
          await installed.goto(consumer.url)
          await installed.evaluate(dark => document.documentElement.classList.toggle('dark', dark), mode === 'dark')
          const button = installed.getByTestId('published-recipe-button')
          await expect(button).toHaveText(recipe.content)
          expect(await recipeStyles(button)).toEqual(await recipeStyles(previewButton))
          expect(await button.evaluate(element => ({ tag: element.tagName, type: element.getAttribute('type'), scope: element.getAttribute('data-ombelle-recipe'), variant: element.getAttribute('data-variant'), size: element.getAttribute('data-size') }))).toEqual(await previewButton.evaluate(element => ({ tag: element.tagName, type: element.getAttribute('type'), scope: element.getAttribute('data-ombelle-recipe'), variant: element.getAttribute('data-variant'), size: element.getAttribute('data-size') })))
        }
      } finally { await installed.close() }
    })
  }
})
