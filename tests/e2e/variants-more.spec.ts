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

for (const edition of ['radix', 'base'] as const) {
  test.describe(`${edition} table`, () => {
    test('sorting cycles aria-sort, and the header stays in view as the rows scroll', async ({ page }) => {
      await open(page, edition)
      const table = page.getByTestId('vm-table')
      const updated = table.getByRole('columnheader', { name: /Updated/ })
      await expect(updated).toHaveAttribute('aria-sort', 'descending')
      await updated.getByRole('button').click()
      await expect(updated).toHaveAttribute('aria-sort', 'ascending')
      await expect(table.getByRole('row').nth(1)).toContainText('5 min ago')
      const container = table.locator('[data-slot$="table-container"]')
      await container.evaluate(element => { element.scrollTop = 200 })
      const [box, head] = await Promise.all([container.boundingBox(), updated.boundingBox()])
      expect(Math.abs(head!.y - box!.y)).toBeLessThan(2)
      // The sort button keeps a visible ring above the scrolled rows.
      await table.getByTestId('vm-table-loading').focus()
      await page.keyboard.press('Tab')
      await expect(updated.getByRole('button')).toBeFocused()
      const ring = await updated.getByRole('button').evaluate(element => parseFloat(getComputedStyle(element).outlineWidth))
      expect(ring).toBeGreaterThanOrEqual(2)
      const covered = await updated.getByRole('button').evaluate(element => {
        const rect = element.getBoundingClientRect()
        return document.elementFromPoint(rect.left + rect.width / 2, rect.top + rect.height / 2) !== element && !element.contains(document.elementFromPoint(rect.left + rect.width / 2, rect.top + rect.height / 2))
      })
      expect(covered).toBe(false)
    })

    test('the actions column is named, and loading marks the table busy with skeleton rows', async ({ page }) => {
      await open(page, edition)
      const table = page.getByTestId('vm-table')
      await expect(table.getByRole('columnheader', { name: 'Actions' })).toHaveCount(1)
      await table.getByTestId('vm-table-loading').click()
      await expect(table.getByRole('table', { name: 'Deploys' })).toHaveAttribute('aria-busy', 'true')
      await expect(table.locator('[data-slot$="table-skeleton"]')).toHaveCount(9)
    })
  })
}
