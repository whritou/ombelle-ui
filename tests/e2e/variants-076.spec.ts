import { expect, test, type Page } from '@playwright/test'

// The 0.7.6 variants in both editions, on the edition pages
// (fixtures/shared/edition-scenario*.tsx, section "0.7.6 variants").
const open = async (page: Page, edition: string) => {
  await page.goto(`/editions/ombelle/${edition}/?mode=light`)
  await expect(page.getByTestId('variants-076')).toBeVisible({ timeout: 60000 })
  return page.getByTestId('variants-076')
}

for (const edition of ['radix', 'base'] as const) {
  test.describe(`${edition} Sheet snap points`, () => {
    const setup = async (page: Page) => {
      const section = await open(page, edition)
      const trigger = section.getByRole('button', { name: 'Filters', exact: true })
      const dialog = page.getByRole('dialog', { name: 'Filters', exact: true })
      const handle = page.getByRole('separator', { name: 'Resize Filters' })
      // The sheet's height as a percentage of the viewport, to a tenth.
      const percent = async () => Math.round((await dialog.boundingBox())!.height / page.viewportSize()!.height * 1000) / 10
      const settled = async (expected: number) => {
        await expect.poll(async () => Math.abs(await percent() - expected)).toBeLessThanOrEqual(1)
      }
      const show = async () => {
        await trigger.click()
        await expect(handle).toBeVisible()
      }
      // Drags the handle by a share of the viewport height (up is positive) and releases it.
      const drag = async (share: number) => {
        const box = (await handle.boundingBox())!
        const x = box.x + box.width / 2, y = box.y + box.height / 2
        await page.mouse.move(x, y)
        await page.mouse.down()
        await page.mouse.move(x, y - share * page.viewportSize()!.height, { steps: 10 })
        await page.mouse.up()
      }
      return { trigger, dialog, handle, percent, settled, show, drag }
    }

    test('opens at the first point and steps between the points by keyboard', async ({ page }) => {
      const { trigger, dialog, handle, settled, show } = await setup(page)
      await show()
      await settled(50)
      await expect(handle).toHaveAttribute('aria-valuetext', 'Half height')
      await expect(handle).toHaveAttribute('aria-valuenow', '50')
      await expect(handle).toHaveAttribute('aria-valuemin', '50')
      await expect(handle).toHaveAttribute('aria-valuemax', '90')
      await handle.focus()
      await page.keyboard.press('ArrowUp')
      await expect(handle).toHaveAttribute('aria-valuetext', 'Full height')
      await settled(90)
      // The highest point is the last: ArrowUp stays there.
      await page.keyboard.press('ArrowUp')
      await expect(handle).toHaveAttribute('aria-valuenow', '90')
      await page.keyboard.press('Home')
      await expect(handle).toHaveAttribute('aria-valuetext', 'Half height')
      await settled(50)
      await page.keyboard.press('End')
      await expect(handle).toHaveAttribute('aria-valuetext', 'Full height')
      await settled(90)
      await page.keyboard.press('ArrowDown')
      await settled(50)
      // ArrowDown on the lowest point closes the sheet and returns focus to its trigger.
      await page.keyboard.press('ArrowDown')
      await expect(dialog).toHaveCount(0)
      await expect(trigger).toBeFocused()
    })

    test('a drag settles on the nearer point, closes below a quarter, and a reopened sheet starts at the first point', async ({ page }) => {
      const { trigger, dialog, handle, settled, show, drag } = await setup(page)
      await show()
      await settled(50)
      // Released at 72 %: nearer 90 % than 50 %.
      await drag(0.22)
      await settled(90)
      await expect(handle).toHaveAttribute('aria-valuetext', 'Full height')
      // Released at 60 %: nearer 50 %.
      await drag(-0.3)
      await settled(50)
      await expect(handle).toHaveAttribute('aria-valuetext', 'Half height')
      // Up to 90 %, then closed by Escape: the sheet opens again at 50 %.
      await drag(0.4)
      await settled(90)
      await page.keyboard.press('Escape')
      await expect(dialog).toHaveCount(0)
      await show()
      await settled(50)
      await expect(handle).toHaveAttribute('aria-valuenow', '50')
      // Released at 20 %: below a quarter, the sheet closes and focus returns to the trigger.
      await drag(-0.3)
      await expect(dialog).toHaveCount(0)
      await expect(trigger).toBeFocused()
      await show()
      await settled(50)
      await expect(handle).toHaveAttribute('aria-valuetext', 'Half height')
    })
  })
}

for (const edition of ['radix', 'base'] as const) {
  test.describe(`${edition} CardAction`, () => {
    test('keeps the title beside the action, whatever the action holds', async ({ page }) => {
      const section = await open(page, edition)
      const card = section.getByTestId('ca-card')
      const title = card.getByTestId('ca-title')
      const description = card.getByTestId('ca-description')
      const action = card.getByTestId('ca-action')
      const button = card.getByTestId('ca-button')
      const measure = async () => {
        const [header, t, d, a, b] = await Promise.all([card.locator('[data-slot="card-header"]'), title, description, action, button].map(async locator => (await locator.boundingBox())!))
        return { header, t, d, a, b }
      }
      // The header's padding, so the tracks are compared with its content box.
      const padding = await card.locator('[data-slot="card-header"]').evaluate(el => parseFloat(getComputedStyle(el).paddingInlineEnd) + parseFloat(getComputedStyle(el).paddingInlineStart))
      const narrow = await measure()
      expect(narrow.b.width).toBe(34)
      expect(narrow.b.height).toBe(34)
      // The action starts at the title's top and runs past the description's top.
      expect(Math.abs(narrow.a.y - narrow.t.y)).toBeLessThanOrEqual(1)
      expect(narrow.a.y + narrow.a.height).toBeGreaterThan(narrow.d.y)
      // Title and description share column 1; the action sits at the end, clear of both.
      expect(narrow.d.x).toBeCloseTo(narrow.t.x, 0)
      expect(narrow.t.x + narrow.t.width + 12).toBeLessThanOrEqual(narrow.a.x + 1)
      expect(narrow.t.width + 12 + narrow.a.width).toBeCloseTo(narrow.header.width - padding, 0)
      await section.getByRole('button', { name: 'Swap the card action' }).click()
      await expect(button).toHaveCSS('width', '120px')
      const wide = await measure()
      // The grid tracks hold: title, a 12px gap and the action fill the header, and the title's top and start do not move.
      expect(wide.t.width + 12 + wide.a.width).toBeCloseTo(wide.header.width - padding, 0)
      expect(wide.a.width).toBeCloseTo(120, 0)
      expect(wide.t.x - wide.header.x).toBeCloseTo(narrow.t.x - narrow.header.x, 0)
      // (Positions are viewport-relative and the click scrolls, so compare the offsets from the header.)
      expect(Math.abs((wide.t.y - wide.header.y) - (narrow.t.y - narrow.header.y))).toBeLessThanOrEqual(1)
      expect(Math.abs(wide.a.y - wide.t.y)).toBeLessThanOrEqual(1)
      expect(wide.t.x + wide.t.width + 12).toBeLessThanOrEqual(wide.a.x + 1)
    })

    test('a click on the action in a CardLink card runs its handler and does not follow the link', async ({ page }) => {
      const section = await open(page, edition)
      const button = section.getByRole('button', { name: 'More actions for Linked preset' })
      const box = (await button.boundingBox())!
      expect(box.width).toBeGreaterThanOrEqual(24)
      expect(box.height).toBeGreaterThanOrEqual(24)
      await button.click()
      await expect(section.getByTestId('ca-clicks')).toHaveText('Action clicks: 1')
      expect(new URL(page.url()).hash).not.toBe('#ca-followed')
      // The rest of the card still follows the link.
      const card = section.getByTestId('ca-link-card')
      const cardBox = (await card.boundingBox())!
      await page.mouse.click(cardBox.x + cardBox.width / 2, cardBox.y + cardBox.height - 6)
      await expect.poll(() => new URL(page.url()).hash).toBe('#ca-followed')
    })

    test('dense stat cards render', async ({ page }) => {
      const section = await open(page, edition)
      const cards = section.getByTestId('ca-stats').locator('[data-slot="card"]')
      await expect(cards).toHaveCount(2)
      await expect(cards.first()).toHaveAttribute('data-density', 'dense')
      await expect(cards.first()).toContainText('53')
      await expect(cards.last()).toContainText('style families')
    })
  })
}
