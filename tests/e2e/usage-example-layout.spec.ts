import { test, expect } from '@playwright/test'
import { styleFamilies } from '../../packages/contracts/src/style-families.js'
import { verifyExampleLayout } from '../../scripts/playground/example-layout.js'
for (const family of styleFamilies)
  for (const edition of ['radix', 'base'] as const)
    for (const mode of ['light', 'dark']) {
      test(
        family + ' ' + edition + ' ' + mode + ' spaces independent examples',
        async ({ page }) => {
          const errors: string[] = []
          page.on('pageerror', (error) => errors.push(error.message))
          page.on('console', (message) => {
            if (
              message.type() === 'error' &&
              /cannot|asChild|React/.test(message.text())
            )
              errors.push(message.text())
          })
          await page.goto(
            '/' + family + '-' + edition + '/index.html?mode=' + mode,
          )
          await expect(page.locator('[data-component=toggle]')).toBeVisible()
          // Pause default toast expiry before measuring the full page.
          if (edition === 'base')
            await page
              .locator('[data-component=toast]')
              .getByRole('button', { name: 'Save changes' })
              .click()
          const toast = page.locator('[data-slot=toast]')
          await toast.hover()
          await verifyExampleLayout(page)
          await expect(
            page.getByRole('button', {
              name: 'Dismiss notification',
              exact: true,
            }),
          ).toHaveCount(1)
          await page.screenshot({
            path:
              '.artifacts/usage-examples/' +
              family +
              '-' +
              edition +
              '-' +
              mode +
              '.png',
            fullPage: true,
          })
          await page
            .getByRole('button', { name: 'Dismiss notification', exact: true })
            .click()
          await expect(toast).toHaveCount(0)
          expect(errors).toEqual([])
        },
      )
    }
