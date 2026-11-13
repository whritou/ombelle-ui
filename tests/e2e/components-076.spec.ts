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
