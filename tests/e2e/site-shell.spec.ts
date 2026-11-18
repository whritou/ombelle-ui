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

test.describe('header', () => {
  test.use({ viewport: { width: 1280, height: 900 } })
  test('panels open by click and by keyboard, and Escape closes them', async ({ page }) => {
    await page.goto(`${site}/`)
    const header = page.getByRole('navigation', { name: 'Primary' })
    await expect(page.locator('[data-slot="navigation-menu"]')).toBeVisible()
    await header.getByRole('button', { name: 'Docs' }).click()
    await expect(page.getByRole('link', { name: /Installation and CLI/ })).toBeVisible()
    await page.keyboard.press('Escape')
    await expect(page.getByRole('link', { name: /Installation and CLI/ })).toBeHidden()
    await header.getByRole('button', { name: 'Components' }).focus()
    await page.keyboard.press('Enter')
    await expect(page.getByRole('link', { name: /All components/ })).toBeVisible()
  })

  test('marks the current section', async ({ page }) => {
    await page.goto(`${site}/docs/presets`)
    const header = page.getByRole('navigation', { name: 'Primary' })
    await expect(header.getByRole('button', { name: 'Docs' })).toHaveAttribute('data-current', '')
    await expect(header.getByRole('button', { name: 'Components' })).not.toHaveAttribute('data-current', /.*/)
  })

  test('is not pinned on editor pages, and is hidden there below 1200 px', async ({ page }) => {
    await page.goto(`${site}/editor/preset`)
    await expect(page.locator('header').first()).toHaveCSS('position', 'relative')
    await page.setViewportSize({ width: 1100, height: 900 })
    await expect(page.locator('header').first()).toBeHidden()
  })
})

for (const width of [375, 1440]) {
  test.describe(`${width} px without JavaScript`, () => {
    test.use({ javaScriptEnabled: false, viewport: { width, height: 900 } })
    test('Docs and Components are reachable through plain links on the home page', async ({ page }) => {
      await page.goto(`${site}/`)
      for (const href of ['/docs', '/components']) await expect(page.locator(`footer a[href="${href}"]`)).toBeVisible()
      await page.locator('footer a[href="/docs"]').click()
      await expect(page).toHaveURL(/\/docs$/)
    })
  })
}
