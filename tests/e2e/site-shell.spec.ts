import { expect, test } from '@playwright/test'

// The website's own shell on the 0.9 components (docs/superpowers/plans/2026-11-17-app-shell-09-site.md).
const site = 'http://127.0.0.1:3000'

test('the docs sidebar marks the current page', async ({ page }) => {
  await page.goto(`${site}/docs/installation`)
  const nav = page.getByRole('navigation', { name: 'Documentation' })
  await expect(nav.getByRole('link', { name: 'Installation and CLI' })).toHaveAttribute('aria-current', 'page')
  await expect(nav.getByRole('link', { name: 'Style families' })).not.toHaveAttribute('aria-current', /.+/)
})

test.describe('phones without JavaScript', () => {
  test.use({ javaScriptEnabled: false, viewport: { width: 375, height: 800 } })
  test('the docs links render inline and navigate', async ({ page }) => {
    await page.goto(`${site}/docs`)
    const link = page.getByRole('navigation', { name: 'Documentation' }).getByRole('link', { name: 'Style families' })
    await expect(link).toBeVisible()
    await link.click()
    await expect(page).toHaveURL(/\/docs\/style-families$/)
  })
})

test.describe('phones', () => {
  test.use({ viewport: { width: 375, height: 800 } })
  test('from a deep link, the sidebar sheet opens, and following a link closes it and loads the page', async ({ page }) => {
    await page.goto(`${site}/docs/getting-started`)
    // The trigger opens the sheet once the page has hydrated.
    await expect(page.locator('[data-slot="sidebar-wrapper"][data-hydrated]')).toBeAttached()
    await page.getByRole('button', { name: 'Documentation', exact: true }).click()
    const sheet = page.getByRole('dialog', { name: 'Documentation' })
    await expect(sheet).toBeVisible()
    await sheet.getByRole('link', { name: 'Global presets' }).click()
    await expect(page).toHaveURL(/\/docs\/presets$/)
    await expect(page.getByRole('dialog', { name: 'Documentation' })).toBeHidden()
    await expect(page.getByRole('heading', { level: 1, name: 'Global presets' })).toBeVisible()
  })

  test('guide text keeps the page within 375 px', async ({ page }) => {
    await page.goto(`${site}/docs/getting-started`)
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(375)
  })
})

test('the components sidebar lists every component and marks the current one', async ({ page }) => {
  await page.goto(`${site}/components/sidebar`)
  const nav = page.getByRole('navigation', { name: 'Components' })
  await expect(nav.getByRole('link', { name: 'Sidebar', exact: true })).toHaveAttribute('aria-current', 'page')
  // Grouped by category, alphabetical inside each group.
  await expect(nav.locator('a[href^="/components/"]')).toHaveCount(63)
  await expect(nav.getByRole('group', { name: 'Navigation' }).getByRole('link')).toHaveText(['Breadcrumb', 'Command', 'Menubar', 'Navigation Menu', 'Pagination', 'Sidebar', 'Stepper', 'Tabs'])
})
