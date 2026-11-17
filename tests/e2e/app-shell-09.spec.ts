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
