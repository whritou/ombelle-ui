import { expect, test } from '@playwright/test'
import { supportedComponentIds, supportedStyleFamilies } from '@ombelle/contracts'
import { createPresetDraft } from '../../apps/www/src/preset-editor/model.js'
import { compileRecipe } from '@ombelle/compiler'

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
    await page.getByLabel('Style family').selectOption(family)
    await expect.poll(() => page.evaluate(() => JSON.parse(localStorage.getItem('ombelle.button-editor.draft')!).recipe.presetRef.id)).toBe('builtin-' + family)
    const saved = await page.evaluate(() => JSON.parse(localStorage.getItem('ombelle.button-editor.draft')!).recipe)
    const compiled = await compileRecipe({ recipe: saved })
    await expect(page.getByTestId('recipe-hash')).toHaveText(compiled.recipe.hash)
    for (const mode of ['light', 'dark']) {
      await page.getByLabel('Preview mode').selectOption(mode)
      await expect(recipeButton).toBeVisible()
      await expect(recipeButton).toHaveAttribute('data-ombelle-recipe', compiled.scope)
      await expect(recipeFrame.contentFrame().locator('.editor-preview')).toHaveClass(mode === 'dark' ? 'editor-preview dark' : 'editor-preview')
      expect(await recipeButton.evaluate(element => getComputedStyle(element).backgroundColor)).not.toBe('rgba(0, 0, 0, 0)')
    }
  }
  await expect(page.getByRole('button', { name: 'Download recipe JSON', exact: true })).toBeEnabled()
  for (const family of supportedStyleFamilies) {
    await page.evaluate(draft => {
      localStorage.setItem('ombelle:preset-editor:draft:v1', JSON.stringify(draft))
      localStorage.removeItem('ombelle:preset-editor:history:v1')
    }, createPresetDraft(family))
    await page.goto('/editor/preset')
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
