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
