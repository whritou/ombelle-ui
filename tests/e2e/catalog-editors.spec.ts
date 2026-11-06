import { expect, test } from '@playwright/test'

test('edits, reloads, and publishes a Badge recipe', async ({ page }) => {
  await page.goto('http://127.0.0.1:3000/editor/component/badge')
  const label = page.getByLabel('Label', { exact: true })
  await label.fill('Ready <now> & later')
  const specimen = page.frameLocator('iframe[title="Badge recipe preview"]').locator('[data-slot="recipe-badge"]')
  await expect(specimen).toHaveText('Ready <now> & later')
  await page.reload()
  await expect(label).toHaveValue('Ready <now> & later')
  await page.getByRole('button', { name: 'Get code', exact: true }).click()
  await page.getByRole('dialog', { name: 'Get code' }).getByTestId('get-code-reference').click()
  await expect(page.getByRole('heading', { name: 'Published Badge recipe' })).toBeVisible()
  await expect(specimen).toHaveText('Ready <now> & later')
})
