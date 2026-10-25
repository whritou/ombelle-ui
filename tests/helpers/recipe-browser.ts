import { expect, type Page, type Locator } from '@playwright/test'
import AxeBuilder from '@axe-core/playwright'
import { enlargeFixtureText } from './text-enlargement.js'
import type { RecipeMeasurement } from '../../scripts/recipe-evidence.ts'

export async function assertRecipeIsolation(
  page: Page,
  base: string,
  mode: string,
  recipeId: string,
) {
  const neighbors = await page
    .locator('[data-testid="specimen"]')
    .evaluate((el) =>
      Array.from(el.querySelectorAll('[data-slot]')).map((n) => {
        const s = getComputedStyle(n)
        return {
          s: s.cssText,
          color: s.color,
          background: s.backgroundColor,
          border: s.border,
          radius: s.borderRadius,
          height: s.height,
        }
      }),
    )
  await page.goto(base + '?mode=' + mode + '&recipes=1&recipe=' + recipeId)
  await expect(page.getByTestId('recipe-fixture')).toBeVisible()
  await expect(page.locator('main')).toHaveAttribute('data-ready', 'true')
  const after = await page.locator('[data-testid="specimen"]').evaluate((el) =>
    Array.from(el.querySelectorAll('[data-slot]')).map((n) => {
      const s = getComputedStyle(n)
      return {
        s: s.cssText,
        color: s.color,
        background: s.backgroundColor,
        border: s.border,
        radius: s.borderRadius,
        height: s.height,
      }
    }),
  )
  expect(after).toEqual(neighbors)
}

export async function assertRecipeStates(page: Page, button: Locator) {
  await button.focus()
  await expect(button).toBeFocused()
  expect(
    await button.evaluate((el) =>
      parseFloat(getComputedStyle(el).outlineWidth),
    ),
  ).toBeGreaterThanOrEqual(3)
  await page.keyboard.press('Enter')
  await page.keyboard.press('Space')
  await button.click()
  await expect(page.getByTestId('recipe-clicks')).toHaveText('3')
  await page.getByRole('button', { name: 'Toggle recipe loading' }).click()
  await expect(button).toBeDisabled()
  await expect(button).toHaveAttribute('aria-busy', 'true')
  await expect(button).toHaveAccessibleName('Recipe action')
  await button.evaluate((el) => (el as HTMLButtonElement).click())
  await expect(page.getByTestId('recipe-clicks')).toHaveText('3')
  await page.getByRole('button', { name: 'Toggle recipe loading' }).click()
  await page.getByRole('button', { name: 'Toggle recipe disabled' }).click()
  await expect(button).toBeDisabled()
  await button.evaluate((el) => (el as HTMLButtonElement).click())
  await expect(page.getByTestId('recipe-clicks')).toHaveText('3')
  await page.getByRole('button', { name: 'Toggle recipe disabled' }).click()
  await page.emulateMedia({ reducedMotion: 'no-preference' })
  await button.evaluate((el) =>
    el.style.setProperty('--motion-duration', '150ms'),
  )
  expect(
    await button.evaluate((el) =>
      getComputedStyle(el)
        .transitionDuration.split(',')
        .every((v) => parseFloat(v) > 0),
    ),
  ).toBe(true)
  await page.emulateMedia({ reducedMotion: 'reduce' })
  expect(
    await button.evaluate((el) =>
      getComputedStyle(el)
        .transitionDuration.split(',')
        .every((v) => parseFloat(v) === 0),
    ),
  ).toBe(true)
  await page.emulateMedia({ forcedColors: 'active' })
  await page.keyboard.press('Tab')
  await button.focus()
  expect(
    await button.evaluate((el) => getComputedStyle(el).outlineStyle),
  ).not.toBe('none')
  await page.emulateMedia({ forcedColors: 'none' })
  expect(
    (
      await new AxeBuilder({ page })
        .include('[data-testid="recipe-fixture"]')
        .analyze()
    ).violations,
  ).toEqual([])
}

export async function measureRecipeTextLayouts(
  page: Page,
  button: Locator,
  {
    base,
    mode,
    recipeId,
    scope,
  }: { base: string; mode: string; recipeId: string; scope: string },
): Promise<RecipeMeasurement['textEvidence']> {
  const textEvidence: RecipeMeasurement['textEvidence'] = []
  for (const width of [1100, 320]) {
    await page.setViewportSize({ width, height: 800 })
    await page.goto(
      base +
        '?mode=' +
        mode +
        '&recipes=1&recipe=' +
        recipeId +
        '&recipeStates=1&tamper=1',
    )
    await expect(page.getByTestId('recipe-states')).toBeVisible()
    await expect(button).toHaveAttribute('data-slot', 'recipe-button')
    await expect(button).toHaveAttribute('data-ombelle-recipe', scope)
    for (const size of ['sm', 'default', 'lg', 'icon'])
      await expect(
        page.getByTestId('recipe-size-' + size),
      ).toHaveAccessibleName('Visible ' + size + ' text')
    if (width === 1100) {
      for (const variant of [
        'default',
        'secondary',
        'outline',
        'ghost',
        'link',
        'destructive',
      ])
        await expect(
          page.getByTestId('recipe-variant-' + variant),
        ).toHaveAccessibleName(variant + ' action')
      expect(
        (
          await new AxeBuilder({ page })
            .include('[data-testid="recipe-fixture"]')
            .analyze()
        ).violations,
      ).toEqual([])
    }
    const samples = (await enlargeFixtureText(page, 2)).filter((s) =>
      s.selector.includes('button'),
    )
    expect(samples.length).toBeGreaterThan(10)
    for (const s of samples) expect(s.after / s.before).toBeCloseTo(2, 1)
    expect(
      await page
        .getByTestId('recipe-fixture')
        .evaluate((el) =>
          Array.from(el.querySelectorAll('[data-slot="recipe-button"]')).every(
            (n) =>
              n.scrollWidth <= n.clientWidth + 1 &&
              n.scrollHeight <= n.clientHeight + 1,
          ),
        ),
    ).toBe(true)
    const overflow = await page.evaluate(() => ({
      width: window.innerWidth,
      actual: document.documentElement.scrollWidth,
      offenders: Array.from(document.querySelectorAll('body *'))
        .filter(
          (el) => el.getBoundingClientRect().right > window.innerWidth + 1,
        )
        .slice(0, 8)
        .map((el) => ({
          tag: el.tagName,
          text: el.textContent?.slice(0, 45),
          right: el.getBoundingClientRect().right,
        })),
    }))
    expect(overflow.actual, JSON.stringify(overflow)).toBeLessThanOrEqual(
      overflow.width,
    )
    textEvidence.push({ width, samples })
  }

  return textEvidence
}
