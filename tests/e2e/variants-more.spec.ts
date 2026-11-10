import { expect, test, type Page } from '@playwright/test'

// The 0.7.3 batch 6b and 6c variants in both editions, on the edition pages
// (fixtures/shared/edition-scenario*.tsx, section "More variants").
const open = async (page: Page, edition: string) => {
  await page.goto(`/editions/ombelle/${edition}/?mode=light`)
  await expect(page.getByTestId('variants-more')).toBeVisible({ timeout: 60000 })
}

for (const edition of ['radix', 'base'] as const) {
  test.describe(edition, () => {
    test('vertical tabs move with the up and down arrows', async ({ page }) => {
      await open(page, edition)
      const list = page.getByTestId('variants-more').getByRole('tablist', { name: 'Settings sections' })
      await list.getByRole('tab', { name: 'General' }).focus()
      await page.keyboard.press('ArrowDown')
      await expect(list.getByRole('tab', { name: 'Members' })).toBeFocused()
      await expect(list.getByRole('tab', { name: 'Members' })).toHaveAttribute('aria-selected', 'true')
      await page.keyboard.press('ArrowUp')
      await expect(list.getByRole('tab', { name: 'General' })).toBeFocused()
    })

    test('a pill tab is named with its count', async ({ page }) => {
      await open(page, edition)
      await expect(page.getByTestId('variants-more').getByRole('tab', { name: /^Review\s*3$/ })).toBeVisible()
    })

    test('compact pagination moves between pages and is disabled at the ends', async ({ page }) => {
      await open(page, edition)
      const nav = page.getByTestId('vm-compact')
      await expect(nav).toContainText('Page 1 of 3')
      // A disabled end has no href, so it is found by its name, not by the link role.
      const previous = nav.locator('[aria-label="Previous page"]'), next = nav.locator('[aria-label="Next page"]')
      await expect(previous).toHaveAttribute('aria-disabled', 'true')
      await next.click()
      await next.click()
      await expect(nav).toContainText('Page 3 of 3')
      await expect(next).toHaveAttribute('aria-disabled', 'true')
    })

    test('the page size select updates the range', async ({ page }) => {
      await open(page, edition)
      await page.getByTestId('variants-more').getByLabel('Rows per page').selectOption('50')
      await expect(page.getByTestId('vm-range')).toHaveText('1–50 of 290')
    })
  })
}
