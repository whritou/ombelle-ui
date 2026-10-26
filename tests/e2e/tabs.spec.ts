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

const sample = (page: Page) => sampleComponentFixture(page, 'tabs-fixture')
const references = createBrowserReferenceCache<Awaited<ReturnType<typeof sample>>>()

for (const family of supportedStyleFamilies)
  for (const mode of ['light', 'dark'])
    for (const app of browserApps)
      test(`Tabs ${family}/${mode}/${app}: parity, automatic keyboard selection, RTL and accessibility`, async ({ page }) => {
        const query = '?tabs=1&mode=' + mode
        await page.emulateMedia({ reducedMotion: 'reduce', forcedColors: 'none' })
        const key = await componentReferenceKey(page, family, mode)
        const reference = await references(key, async () => {
          await page.goto(componentUrl('preview', family, query))
          return sample(page)
        })
        await page.goto(componentUrl(app, family, query))
        const actual = await sample(page)
        expect(actual).toEqual(reference)
        expectComponentSources('tabs', family, app)
        await expect(page.locator('html')).toHaveClass(mode === 'dark' ? /dark/ : '')
        const fixture = page.getByTestId('tabs-fixture')
        const horizontal = fixture.getByRole('tablist', { name: 'Project views' })
        const vertical = fixture.getByRole('tablist', { name: 'Account views' })
        const overview = horizontal.getByRole('tab', { name: 'Overview' })
        const activity = horizontal.getByRole('tab', { name: 'Activity' })
        const profile = vertical.getByRole('tab', { name: 'Profile' })
        const security = vertical.getByRole('tab', { name: 'Security' })
        await expect(horizontal).toHaveAttribute('aria-orientation', 'horizontal')
        await expect(vertical).toHaveAttribute('aria-orientation', 'vertical')
        await expect(horizontal.getByRole('tab', { name: 'History' })).toBeDisabled()
        await expect(vertical.getByRole('tab', { name: 'Billing' })).toBeDisabled()
        await expectComponentTargets(fixture, '[data-slot="tabs-trigger"]', 6)
        await overview.focus()
        await page.keyboard.press('ArrowRight')
        await expect(activity).toBeFocused()
        await expect(activity).toHaveAttribute('aria-selected', 'true')
        const activityPanel = fixture.getByRole('tabpanel', { name: 'Activity' })
        await expect(activityPanel).toBeVisible()
        expect(await activity.getAttribute('aria-controls')).toBe(await activityPanel.getAttribute('id'))
        expect(await activityPanel.getAttribute('aria-labelledby')).toBe(await activity.getAttribute('id'))
        await page.keyboard.press('ArrowRight')
        await expect(overview).toBeFocused()
        await profile.focus()
        await page.keyboard.press('ArrowRight')
        await expect(profile).toBeFocused()
        await page.keyboard.press('ArrowDown')
        await expect(security).toHaveAttribute('aria-selected', 'true')
        await page.keyboard.press('ArrowDown')
        await expect(profile).toHaveAttribute('aria-selected', 'true')
        await expectComponentFocus(overview)
        await fixture.getByRole('button', { name: 'Use right-to-left layout' }).click()
        await expect(fixture).toHaveAttribute('dir', 'rtl')
        await overview.focus()
        await page.keyboard.press('ArrowLeft')
        await expect(activity).toBeFocused()
        await expect(activity).toHaveAttribute('aria-selected', 'true')
        await activity.blur()
        const axe = await new AxeBuilder({ page }).analyze()
        expect(axe.violations).toEqual([])
        await test.info().attach('tabs-measurements', {
          body: Buffer.from(JSON.stringify({
            family, mode, app, node: process.version,
            browser: page.context().browser()?.version(),
            styles: actual.styles, axeViolations: axe.violations,
            checks: ['sourceParity', 'normalizedDOM', 'automaticTabs', 'orientation', 'disabledSkipping', 'associations', 'focus', 'targetSize', 'rtl', 'reducedMotion'],
          }, null, 2)),
          contentType: 'application/json',
        })
        await page.goto(new URL('?mode=' + mode, page.url()).href)
        await expect(page.locator('main')).toHaveAttribute('data-ready', 'true')
        await expect(page.getByTestId('tabs-fixture')).toHaveCount(0)
      })
