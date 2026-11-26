import { expect, test, type Page } from '@playwright/test'

// The blocks gallery and one block page (docs/internal/superpowers/specs/2026-11-25-blocks-design.md, "Website").
// Run pnpm build:packages and pnpm generate:preview first.
const site = 'http://127.0.0.1:3000'

/** Records clipboard writes in window.__copied instead of the system clipboard. */
const stubClipboard = (page: Page) =>
  page.addInitScript(() => {
    const copied: string[] = []
    Object.assign(window, { __copied: copied })
    Object.defineProperty(Navigator.prototype, 'clipboard', {
      configurable: true,
      get: () => ({ writeText: (text: string) => { copied.push(text); return Promise.resolve() } }),
    })
  })
const copied = (page: Page) => page.evaluate(() => (window as unknown as { __copied: string[] }).__copied)

test('the header links to the blocks, and the gallery shows one card per block', async ({ page }) => {
  await page.goto(`${site}/`)
  await expect(page.getByRole('navigation', { name: 'Primary' }).getByRole('link', { name: 'Blocks', exact: true })).toHaveAttribute('href', '/blocks')
  await page.goto(`${site}/blocks`)
  await expect(page.getByRole('heading', { level: 1, name: 'Blocks' })).toBeVisible()
  const cards = page.getByRole('main').getByRole('article')
  await expect(cards).toHaveCount(4)
  for (const [index, title] of ['Sign in', 'Account settings', 'Pricing', 'Dashboard overview'].entries())
    await expect(cards.nth(index).getByRole('link', { name: title })).toBeVisible()
  await expect(cards.first().getByRole('listitem').filter({ hasText: 'password-field' })).toHaveCount(1)
  await expect(cards.first().locator('iframe')).toHaveAttribute('src', /block=login-01&family=ombelle/)
})

test.describe('a block page', () => {
  test('loads the block stylesheet from the site, not from the preview app', async ({ page }) => {
    // In this config the site (port 3000) frames the preview app (port 4173): the stylesheet must come from the site.
    const requested: string[] = []
    page.on('request', (request) => { if (request.url().includes('/blocks/login-01.css')) requested.push(request.url()) })
    await page.goto(`${site}/blocks/login-01`)
    const inside = page.frameLocator('iframe[data-block-preview]')
    await expect(inside.locator('[data-block="login-01"]')).toBeVisible({ timeout: 60000 })
    expect(requested).toEqual([`${site}/previews/ombelle/blocks/login-01.css`])
    await expect(inside.locator('link[data-block-styles]')).toHaveAttribute('href', `${site}/previews/ombelle/blocks/login-01.css`)
  })

  test('switches the preview family and width', async ({ page }) => {
    await page.goto(`${site}/blocks/login-01`)
    await expect(page.getByRole('heading', { level: 1, name: 'Sign in' })).toBeVisible()
    const frame = page.locator('iframe[data-block-preview]')
    await expect(frame).toHaveAttribute('title', 'Sign in block, Ombelle')
    const styles = page.frameLocator('iframe[data-block-preview]').locator('link[data-block-styles]')
    await expect(styles).toHaveAttribute('href', /\/previews\/ombelle\/blocks\/login-01\.css$/, { timeout: 60000 })
    await expect(page.frameLocator('iframe[data-block-preview]').locator('[data-block="login-01"]')).toBeVisible()

    // A click before hydration does nothing, so retry until the family switches.
    await expect(async () => {
      await page.getByRole('group', { name: 'Style family' }).getByRole('button', { name: /Papier/ }).click()
      await expect(frame).toHaveAttribute('title', 'Sign in block, Papier', { timeout: 1000 })
    }).toPass()
    await expect(styles).toHaveAttribute('href', /\/previews\/papier\/blocks\/login-01\.css$/, { timeout: 30000 })

    const width = () => frame.evaluate(element => Math.round(element.getBoundingClientRect().width))
    const widths = page.getByRole('group', { name: 'Preview width' })
    await widths.getByRole('button', { name: /375/ }).click()
    await expect.poll(width).toBe(375)
    await widths.getByRole('button', { name: /768/ }).click()
    await expect.poll(width).toBe(768)
    await widths.getByRole('button', { name: /Desktop/ }).click()
    await expect.poll(width).toBeGreaterThan(768)
  })

  test('sizes the frame to the whole block, even the dashboard at 375 px', async ({ page }) => {
    await page.goto(`${site}/blocks/dashboard-01`)
    const frame = page.locator('iframe[data-block-preview]')
    const content = page.frameLocator('iframe[data-block-preview]').locator('main[data-block-preview-page]')
    await expect(content.locator('[data-block="dashboard-01"]')).toBeVisible({ timeout: 60000 })
    await expect(async () => {
      await page.getByRole('group', { name: 'Preview width' }).getByRole('button', { name: /375/ }).click()
      await expect.poll(() => frame.evaluate(element => Math.round(element.getBoundingClientRect().width)), { timeout: 1000 }).toBe(375)
    }).toPass()
    const tall = () => content.evaluate(element => Math.ceil(element.getBoundingClientRect().height))
    await expect.poll(async () => (await frame.evaluate(element => element.clientHeight)) - (await tall())).toBeGreaterThanOrEqual(0)
  })

  test('shows the block source in the Code tab', async ({ page }) => {
    await page.goto(`${site}/blocks/login-01`)
    await expect(async () => {
      await page.getByRole('tab', { name: 'Code' }).click()
      await expect(page.getByRole('tab', { name: 'Code' })).toHaveAttribute('aria-selected', 'true', { timeout: 1000 })
    }).toPass()
    const code = page.getByRole('tabpanel', { name: 'Code' })
    await expect(code.getByText('components/blocks/login-01.tsx', { exact: true })).toBeVisible()
    await expect(code.getByText('components/blocks/login-01.css', { exact: true })).toBeVisible()
    await expect(code).toContainText('export function Login01()')
    await expect(code).toContainText("[data-block='login-01']")
  })

  test('shows the install command for the published CLI, and Copy copies it', async ({ page }) => {
    await stubClipboard(page)
    await page.goto(`${site}/blocks/login-01`)
    const tabs = page.getByRole('tablist', { name: 'Package manager' })
    await expect(async () => {
      await tabs.getByRole('tab', { name: 'npm', exact: true }).click()
      await expect(page.getByRole('tabpanel', { name: 'npm', exact: true })).toHaveText('npx @ombelle-ui/cli@1.1.0 add login-01', { timeout: 1000 })
    }).toPass()
    await page.getByRole('button', { name: 'Copy command' }).click()
    await expect.poll(() => copied(page)).toEqual(['npx @ombelle-ui/cli@1.1.0 add login-01'])
    const installs = page.getByRole('list', { name: 'Components it installs' })
    await expect(installs.getByRole('link', { name: 'Password Field' })).toHaveAttribute('href', '/components/password-field')
    await expect(page.getByRole('list', { name: 'Example only' })).toContainText('sign-in submit')
  })

  test('labels liquid glass as accessibility not guaranteed', async ({ page }) => {
    await page.goto(`${site}/blocks/login-01`)
    const glass = page.getByRole('group', { name: 'Style family' }).getByRole('button', { name: /Liquid Glass/ })
    await expect(glass).toContainText(/accessibility not guaranteed/i)
    await expect(async () => {
      await glass.click()
      await expect(page.locator('iframe[data-block-preview]')).toHaveAttribute('title', 'Sign in block, Liquid Glass', { timeout: 1000 })
    }).toPass()
    await expect(page.getByText(/Liquid glass: accessibility not guaranteed/)).toBeVisible()
    await expect(page.frameLocator('iframe[data-block-preview]').locator('link[data-block-styles]'))
      .toHaveAttribute('href', /\/previews\/liquid-glass\/blocks\/login-01\.css$/, { timeout: 30000 })
  })
})
