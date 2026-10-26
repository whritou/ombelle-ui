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

async function sample(page: Page) {
  const specimen = await sampleComponentFixture(page, 'tooltip-fixture')
  const help = page.getByTestId('tooltip-fixture').getByRole('button', { name: 'About review windows' })
  await help.scrollIntoViewIfNeeded()
  await help.focus()
  const content = page.getByTestId('tooltip-content')
  await expect(content).toBeVisible()
  const portalStyles = await content.evaluate((element) => {
    const style = getComputedStyle(element)
    return {
      color: style.color,
      background: style.backgroundColor,
      border: style.borderWidth,
      radius: style.borderRadius,
      shadow: style.boxShadow,
      padding: style.padding,
      animation: style.animationName,
    }
  })
  await page.keyboard.press('Escape')
  await expect(content).toHaveCount(0)
  await help.blur()
  return { ...specimen, portalStyles }
}
const references = createBrowserReferenceCache<Awaited<ReturnType<typeof sample>>>()

for (const family of supportedStyleFamilies)
  for (const mode of ['light', 'dark'])
    for (const app of browserApps)
      test(`Tooltip ${family}/${mode}/${app}: parity, hover, focus, Escape, forceMount and accessibility`, async ({ page }) => {
        const query = '?tooltips=1&mode=' + mode
        await page.emulateMedia({ reducedMotion: 'reduce', forcedColors: 'none' })
        const key = await componentReferenceKey(page, family, mode)
        const reference = await references(key, async () => {
          await page.goto(componentUrl('preview', family, query))
          return sample(page)
        })
        await page.goto(componentUrl(app, family, query))
        const actual = await sample(page)
        expect(actual).toEqual(reference)
        expectComponentSources('tooltip', family, app)
        await expect(page.locator('html')).toHaveClass(mode === 'dark' ? /dark/ : '')
        expect(actual.portalStyles.shadow === 'none').toBe(family === 'minimalist')
        const fixture = page.getByTestId('tooltip-fixture')
        const help = fixture.getByRole('button', { name: 'About review windows' })
        const content = page.getByTestId('tooltip-content')
        await expectComponentTargets(fixture, '[data-slot="tooltip-trigger"]', 2)
        await help.scrollIntoViewIfNeeded()
        await help.focus()
        await expect(content).toBeVisible()
        await expect(page.getByRole('tooltip')).toHaveText('Reviews close after two working days.')
        expect(await help.getAttribute('aria-describedby')).toBe(await page.getByRole('tooltip').getAttribute('id'))
        await expect(content.locator('[data-slot="tooltip-arrow"]')).toHaveCount(1)
        await page.keyboard.press('Escape')
        await expect(content).toHaveCount(0)
        await expect(help).toBeFocused()
        await help.blur()
        await help.hover()
        await expect(content).toBeVisible()
        await expect(content).toHaveCSS('animation-name', 'none')
        await page.keyboard.press('Escape')
        await page.mouse.move(0, 0)
        const forcedHelp = fixture.getByRole('button', { name: 'About saved views' })
        await forcedHelp.focus()
        const forced = page.getByTestId('tooltip-forced-content')
        await expect(forced).toBeVisible()
        await page.keyboard.press('Escape')
        await expect(forced).toHaveAttribute('data-state', 'closed')
        await expect(forced).toHaveCount(1)
        await expect(forced).toBeHidden()
        await forcedHelp.blur()
        await expectComponentFocus(help)
        await page.keyboard.press('Escape')
        await help.blur()
        await fixture.getByRole('button', { name: 'Use right-to-left layout' }).click()
        await expect(fixture).toHaveAttribute('dir', 'rtl')
        await help.focus()
        await expect(content).toBeVisible()
        await page.keyboard.press('Escape')
        await help.blur()
        const axe = await new AxeBuilder({ page }).analyze()
        expect(axe.violations).toEqual([])
        await test.info().attach('tooltip-measurements', {
          body: Buffer.from(JSON.stringify({
            family, mode, app, node: process.version,
            browser: page.context().browser()?.version(),
            styles: actual.styles, portalStyles: actual.portalStyles,
            axeViolations: axe.violations,
            checks: ['sourceParity', 'normalizedDOM', 'portalStyleParity', 'tooltipFocusHoverEscape', 'arrow', 'forceMount', 'focus', 'targetSize', 'rtl', 'reducedMotion'],
          }, null, 2)),
          contentType: 'application/json',
        })
        await page.goto(new URL('?mode=' + mode, page.url()).href)
        await expect(page.locator('main')).toHaveAttribute('data-ready', 'true')
        await expect(page.getByTestId('tooltip-fixture')).toHaveCount(0)
      })
