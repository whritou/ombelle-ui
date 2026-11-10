import { expect, test, type Page } from '@playwright/test'

// Calendar and Date Picker keyboard, pointer and form behaviour, in both editions, on the edition
// pages (fixtures/shared/edition-scenario*.tsx, section "Calendar"). Today is fixed at 2026-11-10.
const open = async (page: Page, edition: string) => {
  await page.goto(`/editions/ombelle/${edition}/?mode=light`)
  await expect(page.getByTestId('calendar')).toBeVisible({ timeout: 60000 })
}
const dayButton = (scope: ReturnType<Page['getByTestId']>, iso: string) => scope.locator(`[data-day="${iso}"] button`)

for (const edition of ['radix', 'base'] as const) {
  test.describe(edition, () => {
    test('one Tab enters the grid, and the keys move by day, week, month and week ends', async ({ page }) => {
      await open(page, edition)
      const grid = page.getByTestId('calendar-single')
      await page.getByTestId('calendar-before').focus()
      // The previous and next month buttons come first.
      for (let press = 0; press < 3 && !await grid.locator('[data-slot$="calendar-day-button"]:focus').count(); press++) await page.keyboard.press('Tab')
      const focused = grid.locator('[data-slot$="calendar-day-button"]:focus')
      await expect(focused).toHaveCount(1)
      const day = () => focused.evaluate(element => element.closest('[data-day]')!.getAttribute('data-day'))
      const start = await day()
      expect(start).toBe('2026-11-10')
      await page.keyboard.press('ArrowRight')
      expect(await day()).toBe('2026-11-11')
      await page.keyboard.press('ArrowDown')
      expect(await day()).toBe('2026-11-18')
      await page.keyboard.press('Home')
      expect(await day()).toBe('2026-11-15')
      await page.keyboard.press('End')
      expect(await day()).toBe('2026-11-21')
      await page.keyboard.press('PageDown')
      expect(await day()).toBe('2026-12-21')
      await expect(grid.getByRole('grid')).toHaveAccessibleName(/December 2026/)
      await page.keyboard.press('PageUp')
      await page.keyboard.press('Enter')
      await expect(page.getByTestId('calendar-single-value')).toHaveText('Chosen: 2026-11-21')
    })

    test('a past day cannot be chosen by click or keyboard', async ({ page }) => {
      await open(page, edition)
      const grid = page.getByTestId('calendar-single')
      await expect(dayButton(grid, '2026-11-09')).toBeDisabled()
      await dayButton(grid, '2026-11-09').click({ force: true })
      await expect(page.getByTestId('calendar-single-value')).toHaveText('Chosen: ')
      await dayButton(grid, '2026-11-10').focus()
      await page.keyboard.press('ArrowLeft')
      await page.keyboard.press('Enter')
      await expect(page.getByTestId('calendar-single-value')).not.toHaveText('Chosen: 2026-11-09')
    })

    test('two clicks make a range, in either order, and a third starts a new one', async ({ page }) => {
      await open(page, edition)
      const grid = page.getByTestId('calendar-range')
      await dayButton(grid, '2026-11-18').click()
      await dayButton(grid, '2026-11-12').click()
      await expect(page.getByTestId('calendar-range-value')).toHaveText('Range: 2026-11-12–2026-11-18')
      await expect(grid.locator('[data-day="2026-11-12"]')).toHaveAttribute('data-range-start', 'true')
      await expect(grid.locator('[data-day="2026-11-15"]')).toHaveAttribute('data-range-middle', 'true')
      await expect(grid.locator('[data-day="2026-11-18"]')).toHaveAttribute('data-range-end', 'true')
      // A full range is replaced: the third click starts a new range at that day.
      await dayButton(grid, '2026-11-25').click()
      await expect(page.getByTestId('calendar-range-value')).toHaveText('Range: 2026-11-25–')
    })

    test('the Date Picker opens on its date, closes on Enter or Escape, and follows a value set from outside', async ({ page }) => {
      await open(page, edition)
      const trigger = page.getByRole('button', { name: /Due date/ })
      await expect(trigger).toContainText('Nov 12, 2026')
      await trigger.click()
      const content = page.locator('[data-slot$="date-picker-content"]')
      await expect(content).toBeVisible()
      await expect(content.locator('[data-day="2026-11-12"] button')).toBeFocused()
      await page.keyboard.press('Escape')
      await expect(content).toHaveCount(0)
      await expect(trigger).toBeFocused()
      await expect(trigger).toContainText('Nov 12, 2026')
      await trigger.click()
      await content.locator('[data-day="2026-11-20"] button').focus()
      await page.keyboard.press('Enter')
      await expect(content).toHaveCount(0)
      await expect(trigger).toContainText('Nov 20, 2026')
      await expect(trigger).toBeFocused()
      await expect(page.locator('[data-testid="calendar-form"] input[name="due"]')).toHaveValue('2026-11-20')
      await page.getByTestId('calendar-clear').click()
      await expect(trigger).toContainText('Choose a date')
      await expect(page.locator('[data-testid="calendar-form"] input[name="due"]')).toHaveValue('')
    })

    test('a range Date Picker stays open after the first day and closes once the range is complete', async ({ page }) => {
      await open(page, edition)
      const trigger = page.getByRole('button', { name: /Stay/ })
      await trigger.click()
      const content = page.locator('[data-slot$="date-picker-content"]')
      await content.locator('[data-day="2026-11-18"] button').click()
      await expect(content).toBeVisible()
      await content.locator('[data-day="2026-11-12"] button').click()
      await expect(content).toHaveCount(0)
      await expect(trigger).toContainText('Nov 12')
      await expect(trigger).toContainText('18, 2026')
      const form = page.getByTestId('calendar-stay-form')
      await expect(form.locator('input[name="stay-from"]')).toHaveValue('2026-11-12')
      await expect(form.locator('input[name="stay-to"]')).toHaveValue('2026-11-18')
    })

    test('choosing the date a Date Picker already holds keeps it', async ({ page }) => {
      await open(page, edition)
      const trigger = page.getByRole('button', { name: /Due date/ })
      await trigger.click()
      await page.locator('[data-slot$="date-picker-content"] [data-day="2026-11-12"] button').click()
      await expect(page.locator('[data-slot$="date-picker-content"]')).toHaveCount(0)
      await expect(trigger).toContainText('Nov 12, 2026')
      await expect(page.locator('[data-testid="calendar-form"] input[name="due"]')).toHaveValue('2026-11-12')
    })

    test('Escape in a Date Picker inside a dialog closes only the picker', async ({ page }) => {
      await open(page, edition)
      await page.getByTestId('calendar-schedule').click()
      const dialog = page.getByRole('dialog', { name: 'Schedule' })
      await expect(dialog).toBeVisible()
      const trigger = dialog.getByRole('button', { name: /Publish date/ })
      await trigger.click()
      await expect(page.locator('[data-slot$="date-picker-content"]')).toBeVisible()
      await page.keyboard.press('Escape')
      await expect(page.locator('[data-slot$="date-picker-content"]')).toHaveCount(0)
      await expect(dialog).toBeVisible()
      await expect(trigger).toBeFocused()
    })

    test.describe('west of UTC', () => {
      test.use({ timezoneId: 'America/Los_Angeles' })
      test('choosing the 14th submits 2026-11-14', async ({ page }) => {
        await open(page, edition)
        const trigger = page.getByRole('button', { name: /Due date/ })
        await trigger.click()
        await page.locator('[data-slot$="date-picker-content"] [data-day="2026-11-14"] button').click()
        await expect(page.locator('[data-testid="calendar-form"] input[name="due"]')).toHaveValue('2026-11-14')
        await expect(trigger).toContainText('Nov 14, 2026')
      })
    })
  })
}
