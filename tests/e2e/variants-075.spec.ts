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

for (const edition of ['radix', 'base'] as const) {
  test.describe(`${edition} Popover`, () => {
    test('a PopoverArrow is drawn, hidden from assistive technology, and fills a 10px gap', async ({ page }) => {
      const section = await open(page, edition)
      const trigger = section.getByRole('button', { name: 'Shadow help' })
      await trigger.click()
      const content = page.getByRole('dialog', { name: 'Shadow offset' })
      await expect(content).toBeVisible()
      const arrow = content.locator('[data-slot="popover-arrow"]')
      await expect(arrow).toBeVisible()
      await expect(arrow).toHaveAttribute('aria-hidden', 'true')
      const t = (await trigger.boundingBox())!
      const c = (await content.boundingBox())!
      expect(Math.abs(c.y - (t.y + t.height) - 10)).toBeLessThanOrEqual(1)
      const a = (await arrow.boundingBox())!
      // The arrow sits in the gap, pointing at the trigger, with its base on the content's edge.
      expect(a.y + a.height).toBeGreaterThan(c.y - 0.5)
      expect(a.y).toBeLessThan(c.y)
      expect(a.y).toBeGreaterThanOrEqual(t.y + t.height - 1)
    })
  })
}

for (const edition of ['radix', 'base'] as const) {
  test.describe(`${edition} Dialog`, () => {
    test('the footer stays visible while the named body scrolls with the keyboard', async ({ page }) => {
      const section = await open(page, edition)
      await section.getByRole('button', { name: 'Export preset' }).click()
      const dialog = page.getByRole('dialog', { name: 'Export preset' })
      const body = dialog.getByRole('region', { name: 'Export preset' })
      await expect(body).toHaveAttribute('data-overflowing', '')
      await expect(body).toHaveAttribute('tabindex', '0')
      const footer = dialog.locator('[data-slot="dialog-footer"]')
      // The footer gains a top border while the body overflows.
      expect(await footer.evaluate(element => parseFloat(getComputedStyle(element).borderTopWidth))).toBeGreaterThan(0)
      await body.focus()
      await page.keyboard.press('PageDown')
      await expect.poll(() => body.evaluate(element => element.scrollTop)).toBeGreaterThan(0)
      await body.evaluate(element => { element.scrollTop = element.scrollHeight })
      const viewport = page.viewportSize()!
      const box = (await footer.boundingBox())!
      expect(box.y).toBeGreaterThanOrEqual(0)
      expect(box.y + box.height).toBeLessThanOrEqual(viewport.height)
      await expect(dialog.getByRole('button', { name: 'Cancel' })).toBeInViewport()
    })

    test('a short body is no Tab stop until its content overflows', async ({ page }) => {
      const section = await open(page, edition)
      await section.getByRole('button', { name: 'Edit details' }).click()
      const dialog = page.getByRole('dialog', { name: 'Project details' })
      const body = dialog.getByTestId('v075-growing-body')
      await expect(body).toHaveAttribute('aria-labelledby', /.+/)
      await expect(body).not.toHaveAttribute('tabindex', /.*/)
      const footer = dialog.locator('[data-slot="dialog-footer"]')
      expect(await footer.evaluate(element => getComputedStyle(element).borderTopWidth)).toBe('0px')
      await dialog.getByRole('button', { name: 'Add details' }).click()
      await expect(body).toHaveAttribute('tabindex', '0')
      await expect(body).toHaveAttribute('data-overflowing', '')
      await expect.poll(() => footer.evaluate(element => parseFloat(getComputedStyle(element).borderTopWidth))).toBeGreaterThan(0)
    })

    test('lg fills the screen at 375px and default does not', async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 812 })
      const section = await open(page, edition)
      await section.getByRole('button', { name: 'Export preset' }).click()
      const large = page.getByRole('dialog', { name: 'Export preset' })
      const box = (await large.boundingBox())!
      expect(Math.round(box.width)).toBe(375)
      expect(await large.evaluate(element => getComputedStyle(element).borderTopLeftRadius)).toBe('0px')
      await page.keyboard.press('Escape')
      await expect(large).toBeHidden()
      await section.getByRole('button', { name: 'Rename preset' }).click()
      const small = page.getByRole('dialog', { name: 'Rename preset' })
      expect((await small.boundingBox())!.width).toBeLessThan(375)
    })
  })
}
