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

    test('the password toggle keeps the caret, the input and hides again on submit', async ({ page }) => {
      const section = await open(page, edition)
      const form = section.getByTestId('c076-password')
      const input = form.getByLabel('Password', { exact: true })
      await input.fill('correct-horse-7')
      const before = await input.elementHandle()
      await input.evaluate((element: HTMLInputElement) => element.setSelectionRange(3, 5))
      const toggle = form.getByRole('button', { name: 'Show password' }).first()
      await expect(toggle).toHaveAttribute('aria-pressed', 'false')
      await toggle.click()
      await expect(toggle).toHaveAttribute('aria-pressed', 'true')
      await expect(input).toHaveAttribute('type', 'text')
      expect(await input.evaluate((element: HTMLInputElement) => [element.selectionStart, element.selectionEnd])).toEqual([3, 5])
      expect(await before!.evaluate((element, current) => element === current, await input.elementHandle())).toBe(true)
      await form.getByRole('button', { name: 'Set password' }).click()
      await expect(input).toHaveAttribute('type', 'password')
      await expect(toggle).toHaveAttribute('aria-pressed', 'false')
    })

    test('the strength names the first missing check and Caps Lock is announced while focused', async ({ page }) => {
      const section = await open(page, edition)
      const form = section.getByTestId('c076-password')
      const input = form.getByLabel('Password', { exact: true })
      const meter = form.getByRole('meter', { name: 'Password strength' })
      await input.fill('Abcdefghijkl1')
      await expect(meter).toHaveAttribute('aria-valuetext', 'Strong · add a symbol to reach the last check')
      await input.fill('Abcdefghijkl1!')
      await expect(meter).toHaveAttribute('aria-valuetext', 'Very strong')
      await input.focus()
      // Playwright's CapsLock key does not set the modifier state, so the key event carries it.
      await input.evaluate((element) => element.dispatchEvent(new KeyboardEvent('keydown', { key: 'A', bubbles: true, modifierCapsLock: true } as KeyboardEventInit)))
      await expect(form.getByRole('status')).toHaveText('Caps Lock is on')
      await form.getByRole('button', { name: 'Set password' }).focus()
      await expect(form.getByRole('status')).toHaveText('')
    })

    test('Carousel buttons, dots, keys and scrolling move the current slide', async ({ page }) => {
      const section = await open(page, edition)
      const carousel = section.getByTestId('c076-carousel')
      const dot = (n: number) => carousel.getByRole('button', { name: `Slide ${n}`, exact: true })
      const previous = carousel.getByRole('button', { name: 'Previous slide' })
      const next = carousel.getByRole('button', { name: 'Next slide' })
      const counter = carousel.locator('[data-slot="carousel-counter"]')
      await expect(previous).toBeDisabled()
      await next.click()
      await expect(dot(2)).toHaveAttribute('aria-current', 'true')
      await expect(counter).toHaveText('2 / 5')
      await expect(previous).toBeEnabled()
      await dot(3).click()
      await expect(dot(3)).toHaveAttribute('aria-current', 'true')
      const content = carousel.locator('[data-slot="carousel-content"]')
      await content.focus()
      await page.keyboard.press('ArrowRight')
      await expect(dot(4)).toHaveAttribute('aria-current', 'true')
      await content.hover()
      await page.mouse.wheel(-2000, 0)
      await expect(dot(1)).toHaveAttribute('aria-current', 'true')
      await expect(counter).toHaveText('1 / 5')
      await expect(previous).toBeDisabled()
      await dot(5).click()
      await expect(next).toBeDisabled()
    })

    test('a Carousel with one slide disables both buttons, and a new slide adds a dot', async ({ page }) => {
      const section = await open(page, edition)
      const one = section.getByTestId('c076-carousel-one')
      await expect(one.getByRole('button', { name: 'Previous slide' })).toBeDisabled()
      await expect(one.getByRole('button', { name: 'Next slide' })).toBeDisabled()
      const carousel = section.getByTestId('c076-carousel')
      await section.getByRole('button', { name: 'Add a slide' }).click()
      await expect(carousel.getByRole('button', { name: 'Slide 6', exact: true })).toBeVisible()
      await expect(carousel.getByRole('group', { name: '6 of 6' })).toBeAttached()
      await expect(carousel.getByRole('group', { name: '1 of 6' })).toBeAttached()
    })

    test('below 640px the Carousel arrows hide and the dots stay', async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 800 })
      const section = await open(page, edition)
      const carousel = section.getByTestId('c076-carousel')
      await expect(carousel.getByRole('button', { name: 'Next slide' })).toBeHidden()
      await expect(carousel.getByRole('button', { name: 'Slide 1', exact: true })).toBeVisible()
    })

    test('an Aspect Ratio frame keeps 16 : 9 at any width and its image fills it', async ({ page }) => {
      const section = await open(page, edition)
      const box = section.getByTestId('c076-aspect')
      for (const width of [240, 480, 960]) {
        await box.evaluate((element, size) => { (element as HTMLElement).style.inlineSize = size + 'px' }, width)
        const frame = await box.locator('[data-slot="aspect-ratio"]').boundingBox()
        const image = await box.getByRole('img').boundingBox()
        expect(Math.abs(frame!.height - frame!.width * 9 / 16)).toBeLessThanOrEqual(1)
        expect(Math.abs(image!.height - frame!.height)).toBeLessThanOrEqual(4)
        expect(Math.abs(image!.width - frame!.width)).toBeLessThanOrEqual(4)
      }
    })

    test('a Toolbar is one Tab stop with arrow, Home and End keys', async ({ page }) => {
      const section = await open(page, edition)
      const toolbar = section.getByRole('toolbar', { name: 'View options' })
      const light = toolbar.getByText('Light', { exact: true })
      await light.focus()
      await page.keyboard.press('ArrowRight')
      await expect(toolbar.getByText('Dark', { exact: true })).toBeFocused()
      await page.keyboard.press('End')
      await expect(toolbar.getByRole('link', { name: 'Open preview' })).toBeFocused()
      await page.keyboard.press('Home')
      await expect(light).toBeFocused()
      await page.keyboard.press('Tab')
      await expect(toolbar.locator(':focus')).toHaveCount(0)
      await page.keyboard.press('Shift+Tab')
      await expect(toolbar.locator(':focus')).toHaveCount(1)
      const dark = toolbar.getByText('Dark', { exact: true })
      await dark.focus()
      await page.keyboard.press('Space')
      await expect(dark).toHaveAttribute(edition === 'radix' ? 'aria-checked' : 'aria-pressed', 'true')
    })

    test('Toolbar items overflow into More in order, come back and keep focus', async ({ page }) => {
      const section = await open(page, edition)
      const box = section.getByTestId('c076-toolbar')
      const toolbar = section.getByRole('toolbar', { name: 'View options' })
      const more = toolbar.getByRole('button', { name: 'More' })
      // Resized from script, so focus stays on the toolbar item.
      const resize = (size: number) => box.evaluate((element, value) => { (element as HTMLElement).style.inlineSize = value + 'px' }, size)
      await expect(more).toBeHidden()
      await toolbar.getByRole('link', { name: 'Open preview' }).focus()
      await resize(160)
      await expect(toolbar.getByRole('link', { name: 'Open preview' })).toBeHidden()
      await expect(toolbar.getByText('Grid', { exact: true })).toBeHidden()
      await expect(more).toBeFocused()
      await more.click()
      const menu = page.getByRole('menu', { name: 'More' })
      const items = menu.getByRole(/menuitem/ as never)
      await expect(menu.locator('[data-slot="toolbar-overflow-item"]')).toHaveText(['Grid', 'Open preview'])
      const grid = menu.getByRole('menuitemcheckbox', { name: 'Grid' })
      await expect(grid).toHaveAttribute('aria-checked', 'false')
      await grid.click()
      await expect(toolbar.getByText('Grid', { exact: true })).toHaveAttribute(edition === 'radix' ? 'data-state' : 'aria-pressed', edition === 'radix' ? 'on' : 'true')
      void items
      await page.keyboard.press('Escape')
      await resize(640)
      await expect(toolbar.getByText('Grid', { exact: true })).toBeVisible()
      await expect(toolbar.getByRole('link', { name: 'Open preview' })).toBeVisible()
      await expect(more).toBeHidden()
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
