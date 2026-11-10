import { expect, type Page } from '@playwright/test'

/** One option of a segmented control or the family picker, e.g. ('Preview mode', 'Dark'). */
export const segment = (page: Page, group: string, option: string) =>
  page.getByRole('radiogroup', { name: group, exact: true }).getByRole('radio', { name: option, exact: true })

/**
 * Opens the review drawer on its Export tab. Idempotent: works whether the
 * drawer is closed (rail button) or already open on either tab.
 */
export async function openExport(page: Page): Promise<void> {
  const tab = page.getByRole('tab', { name: 'Export', exact: true })
  if (!(await tab.count())) await page.getByRole('button', { name: /^Open export/ }).click()
  if ((await tab.getAttribute('aria-selected')) !== 'true') await tab.click()
  await expect(tab).toHaveAttribute('aria-selected', 'true')
}

/**
 * Waits until the current draft has compiled. Get code is always mounted in the
 * top bar and is disabled while the compiled result is stale or pending, so this
 * holds even while the review drawer is closed.
 */
export async function waitForCompiled(page: Page, timeout = 30000): Promise<void> {
  await expect(page.getByRole('button', { name: 'Get code', exact: true })).toBeEnabled({ timeout })
}
