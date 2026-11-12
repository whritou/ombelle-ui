import { expect, test, type Page } from '@playwright/test'

// The 0.7.5 variants in both editions, on the edition pages
// (fixtures/shared/edition-scenario*.tsx, section "0.7.5 variants").
const open = async (page: Page, edition: string) => {
  await page.goto(`/editions/ombelle/${edition}/?mode=light`)
  await expect(page.getByTestId('variants-075')).toBeVisible({ timeout: 60000 })
  return page.getByTestId('variants-075')
}

for (const edition of ['radix', 'base'] as const) {
  test.describe(edition, () => {
    test('a CheckboxOption is named by its title and described by its description', async ({ page }) => {
      const section = await open(page, edition)
      const box = section.getByRole('checkbox', { name: 'Include examples' })
      await expect(box).toHaveAccessibleDescription('Adds sample files')
    })

    test('a click anywhere on a CheckboxOption toggles it exactly once', async ({ page }) => {
      const section = await open(page, edition)
      const row = section.getByRole('checkbox', { name: 'Include examples' })
      await expect(row).toHaveAttribute('aria-checked', 'false')
      await section.getByText('Include examples', { exact: true }).click()
      await expect(row).toHaveAttribute('aria-checked', 'true')
      await section.getByText('Adds sample files').click()
      await expect(row).toHaveAttribute('aria-checked', 'false')
      await row.click()
      await expect(row).toHaveAttribute('aria-checked', 'true')

      const card = section.getByRole('checkbox', { name: 'Vite' })
      const tile = section.locator('[data-slot="checkbox-option"][data-appearance="card"]').first()
      await tile.click({ position: { x: 8, y: 8 } })
      await expect(card).toHaveAttribute('aria-checked', 'true')
      await card.click()
      await expect(card).toHaveAttribute('aria-checked', 'false')
    })

    test('a disabled CheckboxOption does not toggle', async ({ page }) => {
      const section = await open(page, edition)
      const card = section.getByRole('checkbox', { name: 'Next.js' })
      await section.getByText('App Router').click({ force: true })
      await expect(card).toHaveAttribute('aria-checked', 'false')
    })
  })
}

for (const edition of ['radix', 'base'] as const) {
  test.describe(`${edition} Switch`, () => {
    test('a small Switch in a horizontal Field has a hit area of at least 24 by 24 px', async ({ page }) => {
      const section = await open(page, edition)
      const toggle = section.getByRole('switch', { name: 'Reduced transparency' })
      await expect(toggle).toHaveAttribute('data-size', 'sm')
      const box = (await toggle.boundingBox())!
      expect(box.height).toBeLessThan(24)
      // The ::before hit area reaches 12px above and below the centre of the track.
      const hits = await page.evaluate(({ x, y, h }) => [y + h / 2 - 11.5, y + h / 2 + 11.5].map(top =>
        document.elementFromPoint(x + 4, top)?.closest('[data-slot="switch"]') !== null), { x: box.x, y: box.y, h: box.height })
      expect(hits).toEqual([true, true])
      await toggle.focus()
      await page.keyboard.press('Space')
      await expect(toggle).toHaveAttribute('aria-checked', 'true')
    })
  })
}

for (const edition of ['radix', 'base'] as const) {
  test.describe(`${edition} Progress`, () => {
    test('a Progress is named by its label and its value text matches the readout', async ({ page }) => {
      const section = await open(page, edition)
      const bar = section.getByRole('progressbar', { name: 'Publishing — on track' })
      await expect(bar).toHaveAttribute('aria-valuenow', '64')
      const readout = section.getByTestId('v075-progress').locator('[data-slot="progress-value"]')
      await expect(readout).toHaveText('64%')
      await expect(bar).toHaveAttribute('aria-valuetext', (await readout.textContent())!)
    })
  })
}
