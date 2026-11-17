import { expect, test, type Page } from '@playwright/test'

// The 0.9 app shell components in both editions, on the edition pages
// (fixtures/shared/app-shell-09-scenario.tsx, section "0.9 app shell").
const open = async (page: Page, edition: string, family = 'ombelle') => {
  await page.goto(`/editions/${family}/${edition}/?mode=light`)
  await expect(page.getByTestId('app-shell-09')).toBeVisible({ timeout: 60000 })
  return page.getByTestId('app-shell-09')
}

for (const edition of ['radix', 'base'] as const) {
  test.describe(edition, () => {
    test('Navigation Menu opens a panel on click, closes on Escape and returns focus to the trigger', async ({ page }) => {
      const nav = (await open(page, edition)).getByTestId('s09-nav')
      const trigger = nav.getByRole('button', { name: 'Docs' })
      await trigger.click()
      await expect(page.getByRole('link', { name: /Installation/ })).toBeVisible()
      await page.keyboard.press('Escape')
      await expect(page.getByRole('link', { name: /Installation/ })).toBeHidden()
      await expect(trigger).toBeFocused()
    })

    test('Navigation Menu opens a panel on hover', async ({ page }) => {
      const nav = (await open(page, edition)).getByTestId('s09-nav')
      await nav.getByRole('button', { name: 'Components' }).hover()
      await expect(page.getByRole('link', { name: 'Sidebar' })).toBeVisible()
    })

    test('Navigation Menu arrow keys move between top-level items, and the current link is marked', async ({ page }) => {
      const nav = (await open(page, edition)).getByTestId('s09-nav')
      await nav.getByRole('button', { name: 'Docs' }).focus()
      await page.keyboard.press('ArrowRight')
      await expect(nav.getByRole('button', { name: 'Components' })).toBeFocused()
      await page.keyboard.press('ArrowRight')
      await expect(nav.getByRole('link', { name: 'Blog' })).toBeFocused()
      await expect(nav.getByRole('link', { name: 'Blog' })).toHaveAttribute('aria-current', 'page')
    })

    test('Sidebar collapses to icons, keeping names, and shows tooltips on focus', async ({ page }) => {
      const sidebar = (await open(page, edition)).getByTestId('s09-sidebar')
      const root = sidebar.locator('[data-slot="sidebar"]')
      await expect(root).toHaveAttribute('data-state', 'expanded')
      await sidebar.getByRole('button', { name: 'Toggle sidebar' }).click()
      await expect(root).toHaveAttribute('data-state', 'collapsed')
      await expect(root).toHaveAttribute('data-collapsible', 'icon')
      const overview = sidebar.getByRole('link', { name: 'Overview' })
      await expect(overview).toHaveAttribute('aria-current', 'page')
      // Reach the item with the keyboard: Base UI shows tooltips on keyboard focus, not after a click.
      await sidebar.getByRole('link', { name: 'Projects' }).focus()
      await page.keyboard.press('Shift+Tab')
      await expect(overview).toBeFocused()
      await expect(page.locator('[data-slot="sidebar-tooltip"]')).toContainText('Overview')
      // Labels take no room: the item is about as wide as the icon strip.
      expect((await overview.boundingBox())!.width).toBeLessThan(80)
    })

    test('Sidebar keeps a closed group out of the Tab order', async ({ page }) => {
      const sidebar = (await open(page, edition)).getByTestId('s09-sidebar')
      await expect(sidebar.getByRole('link', { name: 'Old presets' })).toBeHidden()
      await sidebar.getByRole('button', { name: 'Archive' }).click()
      await expect(sidebar.getByRole('link', { name: 'Old presets' })).toBeVisible()
      await sidebar.getByRole('button', { name: 'Archive' }).click()
      await expect(sidebar.getByRole('link', { name: 'Old presets' })).toBeHidden()
    })

    test('Ctrl/Cmd+B toggles the sidebar, but not while typing in an input, textarea or contenteditable', async ({ page }) => {
      const sidebar = (await open(page, edition)).getByTestId('s09-sidebar')
      const root = sidebar.locator('[data-slot="sidebar"]')
      await sidebar.getByRole('button', { name: 'Toggle sidebar' }).focus()
      await page.keyboard.press('ControlOrMeta+b')
      await expect(root).toHaveAttribute('data-state', 'collapsed')
      await page.keyboard.press('ControlOrMeta+b')
      await expect(root).toHaveAttribute('data-state', 'expanded')
      for (const name of ['Preset name', 'Notes', 'Caption']) {
        await sidebar.getByRole('textbox', { name }).focus()
        await page.keyboard.press('ControlOrMeta+b')
        await expect(root).toHaveAttribute('data-state', 'expanded')
      }
    })

    test('below 768 px the trigger opens a modal sheet that keeps focus and closes when a link is followed', async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 800 })
      const sidebar = (await open(page, edition)).getByTestId('s09-sidebar')
      await sidebar.getByRole('button', { name: 'Toggle sidebar' }).click()
      const sheet = page.getByRole('dialog', { name: 'Workspace' })
      await expect(sheet).toBeVisible()
      for (let step = 0; step < 12; step++) {
        await page.keyboard.press('Tab')
        expect(await sheet.evaluate(element => element.contains(document.activeElement))).toBe(true)
      }
      await sheet.getByRole('link', { name: 'Projects' }).click()
      await expect(sheet).toBeHidden()
    })

    test('Prose keeps long URLs, words and tables inside its box at 320 px', async ({ page }) => {
      await page.setViewportSize({ width: 320, height: 800 })
      const section = await open(page, edition)
      const prose = section.getByTestId('s09-prose')
      const box = await prose.evaluate(element => ({ scroll: element.scrollWidth, client: element.clientWidth }))
      expect(box.scroll).toBeLessThanOrEqual(box.client)
      const table = section.getByTestId('s09-prose-table')
      const scroll = await table.evaluate(element => ({ scroll: element.scrollWidth, client: element.clientWidth, overflow: getComputedStyle(element).overflowX }))
      expect(scroll.overflow).toBe('auto')
      expect(scroll.scroll).toBeGreaterThan(scroll.client)
    })

    test('Prose measure follows the chosen width', async ({ page }) => {
      await page.setViewportSize({ width: 1600, height: 900 })
      const section = await open(page, edition)
      const prose = section.getByTestId('s09-prose')
      const width = async (measure: string) => {
        await section.getByRole('group', { name: 'Measure' }).getByRole('button', { name: measure }).click()
        return prose.evaluate(element => getComputedStyle(element).maxWidth)
      }
      const widths = [await width('narrow'), await width('default'), await width('wide')]
      expect(new Set(widths).size).toBe(3)
      expect(parseFloat(widths[0]!)).toBeLessThan(parseFloat(widths[1]!))
      expect(parseFloat(widths[1]!)).toBeLessThan(parseFloat(widths[2]!))
    })
  })
}
