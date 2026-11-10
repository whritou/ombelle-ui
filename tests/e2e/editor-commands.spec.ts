import { expect, test } from '@playwright/test'

// The editor's Ctrl+K command palette and its Combobox pickers.
const openEditor = async (page: import('@playwright/test').Page, path: string) => {
  await page.goto('http://127.0.0.1:3000' + path)
  await expect(page.getByRole('button', { name: /Commands/ })).toBeVisible({ timeout: 60000 })
}

test('Ctrl+K opens the palette, and choosing a component opens its editor', async ({ page }) => {
  await openEditor(page, '/editor/component/button')
  await page.keyboard.press('Control+k')
  const palette = page.getByRole('dialog', { name: 'Editor commands' })
  await expect(palette).toBeVisible()
  const search = palette.getByRole('combobox')
  await expect(search).toBeFocused()
  await search.pressSequentially('dialog')
  await expect(palette.getByRole('option', { name: 'Dialog', exact: true })).toBeVisible()
  await page.keyboard.press('Enter')
  // The development server builds the route on first visit.
  await expect(page).toHaveURL(/\/editor\/component\/dialog\/?$/, { timeout: 60000 })
})

test('Ctrl+K works from the name field and Escape returns focus there', async ({ page }) => {
  await openEditor(page, '/editor/preset')
  const name = page.getByLabel('Preset name')
  await name.focus()
  await page.keyboard.press('Control+k')
  const palette = page.getByRole('dialog', { name: 'Editor commands' })
  await expect(palette).toBeVisible()
  await page.keyboard.press('Escape')
  await expect(palette).toHaveCount(0)
  await expect(name).toBeFocused()
})

test('the palette switches the style family', async ({ page }) => {
  await openEditor(page, '/editor/component/button')
  await page.getByRole('button', { name: /Commands/ }).click()
  const palette = page.getByRole('dialog', { name: 'Editor commands' })
  await palette.getByRole('combobox').pressSequentially('minimalist')
  await page.keyboard.press('Enter')
  await expect(page.locator('[data-family="minimalist"]').first()).toHaveAttribute('aria-checked', 'true')
})

test('the icon picker is a searchable combobox that sets the icon', async ({ page }) => {
  await openEditor(page, '/editor/component/button')
  const picker = page.getByRole('combobox', { name: 'Icon' })
  await expect(picker).toHaveValue('None')
  await picker.click()
  await picker.fill('arrow r')
  await page.getByRole('option', { name: 'Arrow right' }).click()
  await expect(picker).toHaveValue('Arrow right')
  await expect(page.getByRole('button', { name: 'Remove icon' })).toBeVisible()
  await expect(page.getByRole('group', { name: 'Icon position' }).or(page.getByRole('radiogroup', { name: 'Icon position' }))).toBeVisible()
})
