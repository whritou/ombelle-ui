import { expect, test, type Locator, type Page } from '@playwright/test'

// The 0.7.5 primitives' browser behaviour, in both editions, on the edition parity pages
// (fixtures/shared/edition-scenario*.tsx, section "Primitives").
const open = async (page: Page, edition: string) => {
  await page.goto(`/editions/ombelle/${edition}/?mode=light`)
  await expect(page.getByTestId('primitives-075')).toBeVisible({ timeout: 60000 })
}

const radii = (locator: Locator) =>
  locator.evaluate(element => {
    const style = getComputedStyle(element)
    return {
      startStart: style.borderStartStartRadius,
      startEnd: style.borderStartEndRadius,
      endStart: style.borderEndStartRadius,
      endEnd: style.borderEndEndRadius,
    }
  })
const zIndex = (locator: Locator) => locator.evaluate(element => Number(getComputedStyle(element).zIndex) || 0)

for (const edition of ['radix', 'base'] as const) {
  test.describe(edition, () => {
    test('Toggle flips aria-pressed with Space and Enter', async ({ page }) => {
      await open(page, edition)
      const toggle = page.getByTestId('toggle-bold')
      await toggle.focus()
      await expect(toggle).toHaveAttribute('aria-pressed', 'false')
      await page.keyboard.press('Space')
      await expect(toggle).toHaveAttribute('aria-pressed', 'true')
      await page.keyboard.press('Enter')
      await expect(toggle).toHaveAttribute('aria-pressed', 'false')
    })

    test('Collapsible flips aria-expanded and keeps closed links out of the Tab order', async ({ page }) => {
      await open(page, edition)
      const trigger = page.getByTestId('collapsible-advanced').getByRole('button', { name: 'Advanced' })
      const link = page.getByRole('link', { name: 'Shadow offsets' })
      await expect(trigger).toHaveAttribute('aria-expanded', 'false')
      await trigger.focus()
      await page.keyboard.press('Tab')
      expect(await page.evaluate(() => document.activeElement?.getAttribute('href'))).not.toBe('#collapsible-link')
      await trigger.focus()
      await page.keyboard.press('Enter')
      await expect(trigger).toHaveAttribute('aria-expanded', 'true')
      await expect(link).toBeVisible()
      await trigger.focus()
      await page.keyboard.press('Tab')
      await expect(link).toBeFocused()
      await trigger.focus()
      await page.keyboard.press('Space')
      await expect(trigger).toHaveAttribute('aria-expanded', 'false')
    })

    test('an overflowing Scroll Area is named, focusable, keyboard scrollable and shows its thumb on hover', async ({ page }) => {
      await open(page, edition)
      const area = page.getByTestId('scroll-long')
      const viewport = area.locator('[data-slot="scroll-area-viewport"]')
      await expect(viewport).toHaveAccessibleName('Release notes')
      await expect(viewport).toHaveAttribute('tabindex', '0')
      await viewport.focus()
      await page.keyboard.press('ArrowDown')
      await expect.poll(() => viewport.evaluate(element => element.scrollTop)).toBeGreaterThan(0)
      const afterArrow = await viewport.evaluate(element => element.scrollTop)
      await page.keyboard.press('PageDown')
      await expect.poll(() => viewport.evaluate(element => element.scrollTop)).toBeGreaterThan(afterArrow)
      await area.hover()
      await expect(area.locator('[data-slot="scroll-area-thumb"]').first()).toBeVisible()
      await expect
        .poll(() => area.locator('[data-slot="scroll-area-scrollbar"]').first().evaluate(element => getComputedStyle(element).opacity))
        .not.toBe('0')
    })

    test('a short Scroll Area has no tab stop and no visible scrollbar on hover', async ({ page }) => {
      await open(page, edition)
      const area = page.getByTestId('scroll-short')
      const viewport = area.locator('[data-slot="scroll-area-viewport"]')
      await expect(viewport).toHaveAccessibleName('Short note')
      await expect(viewport).not.toHaveAttribute('tabindex', /.*/)
      await area.hover()
      await page.waitForTimeout(300)
      const visible = await area.locator('[data-slot="scroll-area-scrollbar"]').evaluateAll(
        elements =>
          elements.filter(element => {
            const style = getComputedStyle(element)
            return style.opacity !== '0' && style.visibility !== 'hidden' && style.display !== 'none' && element.getAttribute('data-state') !== 'hidden'
          }).length,
      )
      expect(visible).toBe(0)
    })

    test('Button Group joins its children, keeps a single child round and lifts the focused child', async ({ page }) => {
      await open(page, edition)
      const group = page.getByRole('group', { name: 'Alignment' })
      await expect(group).toBeVisible()
      const first = group.getByRole('button', { name: 'Left' })
      const second = group.getByRole('button', { name: 'Right' })
      const start = await radii(first)
      expect(start.startEnd).toBe('0px')
      expect(start.endEnd).toBe('0px')
      expect(start.startStart).not.toBe('0px')
      expect(start.endStart).not.toBe('0px')
      const end = await radii(second)
      expect(end.startStart).toBe('0px')
      expect(end.endStart).toBe('0px')
      expect(end.startEnd).not.toBe('0px')
      expect(end.endEnd).not.toBe('0px')
      const single = await radii(page.getByRole('group', { name: 'Single action' }).getByRole('button', { name: 'Only' }))
      for (const value of Object.values(single)) expect(value).not.toBe('0px')
      await page.keyboard.press('Tab')
      await first.focus()
      await expect(first).toBeFocused()
      expect(await zIndex(first)).toBeGreaterThan(await zIndex(second))
    })

    test('Item group is a list, and a link Item takes one Tab before its action', async ({ page }) => {
      await open(page, edition)
      const group = page.getByRole('list', { name: 'Projects' })
      await expect(group.getByRole('listitem')).toHaveCount(2)
      const link = page.getByTestId('item-link')
      await expect(link).toHaveRole('link')
      await expect(link.getByRole('button')).toHaveCount(0)
      const action = group.getByRole('button', { name: 'Archive' })
      // The Button before the group is the previous Tab stop.
      await page.getByRole('group', { name: 'Single action' }).getByRole('button', { name: 'Only' }).focus()
      await page.keyboard.press('Tab')
      await expect(link).toBeFocused()
      const ring = await link.evaluate(element => {
        const style = getComputedStyle(element)
        return { outline: style.outlineStyle, shadow: style.boxShadow }
      })
      expect(ring.outline !== 'none' || ring.shadow !== 'none').toBe(true)
      await page.keyboard.press('Tab')
      await expect(action).toBeFocused()
    })
  })
}
