import { expect, test, type Page } from '@playwright/test'
import { waitForCompiled } from '../helpers/preset-editor-ui.js'

// Phone and tablet structures of both editors: docs/superpowers/specs/2026-11-13-responsive-editors-design.md.
const editors = [
  { name: 'preset editor', url: 'http://127.0.0.1:3000/editor/preset' },
  { name: 'Button editor', url: 'http://127.0.0.1:3000/editor/component/button' },
] as const
const sizes = [
  { width: 320, height: 640 },
  { width: 375, height: 812 },
  { width: 768, height: 1024 },
] as const

/** Console messages that report a hydration mismatch. */
function watchHydration(page: Page) {
  const messages: string[] = []
  page.on('console', message => { if (/hydrat/i.test(message.text())) messages.push(message.text()) })
  return messages
}

async function open(page: Page, url: string) {
  await page.goto(url)
  await waitForCompiled(page, 60000)
}

async function expectFitsViewport(page: Page, width: number) {
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(width)
  // Below 1200px the panes scroll and the document does not.
  expect(await page.evaluate(() => document.scrollingElement!.scrollHeight - innerHeight)).toBeLessThanOrEqual(1)
}

for (const editor of editors) {
  for (const size of sizes) {
    test(`the ${editor.name} fits ${size.width}×${size.height} without the site header`, async ({ page }) => {
      const hydration = watchHydration(page)
      await page.setViewportSize(size)
      await open(page, editor.url)
      await expectFitsViewport(page, size.width)
      await expect(page.locator('header:has(a[href="#main"])')).toBeHidden()
      expect(hydration).toEqual([])
    })
  }

  test(`the ${editor.name} still fits 375px in Liquid glass`, async ({ page }) => {
    // The family is chosen at desktop width, where the picker is always shown; the draft is kept on resize.
    await page.setViewportSize({ width: 1440, height: 900 })
    await open(page, editor.url)
    await page.getByRole('radiogroup', { name: 'Style family', exact: true }).getByRole('radio', { name: /^Liquid glass/ }).click()
    const confirm = page.getByRole('button', { name: 'Confirm change', exact: true })
    if (await confirm.isVisible().catch(() => false)) await confirm.click()
    await waitForCompiled(page, 60000)
    await page.setViewportSize({ width: 375, height: 812 })
    await expectFitsViewport(page, 375)
  })
}

test('the desktop keeps the site header', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 })
  await open(page, editors[0].url)
  await expect(page.locator('header:has(a[href="#main"])')).toBeVisible()
})

for (const editor of editors) {
  test(`the ${editor.name} keeps a compact top bar and a More actions sheet on a phone`, async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 })
    await open(page, editor.url)
    const bar = page.locator('main[data-editor-root] > header').first()
    expect((await bar.boundingBox())!.height).toBeLessThanOrEqual(100)
    await expect(page.getByRole('button', { name: 'Redo', exact: true })).toBeHidden()
    await expect(page.getByRole('button', { name: /^Commands/ })).toBeHidden()
    const more = page.getByRole('button', { name: 'More actions', exact: true })
    expect((await more.boundingBox())!.height).toBeGreaterThanOrEqual(44)
    await more.click()
    const sheet = page.getByRole('dialog', { name: 'More actions' })
    await expect(sheet).toBeVisible()
    const box = (await sheet.boundingBox())!
    expect(Math.abs(box.y + box.height - 812)).toBeLessThanOrEqual(1)
    expect(Math.round(box.width)).toBe(375)
    await expect(sheet.getByRole('button', { name: 'Redo', exact: true })).toBeVisible()
    await page.keyboard.press('Escape')
    await expect(sheet).toBeHidden()
    await expect(more).toBeFocused()
  })
}

test('a long preset name stays inside a 320px top bar', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 640 })
  await open(page, editors[0].url)
  await page.getByLabel('Preset name', { exact: true }).fill('A very long preset name '.repeat(5))
  await expectFitsViewport(page, 320)
})

for (const size of [{ width: 1440, height: 900 }, { width: 375, height: 812 }] as const) {
  test(`the component switcher replaces the component row at ${size.width}px`, async ({ page }) => {
    await page.setViewportSize(size)
    await open(page, editors[1].url)
    await expect(page.locator('[aria-label="Editable components"]')).toHaveCount(0)
    const switcher = page.getByRole('button', { name: 'Component: Button. Choose a component', exact: true })
    await switcher.click()
    const sheet = page.getByRole('dialog', { name: 'Choose a component' })
    await expect(sheet).toBeVisible()
    await expect(sheet.getByRole('link', { name: /^Button/ }).first()).toHaveAttribute('aria-current', 'page')
    await sheet.getByLabel('Search components', { exact: true }).fill('acc')
    const names = await sheet.getByRole('list', { name: 'Components' }).getByRole('link').allTextContents()
    expect(names.length).toBeGreaterThan(0)
    expect(names.every(name => /acc/i.test(name))).toBe(true)
    await expect(sheet.getByRole('link', { name: 'Browse all components', exact: true })).toHaveAttribute('href', '/components')
    await expect(sheet.getByRole('link', { name: 'Component editor guide', exact: true })).toHaveAttribute('href', '/docs/component-editor')
    await page.keyboard.press('Escape')
    await expect(sheet).toBeHidden()
    await expect(switcher).toBeFocused()
    if (size.width < 768) {
      const sheetBox = page.getByRole('link', { name: 'All components', exact: true })
      await expect(sheetBox).toHaveAttribute('href', '/editor/component')
    }
  })
}

test('the pinned specimen shows the Button inside its card on a phone', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await open(page, editors[1].url)
  const button = page.locator('iframe[title="Button recipe preview"]').contentFrame().locator('[data-slot="recipe-button"]')
  await expect(button).toBeVisible({ timeout: 20000 })
  const card = (await page.locator('iframe[title="Button recipe preview"]').locator('xpath=..').boundingBox())!
  const shown = (await button.boundingBox())!
  expect(card.height).toBeLessThanOrEqual(140)
  expect(shown.y).toBeGreaterThanOrEqual(card.y)
  expect(shown.y + shown.height).toBeLessThanOrEqual(card.y + card.height)
})
