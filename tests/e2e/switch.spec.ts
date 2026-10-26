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

const sample = (page: Page) => sampleComponentFixture(page, 'switch-fixture', true)
const references = createBrowserReferenceCache<Awaited<ReturnType<typeof sample>>>()

for (const family of supportedStyleFamilies)
  for (const mode of ['light', 'dark'])
    for (const app of browserApps)
      test(`Switch ${family}/${mode}/${app}: parity, state, forms, RTL and accessibility`, async ({ page }) => {
        const query = '?switches=1&mode=' + mode
        await page.emulateMedia({ reducedMotion: 'reduce', forcedColors: 'none' })
        const key = await componentReferenceKey(page, family, mode)
        const reference = await references(key, async () => {
          await page.goto(componentUrl('preview', family, query))
          return sample(page)
        })
        await page.goto(componentUrl(app, family, query))
        const actual = await sample(page)
        expect(actual).toEqual(reference)
        expectComponentSources('switch', family, app)
        await expect(page.locator('html')).toHaveClass(mode === 'dark' ? /dark/ : '')
        const fixture = page.getByTestId('switch-fixture')
        const off = fixture.getByRole('switch', { name: 'Live previews' })
        const on = fixture.getByRole('switch', { name: 'Email announcements' })
        const disabled = fixture.getByRole('switch', { name: 'Locked setting' })
        await expect(off).not.toBeChecked()
        await expect(on).toBeChecked()
        await expect(disabled).toBeDisabled()
        await expect(disabled).toHaveCSS('opacity', '0.5')
        await expectComponentTargets(fixture, '[data-slot="switch"]', 3)
        const submit = () => fixture.getByRole('button', { name: 'Submit preferences' }).click()
        const result = fixture.getByTestId('switch-form-result')
        await submit()
        await expect(result).toHaveText('[["announcements","email"]]')
        await off.focus()
        await page.keyboard.press('Space')
        await on.click()
        await submit()
        await expect(result).toHaveText('[["live","enabled"]]')
        await fixture.getByRole('button', { name: 'Reset preferences' }).click()
        await expect(off).not.toBeChecked()
        await expect(on).toBeChecked()
        await submit()
        await expect(result).toHaveText('[["announcements","email"]]')
        await page.keyboard.press('Tab')
        await expectComponentFocus(off)
        await fixture.getByRole('button', { name: 'Use right-to-left layout' }).click()
        await expect(fixture).toHaveAttribute('dir', 'rtl')
        const thumb = () => off.evaluate((element) => {
          const root = element.getBoundingClientRect()
          const mark = element.querySelector('[data-slot="switch-thumb"]')!.getBoundingClientRect()
          return mark.x + mark.width / 2 - (root.x + root.width / 2)
        })
        expect(await thumb()).toBeGreaterThan(0)
        await off.click()
        expect(await thumb()).toBeLessThan(0)
        await off.blur()
        const axe = await new AxeBuilder({ page }).analyze()
        expect(axe.violations).toEqual([])
        await test.info().attach('switch-measurements', {
          body: Buffer.from(JSON.stringify({
            family, mode, app, node: process.version,
            browser: page.context().browser()?.version(),
            styles: actual.styles, axeViolations: axe.violations,
            checks: ['sourceParity', 'normalizedDOM', 'state', 'disabled', 'formSubmission', 'formReset', 'focus', 'targetSize', 'rtl', 'reducedMotion'],
          }, null, 2)),
          contentType: 'application/json',
        })
        await page.goto(new URL('?mode=' + mode, page.url()).href)
        await expect(page.locator('main')).toHaveAttribute('data-ready', 'true')
        await expect(page.getByTestId('switch-fixture')).toHaveCount(0)
      })
