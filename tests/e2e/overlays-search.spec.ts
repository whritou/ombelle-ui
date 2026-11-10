import { expect, test, type Page } from '@playwright/test'

// Combobox, Command, Hover Card and Context Menu keyboard and pointer behaviour, in both
// editions, on the edition parity pages (fixtures/shared/edition-scenario*.tsx, "Overlays and search").
const open = async (page: Page, edition: string) => {
  await page.goto(`/editions/ombelle/${edition}/?mode=light`)
  await expect(page.getByTestId('overlays-search')).toBeVisible({ timeout: 60000 })
}
const visibleOptions = (page: Page) => page.getByRole('listbox').getByRole('option')

for (const edition of ['radix', 'base'] as const) {
  test.describe(edition, () => {
    test('single Combobox filters, highlights, selects with Enter and keeps its value on Escape', async ({ page }) => {
      await open(page, edition)
      const input = page.getByTestId('combobox-single').getByRole('combobox')
      await expect(input).toHaveAccessibleName('Preset')
      await expect(input).toHaveAttribute('aria-expanded', 'false')
      await input.click()
      await input.pressSequentially('gla')
      await expect(input).toHaveAttribute('aria-expanded', 'true')
      await expect(visibleOptions(page).filter({ hasNotText: 'Create' })).toHaveCount(3)
      await expect(page.getByRole('option', { name: 'Create “gla”' })).toBeVisible()
      await expect(page.getByRole('listbox').locator('mark').first()).toHaveText('gla')
      await page.keyboard.press('ArrowDown')
      const active = await input.getAttribute('aria-activedescendant')
      expect(active).toBeTruthy()
      await expect(page.locator(`[id="${active}"]`)).toContainText('Liquid glass')
      await page.keyboard.press('Enter')
      await expect(input).toHaveAttribute('aria-expanded', 'false')
      await expect(page.getByTestId('combobox-value')).toHaveText(/Value: liquid-glass(-givre)?$/)
      const chosen = await input.inputValue()
      expect(chosen).toMatch(/^Liquid glass/)
      // Reopening a chosen combobox shows every option, not only the chosen one.
      await input.click()
      await expect(visibleOptions(page)).toHaveCount(4)
      await page.keyboard.press('Escape')
      await expect(input).toHaveAttribute('aria-expanded', 'false')
      await expect(input).toHaveValue(chosen)
      await expect(input).toBeFocused()
    })

    test('Combobox Create hands the trimmed query to onCreate, and hides for an existing name', async ({ page }) => {
      await open(page, edition)
      const input = page.getByTestId('combobox-single').getByRole('combobox')
      await input.click()
      await input.pressSequentially('  liquid GLASS ')
      await expect(page.getByRole('option', { name: /^Create/ })).toHaveCount(0)
      await input.fill('')
      await input.pressSequentially('Aurora ')
      await page.getByRole('option', { name: 'Create “Aurora”' }).click()
      await expect(page.getByTestId('combobox-created')).toHaveText('Created: Aurora')
    })

    test('multiple Combobox adds chips, and only Backspace in an empty field removes the last one', async ({ page }) => {
      await open(page, edition)
      const field = page.getByTestId('combobox-multiple')
      const input = field.getByRole('combobox')
      // Enter chooses the highlighted option once the list has caught up with the typing.
      const highlighted = (name: string) => expect(page.getByRole('option', { name })).toHaveAttribute('data-highlighted', /.*/)
      await input.click()
      await input.pressSequentially('ombelle')
      await highlighted('Ombelle')
      await page.keyboard.press('Enter')
      await expect(input).toHaveAttribute('aria-expanded', 'true')
      await input.pressSequentially('prism')
      await highlighted('Liquid glass — Prism')
      await page.keyboard.press('Enter')
      await expect(field.getByRole('button', { name: /^Remove / })).toHaveCount(2)
      await expect(input).toHaveValue('')
      await input.pressSequentially('x')
      await page.keyboard.press('Backspace')
      await expect(input).toHaveValue('')
      await expect(field.getByRole('button', { name: /^Remove / })).toHaveCount(2)
      await page.keyboard.press('Backspace')
      await expect(field.getByRole('button', { name: /^Remove / })).toHaveCount(1)
      await field.getByRole('button', { name: 'Remove Ombelle' }).click()
      await expect(field.getByRole('button', { name: /^Remove / })).toHaveCount(0)
      await expect(input).toBeFocused()
    })

    test('Command opens with Ctrl+K, filters groups, announces no results and runs on Enter', async ({ page }) => {
      await open(page, edition)
      const opener = page.getByTestId('command-opener')
      await opener.focus()
      await page.keyboard.press('Control+k')
      const dialog = page.getByRole('dialog', { name: 'Command menu' })
      await expect(dialog).toBeVisible()
      await expect(dialog.getByRole('combobox')).toBeFocused()
      await page.keyboard.press('Escape')
      await expect(dialog).toHaveCount(0)
      await expect(opener).toBeFocused()
      await page.keyboard.press('Control+k')
      await expect(dialog).toBeVisible()
      const search = dialog.getByRole('combobox')
      await expect(search).toBeFocused()
      await search.pressSequentially('theme')
      // cmdk keeps an emptied group in the page, hidden; Base UI removes it.
      await expect(dialog.getByText('Components', { exact: true })).toBeHidden()
      await expect(dialog.getByRole('option')).toHaveCount(1)
      await search.fill('')
      await search.pressSequentially('zzz')
      await expect(dialog.getByRole('status')).toHaveText('No results.')
      await search.fill('')
      await search.pressSequentially('dialog')
      await page.keyboard.press('Enter')
      await expect(page.getByTestId('command-ran')).toHaveText('Ran: Add Dialog')
      await expect(dialog).toHaveCount(0)
    })

    test('Hover Card opens on hover and on keyboard focus, closes on Escape, and the link still works', async ({ page }) => {
      await open(page, edition)
      const trigger = page.getByTestId('hover-trigger')
      await trigger.hover()
      await expect(page.getByTestId('hover-content')).toBeVisible()
      await page.mouse.move(0, 0)
      await expect(page.getByTestId('hover-content')).toHaveCount(0)
      // Real keyboard focus: Base UI opens on keyboard focus, not on a programmatic focus().
      await page.getByTestId('command-opener').focus()
      await page.keyboard.press('Tab')
      await expect(trigger).toBeFocused()
      await expect(page.getByTestId('hover-content')).toBeVisible()
      await page.keyboard.press('Escape')
      await expect(page.getByTestId('hover-content')).toHaveCount(0)
      await trigger.click()
      await expect(page).toHaveURL(/#hover-target$/)
    })

    test('Context Menu opens at the pointer and with Shift+F10, moves with arrows and returns focus', async ({ page }) => {
      await open(page, edition)
      const zone = page.getByTestId('context-zone')
      await zone.scrollIntoViewIfNeeded()
      const box = (await zone.boundingBox())!
      await page.mouse.click(box.x + 40, box.y + 30, { button: 'right' })
      const menu = page.getByRole('menu')
      await expect(menu).toBeVisible()
      const at = (await menu.boundingBox())!
      expect(Math.abs(at.x - (box.x + 40))).toBeLessThan(24)
      expect(Math.abs(at.y - (box.y + 30))).toBeLessThan(24)
      await page.keyboard.press('Escape')
      await expect(menu).toHaveCount(0)

      await zone.focus()
      await page.keyboard.press('Shift+F10')
      await expect(page.getByRole('menu')).toBeVisible()
      // Arrow keys move through the items; the first may already be focused when the menu opens.
      const apply = page.getByRole('menuitem', { name: 'Apply preset' })
      for (let press = 0; press < 3 && !await apply.evaluate(element => element === document.activeElement); press++) {
        await page.keyboard.press('ArrowDown')
        await expect(page.locator('[role="menuitem"]:focus')).toHaveCount(1)
      }
      await expect(apply).toBeFocused()
      await page.keyboard.press('ArrowRight')
      await expect(page.getByRole('menu')).toHaveCount(2)
      await expect(page.getByRole('menuitem', { name: 'Ombelle' })).toBeFocused()
      await page.keyboard.press('ArrowLeft')
      await expect(page.getByRole('menu')).toHaveCount(1)
      await page.keyboard.press('Escape')
      await expect(page.getByRole('menu')).toHaveCount(0)
      await expect(zone).toBeFocused()
    })

    test('Context Menu opened in the bottom-right corner stays inside the viewport', async ({ page }) => {
      await open(page, edition)
      const zone = page.getByTestId('context-zone')
      await zone.evaluate(element => element.scrollIntoView({ block: 'end', inline: 'end' }))
      const box = (await zone.boundingBox())!
      const viewport = page.viewportSize()!
      // Just inside the zone's rounded bottom corner, with the zone at the bottom of the viewport.
      const x = Math.min(box.x + box.width, viewport.width) - 24, y = Math.min(box.y + box.height, viewport.height) - 12
      await page.mouse.click(x, y, { button: 'right' })
      const menu = (await page.getByRole('menu').boundingBox())!
      expect(menu.x).toBeGreaterThanOrEqual(0)
      expect(menu.y).toBeGreaterThanOrEqual(0)
      expect(menu.x + menu.width).toBeLessThanOrEqual(viewport.width)
      expect(menu.y + menu.height).toBeLessThanOrEqual(viewport.height)
    })
  })
}
