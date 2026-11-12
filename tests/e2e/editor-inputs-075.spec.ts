import { expect, test, type Page } from '@playwright/test'

// Number Input and Color Picker in both editions, on the edition parity pages
// (fixtures/shared/edition-scenario*.tsx, section "Editor inputs").
const open = async (page: Page, edition: string) => {
  await page.goto(`/editions/ombelle/${edition}/?mode=light`)
  await expect(page.getByTestId('editor-inputs-075')).toBeVisible({ timeout: 60000 })
}

const stubEyeDropper = (page: Page, behaviour: 'resolve' | 'abort' | 'late') =>
  page.addInitScript(mode => {
    class EyeDropper {
      open({ signal }: { signal?: AbortSignal } = {}) {
        if (mode === 'abort') return Promise.reject(new DOMException('The user canceled the selection.', 'AbortError'))
        if (mode === 'late') return new Promise(resolve => setTimeout(() => resolve({ sRGBHex: '#16a34a' }), 500))
        void signal
        return Promise.resolve({ sRGBHex: '#1d4ed8' })
      }
    }
    Object.assign(window, { EyeDropper })
  }, behaviour)

for (const edition of ['radix', 'base'] as const) {
  test.describe(edition, () => {
    test('Number Input steps with the arrow, Page, Home and End keys and clamps to its range', async ({ page }) => {
      await open(page, edition)
      const input = page.getByRole('spinbutton', { name: 'Border radius' })
      await expect(input).toHaveAttribute('aria-valuenow', '12')
      await expect(input).toHaveAttribute('aria-valuetext', '12 pixels')
      await input.focus()
      await page.keyboard.press('ArrowUp')
      await expect(input).toHaveAttribute('aria-valuenow', '13')
      await page.keyboard.press('Shift+ArrowUp')
      await expect(input).toHaveAttribute('aria-valuenow', '23')
      await page.keyboard.press('PageDown')
      await expect(input).toHaveAttribute('aria-valuenow', '13')
      await page.keyboard.press('ArrowDown')
      await expect(input).toHaveAttribute('aria-valuenow', '12')
      await page.keyboard.press('Home')
      await expect(input).toHaveAttribute('aria-valuenow', '0')
      await expect(page.getByRole('button', { name: 'Decrease Border radius' })).toBeDisabled()
      await page.keyboard.press('End')
      await expect(input).toHaveAttribute('aria-valuenow', '32')
      await page.keyboard.press('PageUp')
      await expect(input).toHaveAttribute('aria-valuenow', '32')
      await expect(page.getByRole('button', { name: 'Increase Border radius' })).toBeDisabled()
      await expect(page.getByTestId('number-report')).toHaveText('32 true')
    })

    test('Number Input keeps a half-typed value, reports it invalid and marks it on blur', async ({ page }) => {
      await open(page, edition)
      const input = page.getByRole('spinbutton', { name: 'Border radius' })
      await input.fill('7')
      await expect(page.getByTestId('number-report')).toHaveText('7 true')
      await input.fill('1.')
      await expect(input).toHaveValue('1.')
      await expect(page.getByTestId('number-report')).toHaveText('null false')
      await expect(input).not.toHaveAttribute('aria-invalid', 'true')
      await input.blur()
      await expect(input).toHaveValue('1.')
      await expect(input).toHaveAttribute('aria-invalid', 'true')
      await page.getByRole('button', { name: 'Reset radius' }).click()
      await expect(input).toHaveValue('4')
      await expect(input).not.toHaveAttribute('aria-invalid', 'true')
    })

    test('Number Input keeps a trailing decimal point when its parent stores its own parse', async ({ page }) => {
      await open(page, edition)
      const input = page.getByRole('spinbutton', { name: 'Gap' })
      // fill leaves the caret at the end; End would jump to the maximum, as a spinbutton key.
      await input.fill('1.5')
      await page.keyboard.press('Backspace')
      await expect(input).toHaveValue('1.')
      await page.keyboard.type('7')
      await expect(input).toHaveValue('1.7')
    })

    test('Color Picker keeps its hue in Hex format at the dark and pale edges', async ({ page }) => {
      await open(page, edition)
      const fixture = page.getByTestId('color-fixture')
      await fixture.getByRole('button', { name: 'Open Accent color picker' }).click()
      const dialog = page.getByRole('dialog', { name: 'Accent color' })
      await dialog.getByRole('combobox', { name: 'Color format' }).selectOption('hex')
      const hue = dialog.getByRole('slider', { name: 'Hue' })
      const area = dialog.getByRole('slider', { name: 'Accent saturation and brightness' })
      await area.focus()
      // A first step writes a hex value; the hue it keeps is the one to compare with.
      await page.keyboard.press('ArrowRight')
      const hueText = await hue.getAttribute('aria-valuetext')
      for (let i = 0; i < 99; i++) await page.keyboard.press('ArrowDown')
      await expect(area).toHaveAttribute('aria-valuetext', /brightness [0-2]%$/)
      for (let i = 0; i < 6; i++) await page.keyboard.press('Shift+ArrowUp')
      await expect(hue).toHaveAttribute('aria-valuetext', hueText!)
      for (let i = 0; i < 12; i++) await page.keyboard.press('Shift+ArrowLeft')
      await expect(area).toHaveAttribute('aria-valuetext', /^Saturation 0%/)
      for (let i = 0; i < 6; i++) await page.keyboard.press('Shift+ArrowRight')
      await expect(hue).toHaveAttribute('aria-valuetext', hueText!)
    })

    test('Color Picker announces the new contrast after a swatch', async ({ page }) => {
      await open(page, edition)
      await page.getByTestId('color-fixture').getByRole('button', { name: 'Open Accent color picker' }).click()
      const dialog = page.getByRole('dialog', { name: 'Accent color' })
      await dialog.getByRole('button', { name: 'Ink' }).click()
      await expect(dialog.locator('[aria-live="polite"]')).toHaveText('16.8:1 on white, AAA')
    })

    test('Color Picker area, hue, format, swatches and contrast drive the value', async ({ page }) => {
      await open(page, edition)
      const fixture = page.getByTestId('color-fixture')
      const report = page.getByTestId('color-report')
      await fixture.getByRole('button', { name: 'Open Accent color picker' }).click()
      const dialog = page.getByRole('dialog', { name: 'Accent color' })
      await expect(dialog).toBeVisible()
      await expect(dialog.getByText('5.3:1')).toBeVisible()
      await expect(dialog.getByText('AA', { exact: true })).toBeVisible()

      const area = dialog.getByRole('slider', { name: 'Accent saturation and brightness' })
      await expect(area).toHaveAttribute('aria-roledescription', '2D slider')
      const before = await area.getAttribute('aria-valuetext')
      expect(before).toMatch(/^Saturation \d+%, brightness \d+%$/)
      await area.focus()
      await page.keyboard.press('ArrowLeft')
      await page.keyboard.press('Shift+ArrowUp')
      await expect(area).not.toHaveAttribute('aria-valuetext', before!)
      await expect(report).not.toHaveText('oklch(0.55 0.22 6)')

      const hue = dialog.getByRole('slider', { name: 'Hue' })
      await expect(hue).toHaveAttribute('aria-valuetext', /^Hue, \d+ degrees$/)
      const afterArea = await report.textContent()
      await hue.focus()
      await page.keyboard.press('Shift+ArrowRight')
      await expect(report).not.toHaveText(afterArea!)

      const blue = dialog.getByRole('button', { name: 'Blue' })
      await blue.click()
      await expect(report).toHaveText('oklch(0.488 0.217 264.4)')
      await expect(blue).toHaveAttribute('aria-pressed', 'true')
      await dialog.getByRole('button', { name: 'Ink' }).click()
      await expect(report).toHaveText('oklch(0.22 0.012 275)')
      await expect(dialog.locator('strong', { hasText: '16.8:1' })).toBeVisible()
      await expect(dialog.getByText('AAA', { exact: true })).toBeVisible()

      await dialog.getByRole('combobox', { name: 'Color format' }).selectOption('hex')
      await expect(dialog.getByRole('textbox', { name: 'Hex value' })).toHaveValue('#191a20')
      await expect(report).toHaveText('oklch(0.22 0.012 275)')
    })

    test('Color Picker keeps the hue at black and follows a value set while open', async ({ page }) => {
      await open(page, edition)
      const fixture = page.getByTestId('color-fixture')
      await fixture.getByRole('button', { name: 'Open Accent color picker' }).click()
      const dialog = page.getByRole('dialog', { name: 'Accent color' })
      const hue = dialog.getByRole('slider', { name: 'Hue' })
      const area = dialog.getByRole('slider', { name: 'Accent saturation and brightness' })
      const hueText = await hue.getAttribute('aria-valuetext')
      await area.focus()
      for (let i = 0; i < 11; i++) await page.keyboard.press('Shift+ArrowDown')
      await expect(area).toHaveAttribute('aria-valuetext', /brightness 0%$/)
      for (let i = 0; i < 5; i++) await page.keyboard.press('Shift+ArrowUp')
      await expect(hue).toHaveAttribute('aria-valuetext', hueText!)

      const marker = await area.getAttribute('aria-valuetext')
      // The fixture's Alt+R shortcut sets the value from outside; an outside click would close the popover.
      await page.keyboard.press('Alt+KeyR')
      await expect(dialog).toBeVisible()
      await expect(area).not.toHaveAttribute('aria-valuetext', marker!)
      await expect(dialog.getByRole('textbox', { name: 'OKLCH value' })).toHaveValue('oklch(0.488 0.217 264.4)')
      await expect(fixture.getByRole('textbox', { name: 'Accent', exact: true })).toHaveValue('#1d4ed8')
    })

    test('Color Picker keeps a typed OKLCH value outside sRGB until the area changes it', async ({ page }) => {
      await open(page, edition)
      const fixture = page.getByTestId('color-fixture')
      const report = page.getByTestId('color-report')
      const field = fixture.getByRole('textbox', { name: 'Accent', exact: true })
      await field.fill('oklch(0.7 0.4 150)')
      await expect(report).toHaveText('oklch(0.7 0.4 150)')
      await expect(field).not.toHaveAttribute('aria-invalid', 'true')
      await fixture.getByRole('button', { name: 'Open Accent color picker' }).click()
      const dialog = page.getByRole('dialog', { name: 'Accent color' })
      await dialog.getByRole('combobox', { name: 'Color format' }).focus()
      await expect(dialog.getByRole('textbox', { name: 'OKLCH value' })).toHaveValue('oklch(0.7 0.4 150)')
      await expect(report).toHaveText('oklch(0.7 0.4 150)')
      await dialog.getByRole('slider', { name: 'Accent saturation and brightness' }).focus()
      await expect(report).toHaveText('oklch(0.7 0.4 150)')
      await page.keyboard.press('ArrowLeft')
      await expect(report).not.toHaveText('oklch(0.7 0.4 150)')
    })

    test('Color Picker marks text that is not a colour and keeps it', async ({ page }) => {
      await open(page, edition)
      const field = page.getByTestId('color-fixture').getByRole('textbox', { name: 'Accent', exact: true })
      await field.fill('#12345')
      await expect(field).toHaveValue('#12345')
      await expect(field).toHaveAttribute('aria-invalid', 'true')
      await expect(page.getByTestId('color-report')).toHaveText('oklch(0.55 0.22 6)')
    })

    test('the eyedropper sets the picked colour in the current format', async ({ page }) => {
      await stubEyeDropper(page, 'resolve')
      await open(page, edition)
      await page.getByTestId('color-fixture').getByRole('button', { name: 'Open Accent color picker' }).click()
      await page.getByRole('dialog', { name: 'Accent color' }).getByRole('button', { name: 'Pick a color from the screen' }).click()
      await expect(page.getByTestId('color-report')).toHaveText('oklch(0.488 0.217 264.4)')
    })

    test('a cancelled eyedropper leaves the value', async ({ page }) => {
      await stubEyeDropper(page, 'abort')
      await open(page, edition)
      await page.getByTestId('color-fixture').getByRole('button', { name: 'Open Accent color picker' }).click()
      await page.getByRole('dialog', { name: 'Accent color' }).getByRole('button', { name: 'Pick a color from the screen' }).click()
      await page.waitForTimeout(200)
      await expect(page.getByTestId('color-report')).toHaveText('oklch(0.55 0.22 6)')
    })

    test('closing the popover drops a pick still open', async ({ page }) => {
      await stubEyeDropper(page, 'late')
      await open(page, edition)
      await page.getByTestId('color-fixture').getByRole('button', { name: 'Open Accent color picker' }).click()
      const dialog = page.getByRole('dialog', { name: 'Accent color' })
      await dialog.getByRole('button', { name: 'Pick a color from the screen' }).click()
      await page.keyboard.press('Escape')
      await expect(dialog).toBeHidden()
      await page.waitForTimeout(800)
      await expect(page.getByTestId('color-report')).toHaveText('oklch(0.55 0.22 6)')
    })

    test('without the EyeDropper API there is no eyedropper button', async ({ page }) => {
      await page.addInitScript(() => { delete (window as { EyeDropper?: unknown }).EyeDropper })
      await open(page, edition)
      await page.getByTestId('color-fixture').getByRole('button', { name: 'Open Accent color picker' }).click()
      const dialog = page.getByRole('dialog', { name: 'Accent color' })
      await expect(dialog.getByRole('combobox', { name: 'Color format' })).toBeVisible()
      await expect(dialog.getByRole('button', { name: 'Pick a color from the screen' })).toHaveCount(0)
    })

    test('Color Picker Pair groups two named pickers', async ({ page }) => {
      await open(page, edition)
      const group = page.getByTestId('pair-fixture').getByRole('group', { name: 'Primary' })
      await expect(group.getByRole('button', { name: 'Open Primary · light color picker' })).toBeVisible()
      await expect(group.getByRole('button', { name: 'Open Primary · dark color picker' })).toBeVisible()
      await expect(group.getByRole('textbox', { name: 'Primary · dark' })).toHaveValue('oklch(0.7 0.18 6)')
    })
  })
}
