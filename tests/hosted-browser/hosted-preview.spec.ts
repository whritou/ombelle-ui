import { expect, test } from '@playwright/test'
import { supportedComponentIds, supportedStyleFamilies } from '@ombelle/contracts'
import { createPresetDraft } from '../../apps/www/src/preset-editor/model.js'
import { compileRecipe } from '@ombelle/compiler'
import { chooseFamily, expectRecipeDownloadEnabled, segment } from '../helpers/button-editor-ui.js'

test('serves both nested runtime entries, modules and compiler workers with usable MIME types', async ({ request }) => {
  for (const kind of ['editor', 'preset']) {
    const response = await request.get(`/ombelle-preview/${kind}-preview/`)
    expect(response.status()).toBe(200)
    expect(response.headers()['content-type']).toMatch(/text\/html/)
    const html = await response.text()
    const scripts = [...html.matchAll(/<script\b[^>]*src="([^"]+)"/g)]
    expect(scripts.length).toBeGreaterThan(0)
    for (const [, url] of scripts) {
      const module = await request.get(url)
      expect(module.status()).toBe(200)
      expect(module.headers()['content-type']).toMatch(/(?:java|ecma)script/)
      expect(module.headers()['access-control-allow-origin']).toBe('*')
      expect(await module.text()).not.toMatch(/<!doctype/i)
    }
    const worker = await request.get(`/${kind}-compiler.worker.js`)
    expect(worker.status()).toBe(200)
    expect(worker.headers()['content-type']).toMatch(/(?:java|ecma)script/)
    expect(await worker.text()).toContain('onmessage')
  }
})

test('previews the lab materials from the component directory and Button editor', async ({ page }) => {
  await page.goto('/components')
  await page.getByLabel('Glass preview preset').selectOption({ label: 'Relief' })
  await page.locator('a[href="/components/card?glass=builtin-liquid-glass-relief"]').click()
  const picker = page.getByLabel('Glass preview preset')
  await expect(picker).toHaveValue('builtin-liquid-glass-relief')
  const preview = page.frameLocator('iframe[title="Card preview"]')
  await expect(preview.locator('html')).toHaveAttribute('data-glass-backdrop', 'peach')
  const card = preview.locator('[data-slot="card"]').first()
  await expect.poll(() => card.evaluate((el) => getComputedStyle(el).getPropertyValue('--glass-depth').trim())).toBe('0.9')
  await picker.selectOption({ label: 'Givré' })
  await expect.poll(() => card.evaluate((el) => getComputedStyle(el).getPropertyValue('--glass-blur').trim())).toBe('26px')

  await page.goto('/editor/component/button')
  await chooseFamily(page, 'liquid-glass')
  const buttonPreset = page.getByRole('combobox', { name: 'Glass preset', exact: true })
  await expect(buttonPreset).toHaveValue('builtin-liquid-glass-cristal')
  const recipe = page.frameLocator('iframe[title="Button recipe preview"]')
  const button = recipe.locator('[data-slot="recipe-button"]')
  await expect.poll(() => button.evaluate((el) => getComputedStyle(el).getPropertyValue('--glass-blur').trim())).toBe('9px')
  await buttonPreset.selectOption({ label: 'Relief' })
  await expect(recipe.locator('html')).toHaveAttribute('data-glass-backdrop', 'peach')
  await expect.poll(() => button.evaluate((el) => getComputedStyle(el).getPropertyValue('--glass-depth').trim())).toBe('0.9')
  await button.hover()
  await expect(button).toHaveAttribute('data-halo-active', '')

  await page.goto('/editor/preset?page=gallery')
  await page.getByRole('group', { name: 'Style family', exact: true }).getByRole('button', { name: /^Liquid glass/ }).click()
  await page.getByRole('button', { name: 'Confirm change' }).click()
  await expect(page.getByRole('button', { name: 'Cristal (default)', exact: true })).toHaveAttribute('aria-pressed', 'true')
  const readout = page.locator('#glass-contrast-readout')
  await expect(readout).toContainText('Contrast bound passes at glass opacity 0.4')
  await page.getByRole('button', { name: 'Relief', exact: true }).click()
  await expect(readout).toContainText('Contrast bound passes at glass opacity 0.39')
  const gallery = page.frameLocator('iframe[title="Global preset gallery"]')
  await expect(gallery.locator('html')).toHaveAttribute('data-glass-backdrop', 'peach')
})

test('compiles and renders all families and modes through hosted opaque iframes with no preview server', async ({ page }) => {
  const failures: string[] = []
  page.on('requestfailed', request => { if (request.url().includes('/ombelle-preview/')) failures.push(request.url()) })
  page.on('response', response => { if (response.url().includes('/ombelle-preview/') && response.status() >= 400) failures.push(response.url()) })
  page.on('request', request => { expect(request.url()).not.toContain('127.0.0.1:4173') })
  await page.goto('/editor/component/button')
  const recipeFrame = page.locator('iframe[title="Button recipe preview"]')
  await expect(recipeFrame).toHaveAttribute('src', '/ombelle-preview/editor-preview/')
  await expect(recipeFrame).toHaveAttribute('sandbox', 'allow-scripts')
  const recipeButton = recipeFrame.contentFrame().locator('[data-slot="recipe-button"]')
  for (const family of supportedStyleFamilies) {
    await chooseFamily(page, family)
    await expect.poll(() => page.evaluate(() => JSON.parse(localStorage.getItem('ombelle.button-editor.draft')!).recipe.presetRef.id)).toBe('builtin-' + family)
    const saved = await page.evaluate(() => JSON.parse(localStorage.getItem('ombelle.button-editor.draft')!).recipe)
    const compiled = await compileRecipe({ recipe: saved })
    await expect(page.getByTestId('recipe-hash')).toHaveText(compiled.recipe.hash)
    for (const mode of ['light', 'dark']) {
      await segment(page, 'Preview mode', mode === 'dark' ? 'Dark' : 'Light').click()
      await expect(recipeButton).toBeVisible()
      await expect(recipeButton).toHaveAttribute('data-ombelle-recipe', compiled.scope)
      await expect(recipeFrame.contentFrame().locator('.editor-preview')).toHaveClass(mode === 'dark' ? 'editor-preview dark' : 'editor-preview')
      expect(await recipeButton.evaluate(element => getComputedStyle(element).backgroundColor)).not.toBe('rgba(0, 0, 0, 0)')
    }
  }
  await expectRecipeDownloadEnabled(page)
  for (const family of supportedStyleFamilies) {
    await page.evaluate(draft => {
      localStorage.setItem('ombelle:preset-editor:draft:v1', JSON.stringify(draft))
      localStorage.removeItem('ombelle:preset-editor:history:v1')
    }, createPresetDraft(family))
    await page.goto('/editor/preset?page=gallery')
    const galleryFrame = page.locator('iframe[title="Global preset gallery"]')
    await expect(galleryFrame).toHaveAttribute('src', '/ombelle-preview/preset-preview/')
    await expect(galleryFrame).toHaveAttribute('sandbox', 'allow-scripts')
    for (const mode of ['light', 'dark']) {
      await page.getByRole('group', { name: 'Preview mode', exact: true }).getByRole('button', { name: mode === 'dark' ? 'Dark' : 'Light', exact: true }).click()
      await expect(page.getByTestId('preset-preview-status')).toHaveText('Preview ready')
      await expect(galleryFrame.contentFrame().locator('html')).toHaveClass(mode === 'dark' ? 'dark' : '')
      for (const id of supportedComponentIds)
        await expect(galleryFrame.contentFrame().locator(`[data-component="${id}"]`)).toBeVisible()
    }
  }
  expect(failures).toEqual([])
})
