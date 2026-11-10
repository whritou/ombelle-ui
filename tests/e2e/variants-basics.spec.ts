import { expect, test, type Page } from '@playwright/test'

// The 0.7.3 batch 6a variants in both editions, on the edition pages
// (fixtures/shared/edition-scenario*.tsx, section "Variants").
const open = async (page: Page, edition: string) => {
  await page.goto(`/editions/ombelle/${edition}/?mode=light`)
  await expect(page.getByTestId('variants')).toBeVisible({ timeout: 60000 })
}

for (const edition of ['radix', 'base'] as const) {
  test.describe(edition, () => {
    test('CardGroup takes one Tab stop, moves with the arrows and submits its value', async ({ page }) => {
      await open(page, edition)
      const section = page.getByTestId('variants')
      const radios = section.getByRole('radiogroup', { name: 'Plan', exact: true }).getByRole('radio')
      await expect(radios).toHaveCount(3)
      await expect(section.getByRole('radio', { name: 'Team' })).toBeChecked()
      await expect(section.getByRole('radio', { name: 'Team' })).toHaveAccessibleDescription('Selected option.')
      await page.getByTestId('vb-before-plans').focus()
      await page.keyboard.press('Tab')
      await expect(section.getByRole('radio', { name: 'Team' })).toBeFocused()
      await page.keyboard.press('ArrowRight')
      await expect(section.getByRole('radio', { name: 'Enterprise' })).toBeFocused()
      await expect(section.getByRole('radio', { name: 'Enterprise' })).toBeChecked()
      await page.keyboard.press('Space')
      await expect(section.getByRole('radio', { name: 'Enterprise' })).toBeChecked()
      // One Tab leaves the group for the next control.
      await page.keyboard.press('Tab')
      await expect(page.getByTestId('vb-plan-submit')).toBeFocused()
      await page.getByTestId('vb-plan-submit').click()
      await expect(page.getByTestId('vb-plan-output')).toHaveText('plan=enterprise')
      // The focus ring is drawn on the option card.
      await section.getByRole('radio', { name: 'Enterprise' }).focus()
      await page.keyboard.press('ArrowLeft')
      const option = section.locator('[data-slot$="card-option"]').filter({ has: page.getByRole('radio', { name: 'Team' }) })
      const outline = await option.evaluate(element => parseFloat(getComputedStyle(element).outlineWidth))
      expect(outline).toBeGreaterThanOrEqual(2)
    })

    test('a link card follows its link from anywhere, but its own button stays a button', async ({ page }) => {
      await open(page, edition)
      await page.getByTestId('vb-share').click()
      await expect(page.getByTestId('vb-shared')).toHaveText('Shared')
      expect(new URL(page.url()).hash).toBe('')
      // The stretched link covers the description, so a click there follows it.
      const box = (await page.getByTestId('vb-link-description').boundingBox())!
      await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2)
      await expect(page).toHaveURL(/#featured$/)
      await page.getByTestId('vb-share').focus()
      await page.keyboard.press('Shift+Tab')
      await expect(page.getByRole('link', { name: 'Website refresh' })).toBeFocused()
      const card = page.getByTestId('vb-link-card')
      const outline = await card.evaluate(element => parseFloat(getComputedStyle(element).outlineWidth))
      expect(outline).toBeGreaterThanOrEqual(2)
    })

    test('the Dismiss button removes the alert and the scene moves focus to the next heading', async ({ page }) => {
      await open(page, edition)
      const alert = page.getByTestId('vb-alert')
      await alert.getByRole('button', { name: 'Dismiss' }).click()
      await expect(alert).toHaveCount(0)
      await expect(page.getByTestId('vb-plan-heading')).toBeFocused()
    })

    test('a loading Button never gets narrower, and its min width goes when loading ends', async ({ page }) => {
      await open(page, edition)
      const save = page.getByTestId('vb-save')
      const before = (await save.boundingBox())!.width
      await page.getByTestId('vb-toggle-loading').click()
      await expect(save).toHaveAttribute('aria-busy', 'true')
      expect((await save.boundingBox())!.width).toBeGreaterThanOrEqual(before - 0.5)
      // The kept width never exceeds the container: min(<width>px, 100%).
      const kept = () => save.evaluate(element => Number(/([\d.]+)px/.exec(element.style.minInlineSize)?.[1] ?? NaN))
      expect(await kept()).toBeCloseTo(before, 1)
      expect(await save.evaluate(element => element.style.minInlineSize)).toMatch(/^min\(.*100%\)$/)
      await page.getByTestId('vb-toggle-loading').click()
      await expect(save).not.toHaveAttribute('aria-busy', 'true')
      expect(await save.evaluate(element => element.style.minInlineSize)).toBe('')
      // A label that grows at rest is measured again before the next load.
      await page.getByTestId('vb-longer-label').click()
      const longer = (await save.boundingBox())!.width
      expect(longer).toBeGreaterThan(before)
      await page.getByTestId('vb-toggle-loading').click()
      await expect(save).toHaveAttribute('aria-busy', 'true')
      expect(await kept()).toBeCloseTo(longer, 1)
    })

    test('avatar initials wait 600 ms for a broken image and never show for a fast one', async ({ page }) => {
      await open(page, edition)
      await expect(page.getByTestId('vb-avatar-broken')).toContainText('GH', { timeout: 5000 })
      await expect(page.getByTestId('vb-avatar-fast').locator('img')).toBeVisible()
      await expect(page.getByTestId('vb-avatar-fast')).not.toContainText('HL')
      await expect(page.getByRole('img', { name: '4 more reviewers' })).toHaveText('+4')
    })

    test('the plus accordion shows one icon, a minus while open', async ({ page }) => {
      await open(page, edition)
      const accordion = page.getByTestId('vb-accordion')
      const triggers = accordion.locator('[data-slot$="accordion-trigger"]')
      await expect(triggers.first().locator('svg')).toHaveCount(1)
      const strokes = (index: number) => triggers.nth(index).locator('svg path').evaluateAll(paths =>
        paths.filter(path => getComputedStyle(path).display !== 'none').length)
      expect(await strokes(0)).toBe(1)
      expect(await strokes(1)).toBe(2)
      await triggers.nth(1).click()
      expect(await strokes(1)).toBe(1)
    })
  })
}
