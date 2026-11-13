import { expect, test, type Page } from '@playwright/test'

// The 0.7.5 variants in both editions, on the edition pages
// (fixtures/shared/edition-scenario*.tsx, section "0.7.5 variants").
const open = async (page: Page, edition: string) => {
  await page.goto(`/editions/ombelle/${edition}/?mode=light`)
  await expect(page.getByTestId('variants-075')).toBeVisible({ timeout: 60000 })
  return page.getByTestId('variants-075')
}

for (const edition of ['radix', 'base'] as const) {
  test.describe(edition, () => {
    test('a CheckboxOption is named by its title and described by its description', async ({ page }) => {
      const section = await open(page, edition)
      const box = section.getByRole('checkbox', { name: 'Include examples' })
      await expect(box).toHaveAccessibleDescription('Adds sample files')
    })

    test('a click anywhere on a CheckboxOption toggles it exactly once', async ({ page }) => {
      const section = await open(page, edition)
      const row = section.getByRole('checkbox', { name: 'Include examples' })
      await expect(row).toHaveAttribute('aria-checked', 'false')
      await section.getByText('Include examples', { exact: true }).click()
      await expect(row).toHaveAttribute('aria-checked', 'true')
      await section.getByText('Adds sample files').click()
      await expect(row).toHaveAttribute('aria-checked', 'false')
      await row.click()
      await expect(row).toHaveAttribute('aria-checked', 'true')

      const card = section.getByRole('checkbox', { name: 'Vite' })
      const tile = section.locator('[data-slot="checkbox-option"][data-appearance="card"]').first()
      await tile.click({ position: { x: 8, y: 8 } })
      await expect(card).toHaveAttribute('aria-checked', 'true')
      await card.click()
      await expect(card).toHaveAttribute('aria-checked', 'false')
    })

    test('a disabled CheckboxOption does not toggle', async ({ page }) => {
      const section = await open(page, edition)
      const card = section.getByRole('checkbox', { name: 'Next.js' })
      await section.getByText('App Router').click({ force: true })
      await expect(card).toHaveAttribute('aria-checked', 'false')
    })
  })
}

for (const edition of ['radix', 'base'] as const) {
  test.describe(`${edition} Switch`, () => {
    test('a small Switch in a horizontal Field has a hit area of at least 24 by 24 px', async ({ page }) => {
      const section = await open(page, edition)
      const toggle = section.getByRole('switch', { name: 'Reduced transparency' })
      await expect(toggle).toHaveAttribute('data-size', 'sm')
      const box = (await toggle.boundingBox())!
      expect(box.height).toBeLessThan(24)
      // The ::before hit area reaches 12px above and below the centre of the track.
      const hits = await page.evaluate(({ x, y, h }) => [y + h / 2 - 11.5, y + h / 2 + 11.5].map(top =>
        document.elementFromPoint(x + 4, top)?.closest('[data-slot="switch"]') !== null), { x: box.x, y: box.y, h: box.height })
      expect(hits).toEqual([true, true])
      await toggle.focus()
      await page.keyboard.press('Space')
      await expect(toggle).toHaveAttribute('aria-checked', 'true')
    })
  })
}

for (const edition of ['radix', 'base'] as const) {
  test.describe(`${edition} Progress`, () => {
    test('a Progress is named by its label and its value text matches the readout', async ({ page }) => {
      const section = await open(page, edition)
      const bar = section.getByRole('progressbar', { name: 'Publishing — on track' })
      await expect(bar).toHaveAttribute('aria-valuenow', '64')
      const readout = section.getByTestId('v075-progress').locator('[data-slot="progress-value"]')
      await expect(readout).toHaveText('64%')
      await expect(bar).toHaveAttribute('aria-valuetext', (await readout.textContent())!)
    })
  })
}

for (const edition of ['radix', 'base'] as const) {
  test.describe(`${edition} Popover`, () => {
    test('a PopoverArrow is drawn, hidden from assistive technology, and fills a 10px gap', async ({ page }) => {
      const section = await open(page, edition)
      const trigger = section.getByRole('button', { name: 'Shadow help' })
      await trigger.click()
      const content = page.getByRole('dialog', { name: 'Shadow offset' })
      await expect(content).toBeVisible()
      const arrow = content.locator('[data-slot="popover-arrow"]')
      await expect(arrow).toBeVisible()
      await expect(arrow).toHaveAttribute('aria-hidden', 'true')
      const t = (await trigger.boundingBox())!
      const c = (await content.boundingBox())!
      expect(Math.abs(c.y - (t.y + t.height) - 10)).toBeLessThanOrEqual(1)
      const a = (await arrow.boundingBox())!
      // The arrow sits in the gap, pointing at the trigger, with its base on the content's edge.
      expect(a.y + a.height).toBeGreaterThan(c.y - 0.5)
      expect(a.y).toBeLessThan(c.y)
      expect(a.y).toBeGreaterThanOrEqual(t.y + t.height - 1)
    })
  })
}

for (const edition of ['radix', 'base'] as const) {
  test.describe(`${edition} Dialog`, () => {
    test('the footer stays visible while the named body scrolls with the keyboard', async ({ page }) => {
      const section = await open(page, edition)
      await section.getByRole('button', { name: 'Export preset' }).click()
      const dialog = page.getByRole('dialog', { name: 'Export preset' })
      const body = dialog.getByRole('region', { name: 'Export preset' })
      await expect(body).toHaveAttribute('data-overflowing', '')
      await expect(body).toHaveAttribute('tabindex', '0')
      const footer = dialog.locator('[data-slot="dialog-footer"]')
      // The footer gains a top border while the body overflows.
      expect(await footer.evaluate(element => parseFloat(getComputedStyle(element).borderTopWidth))).toBeGreaterThan(0)
      await body.focus()
      await page.keyboard.press('PageDown')
      await expect.poll(() => body.evaluate(element => element.scrollTop)).toBeGreaterThan(0)
      await body.evaluate(element => { element.scrollTop = element.scrollHeight })
      const viewport = page.viewportSize()!
      const box = (await footer.boundingBox())!
      expect(box.y).toBeGreaterThanOrEqual(0)
      expect(box.y + box.height).toBeLessThanOrEqual(viewport.height)
      await expect(dialog.getByRole('button', { name: 'Cancel' })).toBeInViewport()
    })

    test('a short body is no Tab stop until its content overflows', async ({ page }) => {
      const section = await open(page, edition)
      await section.getByRole('button', { name: 'Edit details' }).click()
      const dialog = page.getByRole('dialog', { name: 'Project details' })
      const body = dialog.getByTestId('v075-growing-body')
      await expect(body).toHaveAttribute('aria-labelledby', /.+/)
      await expect(body).not.toHaveAttribute('tabindex', /.*/)
      const footer = dialog.locator('[data-slot="dialog-footer"]')
      expect(await footer.evaluate(element => getComputedStyle(element).borderTopWidth)).toBe('0px')
      await dialog.getByRole('button', { name: 'Add details' }).click()
      await expect(body).toHaveAttribute('tabindex', '0')
      await expect(body).toHaveAttribute('data-overflowing', '')
      await expect.poll(() => footer.evaluate(element => parseFloat(getComputedStyle(element).borderTopWidth))).toBeGreaterThan(0)
    })

    test('lg fills the screen at 375px and default does not', async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 812 })
      const section = await open(page, edition)
      await section.getByRole('button', { name: 'Export preset' }).click()
      const large = page.getByRole('dialog', { name: 'Export preset' })
      const box = (await large.boundingBox())!
      expect(Math.round(box.width)).toBe(375)
      expect(await large.evaluate(element => getComputedStyle(element).borderTopLeftRadius)).toBe('0px')
      await page.keyboard.press('Escape')
      await expect(large).toBeHidden()
      await section.getByRole('button', { name: 'Rename preset' }).click()
      const small = page.getByRole('dialog', { name: 'Rename preset' })
      expect((await small.boundingBox())!.width).toBeLessThan(375)
    })
  })
}

for (const edition of ['radix', 'base'] as const) {
  test.describe(`${edition} typed confirmation`, () => {
    const openConfirm = async (page: Page) => {
      const section = await open(page, edition)
      await section.getByRole('button', { name: 'Delete project' }).click()
      const dialog = page.getByRole('alertdialog', { name: 'Delete ombelle-site?' })
      await expect(dialog).toBeVisible()
      return { section, dialog, input: dialog.getByRole('textbox', { name: 'Type ombelle-site to confirm' }), action: dialog.getByRole('button', { name: 'Delete project' }) }
    }

    test('the action is disabled until the text matches exactly, with its reason announced', async ({ page }) => {
      const { section, dialog, input, action } = await openConfirm(page)
      await expect(input).toBeFocused()
      await expect(dialog.locator('[data-slot="alert-dialog-media"]')).toHaveAttribute('aria-hidden', 'true')
      await input.pressSequentially('ombelle-sit')
      await expect(action).toBeDisabled()
      await expect(action).toHaveAccessibleDescription('Type ombelle-site to confirm')
      for (const near of ['Ombelle-site', 'ombelle-site ', ' ombelle-site']) {
        await input.fill(near)
        await expect(action, near).toBeDisabled()
      }
      await input.press('Enter')
      await expect(dialog).toBeVisible()
      await expect(section.getByTestId('v075-deleted')).toHaveText('0')
      await input.fill('ombelle-site')
      await expect(action).toBeEnabled()
      await expect(action).not.toHaveAttribute('aria-describedby', /.+/)
      await input.press('Enter')
      await expect(dialog).toBeHidden()
      await expect(section.getByTestId('v075-deleted')).toHaveText('1')
    })

    test('pasting the text enables the action, Escape closes, and reopening starts empty', async ({ page }) => {
      const { input, action, dialog } = await openConfirm(page)
      await input.focus()
      // A paste inserts the whole text at once; the input does not block paste.
      await page.keyboard.insertText('ombelle-site')
      await expect(action).toBeEnabled()
      await page.keyboard.press('Escape')
      await expect(dialog).toBeHidden()
      // Reopen on the same page, without a reload: the typed text must not survive the close.
      await page.getByTestId('variants-075').getByRole('button', { name: 'Delete project' }).click()
      await expect(dialog).toBeVisible()
      await expect(input).toHaveValue('')
      await expect(action).toBeDisabled()
      await dialog.getByRole('button', { name: 'Cancel' }).click()
      await expect(dialog).toBeHidden()
      await page.getByTestId('variants-075').getByRole('button', { name: 'Delete project' }).click()
      await expect(input).toHaveValue('')
    })
  })
}

for (const edition of ['radix', 'base'] as const) {
  test.describe(`${edition} Breadcrumb collapse`, () => {
    const visibleItems = (page: Page) => page.getByTestId('v075-breadcrumb').locator('[data-slot="breadcrumb-item"]:not([data-breadcrumb-overflow]):visible')

    test('at 320px the middle folds into a menu of the hidden links, and at 1280px nothing folds', async ({ page }) => {
      await page.setViewportSize({ width: 320, height: 800 })
      await open(page, edition)
      const nav = page.getByRole('navigation', { name: 'Component path' })
      await expect(nav.getByRole('link', { name: 'Home' })).toBeVisible()
      await expect(nav.getByText('Field', { exact: true })).toBeVisible()
      const more = nav.getByRole('button', { name: /^Show \d+ more$/ })
      await expect(more).toBeVisible()
      const count = Number((await more.getAttribute('aria-label'))!.match(/\d+/)![0])
      const hidden = await nav.locator('[data-breadcrumb-hidden][data-slot="breadcrumb-item"] a').evaluateAll(links => links.map(link => [link.textContent, link.getAttribute('href')]))
      expect(hidden).toHaveLength(count)
      expect(count).toBeGreaterThan(0)
      const box = (await nav.boundingBox())!
      const list = (await nav.locator('[data-slot="breadcrumb-list"]').boundingBox())!
      expect(list.width).toBeLessThanOrEqual(box.width + 1)
      await more.click()
      const menu = page.getByRole('menu')
      await expect(menu).toBeVisible()
      const entries = await menu.getByRole('menuitem').evaluateAll(items => items.map(item => [item.textContent, item.getAttribute('href')]))
      expect(entries).toEqual(hidden)
      await page.keyboard.press('Escape')
      await page.setViewportSize({ width: 1280, height: 800 })
      await expect(nav.getByRole('button', { name: /^Show \d+ more$/ })).toHaveCount(0)
      await expect(visibleItems(page)).toHaveCount(8)
    })

    test('changing the items while folded measures the new trail', async ({ page }) => {
      await page.setViewportSize({ width: 320, height: 800 })
      const section = await open(page, edition)
      const nav = page.getByRole('navigation', { name: 'Component path' })
      await expect(nav.getByRole('button', { name: /^Show \d+ more$/ })).toBeVisible()
      await section.getByRole('button', { name: 'Switch trail' }).click()
      await expect(nav.getByRole('link', { name: 'Home' })).toBeVisible()
      await expect(nav.getByText('Field', { exact: true })).toBeVisible()
      const more = nav.getByRole('button', { name: /^Show \d+ more$/ })
      if (await more.count()) {
        const count = Number((await more.getAttribute('aria-label'))!.match(/\d+/)![0])
        expect(count).toBeLessThanOrEqual(3)
        await expect(nav.locator('[data-breadcrumb-hidden][data-slot="breadcrumb-item"]')).toHaveCount(count)
      }
      await expect(nav.getByRole('link', { name: 'Presets' })).toHaveCount(0)
    })
  })
}

for (const edition of ['radix', 'base'] as const) {
  test(`${edition}: a scrolling Dialog body keeps the footer on screen in every family`, async ({ page }) => {
    for (const family of ['ombelle', 'flat', 'minimalist', 'neo-brutalism', 'liquid-glass']) {
      await page.goto(`/editions/${family}/${edition}/?mode=light`)
      const section = page.getByTestId('variants-075')
      await expect(section).toBeVisible({ timeout: 60000 })
      await section.getByRole('button', { name: 'Export preset' }).click()
      const dialog = page.getByRole('dialog', { name: 'Export preset' })
      await expect(dialog.getByRole('region', { name: 'Export preset' }), family).toHaveAttribute('data-overflowing', '')
      await expect(dialog.getByRole('button', { name: 'Cancel' }), family).toBeInViewport()
      await page.keyboard.press('Escape')
    }
  })
}
