import { expect, test, type Page } from '@playwright/test'

// The 0.7.6 components in both editions, on the edition pages
// (fixtures/shared/components-076-scenario.tsx, section "0.7.6 components").
const open = async (page: Page, edition: string) => {
  await page.goto(`/editions/ombelle/${edition}/?mode=light`)
  await expect(page.getByTestId('components-076')).toBeVisible({ timeout: 60000 })
  return page.getByTestId('components-076')
}

for (const edition of ['radix', 'base'] as const) {
  test.describe(edition, () => {
    test('a Checkbox Group parent checks and clears the enabled children and reads mixed', async ({ page }) => {
      const section = await open(page, edition)
      await expect(section.getByRole('group', { name: 'Overlays to install' })).toBeVisible()
      const parent = section.getByRole('checkbox', { name: /All overlays/ })
      const box = (name: string) => section.getByRole('checkbox', { name, exact: true })
      await expect(parent).toHaveAttribute('aria-checked', 'mixed')
      await expect(section.getByText('2 of 4')).toBeVisible()

      await parent.click()
      for (const name of ['Dialog', 'Sheet', 'Tooltip', 'Popover']) await expect(box(name)).toHaveAttribute('aria-checked', 'true')
      await expect(parent).toHaveAttribute('aria-checked', 'true')

      await parent.click()
      for (const name of ['Dialog', 'Sheet', 'Tooltip']) await expect(box(name)).toHaveAttribute('aria-checked', 'false')
      // The disabled Popover keeps its state, so the parent reads mixed.
      await expect(box('Popover')).toHaveAttribute('aria-checked', 'true')
      await expect(parent).toHaveAttribute('aria-checked', 'mixed')
      await expect(section.getByText('1 of 4')).toBeVisible()

      await box('Sheet').click()
      await expect(section.getByText('2 of 4')).toBeVisible()
    })

    test('a failed Form submit focuses the summary, whose lines focus their fields', async ({ page }) => {
      const section = await open(page, edition)
      const form = section.getByTestId('c076-form')
      await expect(form).toHaveAttribute('novalidate', '')
      await form.getByRole('spinbutton', { name: 'Radius' }).fill('60')
      await form.getByRole('button', { name: 'Save preset' }).click()
      const summary = form.getByRole('region', { name: 'Fix 2 fields before saving' })
      await expect(summary).toBeFocused()
      await expect(form.getByRole('textbox', { name: 'Preset name' })).toHaveAttribute('aria-invalid', 'true')
      await summary.getByRole('link', { name: /^Radius: / }).click()
      await expect(form.getByRole('spinbutton', { name: 'Radius' })).toBeFocused()
      await expect(form.getByRole('spinbutton', { name: 'Radius' })).toHaveAttribute('aria-invalid', 'true')

      await form.getByRole('textbox', { name: 'Preset name' }).fill('Studio')
      await expect(form.getByRole('region', { name: 'Fix 1 field before saving' })).toBeVisible()
      await expect(form.getByRole('textbox', { name: 'Preset name' })).not.toHaveAttribute('aria-invalid', 'true')

      // The same errors again still move focus to the summary.
      await form.getByRole('button', { name: 'Save preset' }).focus()
      await form.getByRole('button', { name: 'Save preset' }).click()
      await expect(form.getByRole('region', { name: 'Fix 1 field before saving' })).toBeFocused()
      await expect(form.getByRole('status')).toHaveText('')
    })

    test('server errors land on their field, clear on change and do not come back', async ({ page }) => {
      const section = await open(page, edition)
      const form = section.getByTestId('c076-form')
      const name = form.getByRole('textbox', { name: 'Preset name' })
      await name.fill('Ombelle')
      await form.getByRole('button', { name: 'Return server errors' }).click()
      await expect(name).toHaveAttribute('aria-invalid', 'true')
      await expect(name).toHaveAccessibleDescription(/A preset with this name already exists\./)
      const summary = form.getByRole('region', { name: 'Fix 2 fields before saving' })
      await expect(summary.getByRole('listitem').filter({ hasText: 'ghost: unknown field error' })).toBeVisible()
      await expect(summary.getByRole('link', { name: /ghost/ })).toHaveCount(0)

      await name.fill('Ombelle 2')
      await expect(name).not.toHaveAttribute('aria-invalid', 'true')
      await form.getByRole('button', { name: 'Save preset' }).click()
      await expect(form.getByRole('status')).toHaveText('Saved 1')
      await expect(name).not.toHaveAttribute('aria-invalid', 'true')

      // A new errors object shows them again.
      await form.getByRole('button', { name: 'Return server errors' }).click()
      await expect(name).toHaveAttribute('aria-invalid', 'true')
    })

    test('a disabled FieldSet disables every control in it', async ({ page }) => {
      const section = await open(page, edition)
      const editions = section.getByTestId('c076-editions')
      await expect(section.getByRole('group', { name: 'Editions · locked by the project' })).toBeVisible()
      for (const name of ['Radix', 'Base UI']) await expect(editions.getByRole('checkbox', { name })).toBeDisabled()
      await expect(editions.getByRole('textbox', { name: 'Project path' })).toBeDisabled()
      await expect(section.getByRole('checkbox', { name: 'Unrelated' })).toBeEnabled()
    })
  })
}
