import { expect, test, type Page } from '@playwright/test'

// The form controls' keyboard, paste and wiring behaviour, in both editions, on the edition
// parity pages (fixtures/shared/edition-scenario*.tsx, section "Form controls").
const open = async (page: Page, edition: string) => {
  await page.goto(`/editions/ombelle/${edition}/?mode=light`)
  await expect(page.getByTestId('form-controls')).toBeVisible({ timeout: 60000 })
}

for (const edition of ['radix', 'base'] as const) {
  test.describe(edition, () => {
    test('Slider moves with the arrow, Home and End keys and reads its value', async ({ page }) => {
      await open(page, edition)
      const thumb = page.getByTestId('slider-single').getByRole('slider')
      await expect(thumb).toHaveAccessibleName('Border radius')
      await thumb.focus()
      await page.keyboard.press('ArrowRight')
      await expect(thumb).toHaveAttribute('aria-valuenow', '13')
      await page.keyboard.press('Home')
      await expect(thumb).toHaveAttribute('aria-valuenow', '0')
      await page.keyboard.press('End')
      await expect(thumb).toHaveAttribute('aria-valuenow', '24')
      await expect(thumb).toHaveAttribute('aria-valuetext', '24 pixels')
    })

    test('range Slider thumbs do not pass each other', async ({ page }) => {
      await open(page, edition)
      const [low, high] = [0, 1].map(index => page.getByTestId('slider-range').getByRole('slider').nth(index))
      await expect(low!).toHaveAccessibleName('Minimum price')
      await expect(high!).toHaveAccessibleName('Maximum price')
      // Page Up moves the focused thumb a large step; Home and End move the first and last thumbs.
      await low!.focus()
      for (let press = 0; press < 8; press++) await page.keyboard.press('PageUp')
      expect(Number(await low!.getAttribute('aria-valuenow'))).toBeLessThanOrEqual(80)
      await expect(high!).toHaveAttribute('aria-valuenow', '80')
    })

    test('single Toggle Group is a radio group with one Tab stop and arrow movement', async ({ page }) => {
      await open(page, edition)
      const group = page.getByTestId('toggle-single')
      await expect(group).toHaveAttribute('role', 'radiogroup')
      const radios = group.getByRole('radio')
      await expect(radios).toHaveCount(3)
      await expect(group.getByRole('radio', { name: 'Week' })).toHaveAttribute('aria-checked', 'true')
      // One Tab stop: Tab leaves the group from its checked item, and Shift+Tab comes back to it.
      await group.getByRole('radio', { name: 'Week' }).focus()
      await page.keyboard.press('Tab')
      expect(await group.evaluate(element => element.contains(document.activeElement))).toBe(false)
      await page.keyboard.press('Shift+Tab')
      await expect(group.getByRole('radio', { name: 'Week' })).toBeFocused()
      await page.keyboard.press('ArrowRight')
      await expect(group.getByRole('radio', { name: 'Month' })).toBeFocused()
      await page.keyboard.press('Space')
      await expect(group.getByRole('radio', { name: 'Month' })).toHaveAttribute('aria-checked', 'true')
      // Both primitives clear a single choice when its checked item is activated again;
      // the editor's SegmentedControl ignores that empty value.
      await page.keyboard.press('Space')
      await expect(group.locator('[aria-checked="true"]')).toHaveCount(0)
    })

    test('Tag Input adds with Enter and comma, removes with Backspace and announces it', async ({ page }) => {
      await open(page, edition)
      const box = page.getByTestId('tag-input')
      const input = box.getByRole('textbox')
      await expect(input).toHaveAccessibleName('Topics')
      const hintId = await page.locator('[data-slot$="field-description"]').filter({ hasText: 'Enter or comma adds a topic.' }).getAttribute('id')
      await expect.poll(async () => (await input.getAttribute('aria-describedby'))?.split(' ') ?? []).toContain(hintId)
      await input.fill('alpha')
      await page.keyboard.press('Enter')
      await input.pressSequentially('beta,')
      await expect(box.getByRole('listitem')).toHaveText(['glass', 'alpha', 'beta'])
      await expect(input).toHaveValue('')
      await page.keyboard.press('Backspace')
      await expect(box.getByRole('listitem')).toHaveText(['glass', 'alpha'])
      await expect(box.getByRole('status')).toHaveText('Removed beta')
      await input.fill('glass')
      await page.keyboard.press('Enter')
      await expect(box.getByRole('status')).toHaveText('glass is already added')
      await expect(input).toHaveValue('glass')
    })

    test('Tag Input pastes over the selected text, not after it', async ({ page }) => {
      await open(page, edition)
      const box = page.getByTestId('tag-input')
      const input = box.getByRole('textbox')
      await input.fill('desgn')
      await input.selectText()
      await input.evaluate((element, text) => {
        const data = new DataTransfer()
        data.setData('text/plain', text)
        element.dispatchEvent(new ClipboardEvent('paste', { clipboardData: data, bubbles: true, cancelable: true }))
      }, 'design, tokens')
      await expect(box.getByRole('listitem')).toHaveText(['glass', 'design', 'tokens'])
    })

    if (edition === 'base')
      test('Tag Input reports typing to its Base UI Field', async ({ page }) => {
        await open(page, edition)
        const input = page.getByTestId('tag-input').getByRole('textbox')
        const field = page.locator('[data-slot$="field"]').filter({ has: input })
        await input.pressSequentially('x')
        await expect(field).toHaveAttribute('data-dirty', '')
      })

    test('Input OTP is named and a pasted code keeps only its digits', async ({ page }) => {
      await open(page, edition)
      const field = page.getByRole('textbox', { name: 'Verification code' })
      await field.focus()
      await field.evaluate((element, text) => {
        const data = new DataTransfer()
        data.setData('text/plain', text)
        element.dispatchEvent(new ClipboardEvent('paste', { clipboardData: data, bubbles: true, cancelable: true }))
      }, '12-34 56789')
      const value = async () => edition === 'radix'
        ? field.inputValue()
        : (await page.getByTestId('input-otp').locator('input[data-slot$="input-otp-slot"]').evaluateAll(inputs => inputs.map(input => (input as HTMLInputElement).value))).join('')
      await expect.poll(value).toBe('123456')
    })
  })
}
