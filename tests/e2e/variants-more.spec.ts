import { expect, test, type Page } from '@playwright/test'

// The 0.7.3 batch 6b and 6c variants in both editions, on the edition pages
// (fixtures/shared/edition-scenario*.tsx, section "More variants").
const open = async (page: Page, edition: string) => {
  await page.goto(`/editions/ombelle/${edition}/?mode=light`)
  await expect(page.getByTestId('variants-more')).toBeVisible({ timeout: 60000 })
}

for (const edition of ['radix', 'base'] as const) {
  test.describe(edition, () => {
    test('vertical tabs move with the up and down arrows', async ({ page }) => {
      await open(page, edition)
      const list = page.getByTestId('variants-more').getByRole('tablist', { name: 'Settings sections' })
      await list.getByRole('tab', { name: 'General' }).focus()
      await page.keyboard.press('ArrowDown')
      await expect(list.getByRole('tab', { name: 'Members' })).toBeFocused()
      await expect(list.getByRole('tab', { name: 'Members' })).toHaveAttribute('aria-selected', 'true')
      await page.keyboard.press('ArrowUp')
      await expect(list.getByRole('tab', { name: 'General' })).toBeFocused()
    })

    test('a pill tab is named with its count', async ({ page }) => {
      await open(page, edition)
      await expect(page.getByTestId('variants-more').getByRole('tab', { name: /^Review\s*3$/ })).toBeVisible()
    })

    test('compact pagination moves between pages and is disabled at the ends', async ({ page }) => {
      await open(page, edition)
      const nav = page.getByTestId('vm-compact')
      await expect(nav).toContainText('Page 1 of 3')
      // A disabled end has no href, so it is found by its name, not by the link role.
      const previous = nav.locator('[aria-label="Previous page"]'), next = nav.locator('[aria-label="Next page"]')
      await expect(previous).toHaveAttribute('aria-disabled', 'true')
      await next.click()
      await next.click()
      await expect(nav).toContainText('Page 3 of 3')
      await expect(next).toHaveAttribute('aria-disabled', 'true')
    })

    test('the page size select updates the range', async ({ page }) => {
      await open(page, edition)
      await page.getByTestId('variants-more').getByLabel('Rows per page').selectOption('50')
      await expect(page.getByTestId('vm-range')).toHaveText('1–50 of 290')
    })
  })
}

for (const edition of ['radix', 'base'] as const) {
  test.describe(`${edition} table`, () => {
    test('sorting cycles aria-sort, and the header stays in view as the rows scroll', async ({ page }) => {
      await open(page, edition)
      const table = page.getByTestId('vm-table')
      const updated = table.getByRole('columnheader', { name: /Updated/ })
      await expect(updated).toHaveAttribute('aria-sort', 'descending')
      await updated.getByRole('button').click()
      await expect(updated).toHaveAttribute('aria-sort', 'ascending')
      await expect(table.getByRole('row').nth(1)).toContainText('5 min ago')
      const container = table.locator('[data-slot$="table-container"]')
      await container.evaluate(element => { element.scrollTop = 200 })
      const [box, head] = await Promise.all([container.boundingBox(), updated.boundingBox()])
      expect(Math.abs(head!.y - box!.y)).toBeLessThan(2)
      // The sort button keeps a visible ring above the scrolled rows.
      await table.getByTestId('vm-table-loading').focus()
      await page.keyboard.press('Tab')
      await expect(updated.getByRole('button')).toBeFocused()
      const ring = await updated.getByRole('button').evaluate(element => parseFloat(getComputedStyle(element).outlineWidth))
      expect(ring).toBeGreaterThanOrEqual(2)
      const covered = await updated.getByRole('button').evaluate(element => {
        const rect = element.getBoundingClientRect()
        return document.elementFromPoint(rect.left + rect.width / 2, rect.top + rect.height / 2) !== element && !element.contains(document.elementFromPoint(rect.left + rect.width / 2, rect.top + rect.height / 2))
      })
      expect(covered).toBe(false)
    })

    test('the actions column is named, and loading marks the table busy with skeleton rows', async ({ page }) => {
      await open(page, edition)
      const table = page.getByTestId('vm-table')
      await expect(table.getByRole('columnheader', { name: 'Actions' })).toHaveCount(1)
      await table.getByTestId('vm-table-loading').click()
      await expect(table.getByRole('table', { name: 'Deploys' })).toHaveAttribute('aria-busy', 'true')
      await expect(table.locator('[data-slot$="table-skeleton"]')).toHaveCount(9)
    })
  })
}

for (const edition of ['radix', 'base'] as const) {
  test.describe(`${edition} fields`, () => {
    test('Clear empties a controlled field and returns focus to it, and hides on an empty field', async ({ page }) => {
      await open(page, edition)
      const fields = page.getByTestId('vm-fields')
      const search = fields.getByRole('textbox', { name: 'Search projects' })
      await expect(fields.getByRole('button', { name: 'Clear search' })).toBeHidden()
      await search.fill('glass toast')
      await fields.getByRole('button', { name: 'Clear search' }).click()
      await expect(search).toHaveValue('')
      await expect(search).toBeFocused()
      await expect(fields.getByRole('button', { name: 'Clear search' })).toBeHidden()
    })

    test('the counter turns live near the limit and destructive past it', async ({ page }) => {
      await open(page, edition)
      const fields = page.getByTestId('vm-fields')
      const count = fields.locator('#vm-bio-count')
      await expect(count).not.toHaveAttribute('aria-live')
      await fields.getByRole('textbox', { name: 'Bio' }).fill('x'.repeat(150))
      await expect(count).toHaveAttribute('aria-live', 'polite')
      await fields.getByRole('textbox', { name: 'Bio' }).fill('x'.repeat(170))
      await expect(count).toHaveText('170 / 160')
      await expect(count).toHaveAttribute('data-over', '')
      await expect(fields.getByRole('textbox', { name: 'Bio' })).toHaveAccessibleDescription('170 / 160')
    })

    test('small and large inputs are shorter and taller than the default', async ({ page }) => {
      await open(page, edition)
      const fields = page.getByTestId('vm-fields')
      const height = (name: string) => fields.getByRole('textbox', { name }).evaluate(element => element.getBoundingClientRect().height)
      const [small, normal, large] = [await height('Small input'), await height('Default input'), await height('Large input')]
      expect(small).toBeLessThan(normal)
      expect(large).toBeGreaterThan(normal)
      expect(small).toBeGreaterThanOrEqual(24)
    })
  })
}

for (const edition of ['radix', 'base'] as const) {
  test.describe(`${edition} select`, () => {
    test('a multiple Select chooses by keyboard and pointer, stays open, submits every value and resets', async ({ page }) => {
      await open(page, edition)
      const form = page.getByTestId('vm-select')
      const trigger = form.getByRole('combobox', { name: 'Roles' })
      await expect(trigger).toContainText('Choose roles')
      await trigger.focus()
      await page.keyboard.press('ArrowDown')
      const list = page.getByRole('listbox')
      await expect(list).toBeVisible()
      await expect(list).toHaveAttribute('aria-multiselectable', 'true')
      // Choose Designer and Engineer with the keyboard.
      const choose = async (name: string) => {
        for (let step = 0; step < 6; step++) {
          const active = await page.evaluate(() => {
            const id = document.activeElement?.getAttribute('aria-activedescendant')
            const option = id ? document.getElementById(id) : document.activeElement?.closest('[role=option]') ?? document.querySelector('[role=option][data-highlighted]')
            return option?.textContent ?? ''
          })
          if (active.includes(name)) break
          await page.keyboard.press('ArrowDown')
        }
        await page.keyboard.press(edition === 'radix' ? 'Space' : 'Enter')
      }
      await choose('Designer')
      await choose('Engineer')
      await expect(list).toBeVisible()
      await list.getByRole('option', { name: 'Researcher' }).click()
      await expect(list).toBeVisible()
      for (const name of ['Designer', 'Engineer', 'Researcher'])
        await expect(list.getByRole('option', { name })).toHaveAttribute('aria-selected', 'true')
      await page.keyboard.press('Escape')
      await expect(list).toBeHidden()
      await expect(trigger).toBeFocused()
      const chips = form.locator('[data-slot$="select-chip"]')
      await expect(chips).toHaveText(['Designer', 'Engineer', 'Researcher'])
      await form.getByTestId('vm-select-submit').click()
      await expect(form.getByTestId('vm-select-output')).toHaveText('designer,engineer,researcher')
      // A value changed from outside updates the chips at once.
      await form.getByTestId('vm-select-reset').click()
      await expect(chips).toHaveCount(0)
      await expect(trigger).toContainText('Choose roles')
      await trigger.click()
      await expect(page.getByRole('listbox').getByRole('option', { name: 'Designer' })).toHaveAttribute('aria-selected', 'false')
    })
  })
}

// Toast timers run on Playwright's clock, installed before the page loads.
const openWithClock = async (page: Page, edition: string) => {
  await page.clock.install()
  await open(page, edition)
}
const toastNamed = (page: Page, title: string) => page.locator('[data-slot$="toast"]').filter({ hasText: title })
// The installed clock also fakes animation frames, which hover()'s stability check waits on: move the pointer instead.
const pointAt = async (page: Page, target: ReturnType<Page['locator']>) => {
  const box = (await target.boundingBox())!
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2)
}
// Elements that would announce the text: live regions that are not off, and status or alert roles.
const announcers = (page: Page, text: string) => page.evaluate(text => [...document.querySelectorAll('[aria-live], [role=status], [role=alert], [role=log]')]
  .filter(element => element.getAttribute('aria-live') !== 'off' && (element.textContent ?? '').includes(text))
  // Count the outermost announcer only; a nested one is part of the same announcement.
  .filter((element, _, list) => !list.some(other => other !== element && other.contains(element))).length, text)

for (const edition of ['radix', 'base'] as const) {
  test.describe(`${edition} toast`, () => {
    test('a short toast stays 6 seconds, and a toast with an action stays until dismissed', async ({ page }) => {
      await openWithClock(page, edition)
      const toasts = page.getByTestId('vm-toasts')
      await toasts.getByRole('button', { name: 'Show short toast' }).click()
      await expect(toastNamed(page, 'Preset saved')).toBeVisible()
      await page.clock.runFor(5500)
      await expect(toastNamed(page, 'Preset saved')).toBeVisible()
      await page.clock.runFor(1500)
      await expect(toastNamed(page, 'Preset saved')).toHaveCount(0)
      await toasts.getByRole('button', { name: 'Show action toast' }).click()
      await page.clock.runFor(30000)
      await expect(toastNamed(page, 'Project archived')).toBeVisible()
    })

    test('a toast pauses while hovered and while focused', async ({ page }) => {
      await openWithClock(page, edition)
      const toasts = page.getByTestId('vm-toasts')
      await toasts.getByRole('button', { name: 'Show short toast' }).click()
      const toast = toastNamed(page, 'Preset saved')
      await pointAt(page, toast)
      await page.clock.runFor(8000)
      await expect(toast, 'still open while hovered').toBeVisible()
      await page.mouse.move(0, 0)
      await page.clock.runFor(7000)
      await expect(toast).toHaveCount(0)
      await toasts.getByRole('button', { name: 'Show short toast' }).click()
      await page.clock.runFor(100)
      await expect(toastNamed(page, 'Preset saved')).toBeVisible()
      // A keyboard user's focus: Base UI pauses for focus-visible only, as keyboard focus is.
      await page.keyboard.press('Shift')
      await toastNamed(page, 'Preset saved').locator('button').first().focus()
      await page.clock.runFor(8000)
      await expect(toastNamed(page, 'Preset saved'), 'still open while focused').toBeVisible()
    })

    test('a toast is announced by exactly one live region', async ({ page }) => {
      await openWithClock(page, edition)
      await page.getByTestId('vm-toasts').getByRole('button', { name: 'Show short toast' }).click()
      await expect(toastNamed(page, 'Preset saved')).toBeVisible()
      await page.clock.runFor(100)
      expect(await announcers(page, 'Preset saved')).toBe(1)
    })

    test('ToastPromise follows the task to success or to an error, and stays open while pending', async ({ page }) => {
      const errors: string[] = []
      page.on('console', message => { if (message.type() === 'error') errors.push(message.text()) })
      await openWithClock(page, edition)
      const toasts = page.getByTestId('vm-toasts')
      await toasts.getByRole('button', { name: 'Publish preset' }).click()
      await expect(toastNamed(page, 'Publishing preset…')).toBeVisible()
      await expect(toastNamed(page, 'Publishing preset…').locator('[data-slot$="toast-spinner"]')).toHaveCount(1)
      await page.clock.runFor(20000)
      await expect(toastNamed(page, 'Publishing preset…')).toBeVisible()
      await page.evaluate(() => (window as unknown as { __vmSettle: () => void }).__vmSettle())
      await expect(toastNamed(page, 'Ombelle published')).toHaveAttribute('data-variant', 'success')
      await toasts.getByRole('button', { name: 'Publish offline' }).click()
      await page.evaluate(() => (window as unknown as { __vmSettle: () => void }).__vmSettle())
      await expect(toastNamed(page, 'Publishing failed')).toHaveAttribute('data-variant', 'destructive')
      // Settling after the component has gone logs nothing.
      await toasts.getByRole('button', { name: 'Publish and leave' }).click()
      await page.getByRole('button', { name: 'Leave', exact: true }).click()
      await page.evaluate(() => (window as unknown as { __vmSettle: () => void }).__vmSettle())
      await page.clock.runFor(1000)
      expect(errors).toEqual([])
    })

    test('stacked toasts overlap, and spread out on hover', async ({ page }) => {
      await openWithClock(page, edition)
      await page.getByTestId('vm-toasts').getByRole('button', { name: 'Show three toasts' }).click()
      const viewport = page.getByTestId('vm-toast-viewport')
      await expect(viewport).toHaveAttribute('data-stack', '')
      const tops = () => viewport.locator('[data-slot$="toast"]').filter({ hasText: 'notification' }).evaluateAll(list => list.map(item => Math.round(item.getBoundingClientRect().top)))
      await expect.poll(async () => (await tops()).length).toBe(3)
      const collapsed = await tops()
      // Collapsed, the layers sit inside the front toast's height: the spread is far taller.
      expect(Math.max(...collapsed) - Math.min(...collapsed)).toBeLessThan(48)
      await pointAt(page, viewport.locator('[data-slot$="toast"]').filter({ hasText: 'Third notification' }))
      await page.clock.runFor(500)
      const spread = await tops()
      expect(Math.max(...spread) - Math.min(...spread)).toBeGreaterThan(60)
      // The newest is in front and at the bottom in both editions, and the layers behind it stay below its top.
      const order = await viewport.locator('[data-slot$="toast"]').evaluateAll(list => list.map(item => item.textContent ?? ''))
      expect(order.at(-1)).toContain('Third notification')
      await page.mouse.move(0, 0)
      await page.clock.runFor(500)
      const boxes = await viewport.locator('[data-slot$="toast"]').evaluateAll(list => list.map(item => { const r = item.getBoundingClientRect(); return { top: r.top, bottom: r.bottom } }))
      const front = boxes.at(-1)!
      for (const layer of boxes.slice(0, -1)) expect(layer.top).toBeGreaterThanOrEqual(front.top)
      expect(Math.round(boxes.at(-2)!.bottom - front.bottom)).toBe(10)
      expect(Math.round(boxes.at(-3)!.bottom - front.bottom)).toBe(20)
    })
  })
}

for (const edition of ['radix', 'base'] as const) {
  test.describe(`${edition} sheet`, () => {
    test('the bottom handle resizes by keyboard, and a drag below a quarter closes the sheet', async ({ page }) => {
      await open(page, edition)
      const sheets = page.getByTestId('vm-sheets')
      await sheets.getByRole('button', { name: 'Filter projects' }).click()
      const handle = page.getByRole('separator', { name: 'Resize sheet' })
      await expect(handle).toBeVisible()
      await handle.focus()
      const dialog = page.getByRole('dialog', { name: 'Filter projects' })
      const percent = async () => Math.round((await dialog.boundingBox())!.height / page.viewportSize()!.height * 100)
      const opened = await percent()
      // The handle names the sheet's real height, and Arrow Down makes it shorter.
      const before = Number(await handle.getAttribute('aria-valuenow'))
      expect(before).toBe(Math.min(95, Math.max(25, opened)))
      await page.keyboard.press('ArrowDown')
      await expect(handle).toHaveAttribute('aria-valuenow', String(Math.max(25, before - 10)))
      expect(await percent()).toBeLessThanOrEqual(Math.max(opened, 25))
      await page.keyboard.press('ArrowUp')
      await expect(handle).toHaveAttribute('aria-valuenow', String(Math.min(95, Math.max(25, before - 10) + 10)))
      await page.keyboard.press('End')
      await expect(handle).toHaveAttribute('aria-valuenow', '95')
      const box = (await handle.boundingBox())!
      await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2)
      await page.mouse.down()
      await page.mouse.move(box.x + box.width / 2, 790, { steps: 8 })
      await page.mouse.up()
      await expect(page.getByRole('dialog', { name: 'Filter projects' })).toHaveCount(0)
      await expect(sheets.getByRole('button', { name: 'Filter projects' })).toBeFocused()
      // Reopened, the sheet follows its content again, as it did the first time.
      await sheets.getByRole('button', { name: 'Filter projects' }).click()
      await expect(handle).toHaveAttribute('aria-valuenow', String(before))
      expect(await percent()).toBe(opened)
    })

    test('the side sheet resizes by keyboard and pointer within its bounds and the viewport', async ({ page }) => {
      await page.setViewportSize({ width: 700, height: 800 })
      await open(page, edition)
      const sheets = page.getByTestId('vm-sheets')
      await sheets.getByRole('button', { name: 'Open inspector' }).click()
      const grip = page.getByRole('separator', { name: 'Resize panel' })
      await grip.focus()
      await expect(grip).toHaveAttribute('aria-valuenow', '320')
      await page.keyboard.press('ArrowLeft')
      await expect(grip).toHaveAttribute('aria-valuenow', '336')
      await page.keyboard.press('Shift+ArrowLeft')
      await expect(grip).toHaveAttribute('aria-valuenow', '400')
      await page.keyboard.press('Home')
      await expect(grip).toHaveAttribute('aria-valuenow', '240')
      const box = (await grip.boundingBox())!
      await page.mouse.move(box.x + box.width / 2, 400)
      await page.mouse.down()
      await page.mouse.move(box.x - 1000, 400, { steps: 6 })
      await page.mouse.up()
      // 640 is the maximum, but the viewport leaves 700 - 16.
      await expect(grip).toHaveAttribute('aria-valuenow', '640')
      const dialog = page.getByRole('dialog', { name: 'Inspector' })
      expect(Math.round((await dialog.boundingBox())!.width)).toBeLessThanOrEqual(684)
      const now = (await grip.boundingBox())!
      await page.mouse.move(now.x + now.width / 2, 400)
      await page.mouse.down()
      await page.mouse.move(now.x + 1000, 400, { steps: 6 })
      await page.mouse.up()
      await expect(grip).toHaveAttribute('aria-valuenow', '240')
    })
  })
}
