import { expect, test } from '@playwright/test'

// Base UI wires Field descriptions after hydration, so its wiring is checked in a browser.
for (const edition of ['radix', 'base'] as const)
  test(`${edition} Field describes its control with the hint and marks it required`, async ({ page }) => {
    await page.goto(`/audit/ombelle/${edition}/?mode=light`)
    await expect(page.locator('main[data-audit-page]')).toHaveAttribute('data-ready', 'true', { timeout: 60000 })
    const section = page.locator('section[data-audit="field"]')
    const control = section.locator('[data-field-input]')
    const hint = section.locator('[data-slot$="field-description"]')
    await expect(hint).toHaveAttribute('id', /.+/)
    const hintId = await hint.getAttribute('id')
    await expect.poll(async () => (await control.getAttribute('aria-describedby'))?.split(' ') ?? []).toContain(hintId)
    await expect(control).toHaveAccessibleName(/Project name/)
    await expect(control).toHaveJSProperty('required', true)
  })

// A control's own description and id must survive the Field wiring in both editions.
for (const edition of ['radix', 'base'] as const)
  test(`${edition} Field keeps the control's own description and points the label at the control`, async ({ page }) => {
    await page.goto(`/editions/ombelle/${edition}/?mode=light`)
    const control = page.getByTestId('field-own')
    await expect(control).toBeVisible({ timeout: 60000 })
    const field = page.locator('[data-slot$="field"]').filter({ has: control })
    const hintId = await field.locator('[data-slot$="field-description"]').getAttribute('id')
    const errorId = await field.locator('[data-slot$="field-error"]').getAttribute('id')
    await expect.poll(async () => (await control.getAttribute('aria-describedby'))?.split(' ') ?? [])
      .toEqual(expect.arrayContaining(['field-own-note', hintId, errorId]))
    await expect(control).toHaveAccessibleName('Display name')
    await expect(control).toHaveAttribute('aria-invalid', 'true')
  })
