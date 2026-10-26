import { expect, test, type Page } from '@playwright/test'
import AxeBuilder from '@axe-core/playwright'
import { supportedStyleFamilies } from '../../packages/contracts/src/style-families.js'
import { createBrowserReferenceCache } from '../helpers/browser-references.js'
import {
  browserApps,
  componentReferenceKey,
  componentUrl,
  expectComponentFocus,
  expectComponentSources,
  expectComponentTargets,
  sampleComponentFixture,
} from '../helpers/component-browser.js'

const sample = (page: Page) => sampleComponentFixture(page, 'checkbox-fixture', true)
const references = createBrowserReferenceCache<Awaited<ReturnType<typeof sample>>>()

for (const family of supportedStyleFamilies)
  for (const mode of ['light', 'dark'])
    for (const app of browserApps)
      test(`Checkbox ${family}/${mode}/${app}: parity, mixed state, forms and accessibility`, async ({ page }) => {
        const query = '?checkboxes=1&mode=' + mode
        await page.emulateMedia({ reducedMotion: 'reduce', forcedColors: 'none' })
        const key = await componentReferenceKey(page, family, mode)
        const reference = await references(key, async () => {
          await page.goto(componentUrl('preview', family, query))
          return sample(page)
        })
        await page.goto(componentUrl(app, family, query))
        const actual = await sample(page)
        expect(actual).toEqual(reference)
        expectComponentSources('checkbox', family, app)
        await expect(page.locator('html')).toHaveClass(mode === 'dark' ? /dark/ : '')
        const fixture = page.getByTestId('checkbox-fixture')
        const checkbox = fixture.getByRole('checkbox', { name: 'Accept updates', exact: true })
        const mixed = fixture.getByRole('checkbox', { name: 'Review all teams' })
        const disabled = fixture.getByRole('checkbox', { name: 'Archived preference' })
        const invalid = fixture.getByRole('checkbox', { name: 'Required approval' })
        await expect(checkbox).not.toBeChecked()
        await expect(mixed).toHaveAttribute('aria-checked', 'mixed')
        await expect(disabled).toBeDisabled()
        await expect(disabled).toHaveCSS('opacity', '0.5')
        await expect(invalid).toHaveAttribute('aria-invalid', 'true')
        const invalidStyle = await invalid.evaluate((element) => {
          const style = getComputedStyle(element)
          return { width: parseFloat(style.borderTopWidth), color: style.borderTopColor }
        })
        expect(invalidStyle.width).toBeGreaterThanOrEqual(2)
        expect(invalidStyle.color).not.toBe(
          await checkbox.evaluate((element) => getComputedStyle(element).borderTopColor),
        )
        expect(await checkbox.evaluate((element) => getComputedStyle(element).boxShadow) === 'none')
          .toBe(family !== 'neo-brutalism')
        await expectComponentTargets(fixture, '[data-slot="checkbox"]', 4)

        const submit = () => fixture.getByRole('button', { name: 'Submit preferences' }).click()
        const result = fixture.getByTestId('checkbox-form-result')
        await submit()
        await expect(result).toHaveText('[]')
        await checkbox.focus()
        await page.keyboard.press('Space')
        await mixed.click()
        await submit()
        await expect(result).toHaveText('[["updates","yes"],["teams","all"]]')
        await fixture.getByRole('button', { name: 'Reset preferences' }).click()
        await expect(checkbox).not.toBeChecked()
        await expect(mixed).toHaveAttribute('aria-checked', 'mixed')
        await submit()
        await expect(result).toHaveText('[]')
        await page.keyboard.press('Tab')
        await expectComponentFocus(checkbox)
        await fixture.getByRole('button', { name: 'Use right-to-left layout' }).click()
        await expect(fixture).toHaveAttribute('dir', 'rtl')
        await checkbox.focus()
        await page.keyboard.press('Space')
        await expect(checkbox).toBeChecked()
        await checkbox.blur()
        const axe = await new AxeBuilder({ page }).analyze()
        expect(axe.violations).toEqual([])
        await test.info().attach('checkbox-measurements', {
          body: Buffer.from(JSON.stringify({
            family, mode, app, node: process.version,
            browser: page.context().browser()?.version(),
            styles: actual.styles, axeViolations: axe.violations,
            checks: ['sourceParity', 'normalizedDOM', 'mixedState', 'disabled', 'invalid', 'formSubmission', 'formReset', 'focus', 'targetSize', 'rtl', 'reducedMotion'],
          }, null, 2)),
          contentType: 'application/json',
        })
        await page.goto(new URL('?mode=' + mode, page.url()).href)
        await expect(page.locator('main')).toHaveAttribute('data-ready', 'true')
        await expect(page.getByTestId('checkbox-fixture')).toHaveCount(0)
      })
