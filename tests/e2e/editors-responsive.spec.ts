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
