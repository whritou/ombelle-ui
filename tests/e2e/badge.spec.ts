import { expect, test, type Page } from '@playwright/test'
import AxeBuilder from '@axe-core/playwright'
import fs from 'node:fs'
import { supportedStyleFamilies } from '../../packages/contracts/src/style-families.js'
import { enlargeFixtureText } from '../helpers/text-enlargement.js'
import {
  browserReferenceKey,
  createBrowserReferenceCache,
} from '../helpers/browser-references.js'

const consumers = JSON.parse(
  fs.readFileSync('.artifacts/consumers.json', 'utf8'),
)
async function specimen(page: Page) {
  await expect(page.locator('main')).toHaveAttribute('data-ready', 'true')
  const fixture = page.getByTestId('badge-fixture')
  await expect(fixture).toBeVisible()
  await expect(fixture).toHaveAttribute('data-ref-attached', 'true')
  await page.evaluate(() => document.fonts.ready)
  const styles = await fixture
    .locator('[data-slot="badge"]')
    .evaluateAll((elements) =>
      elements.map((el) => {
        const s = getComputedStyle(el)
        return {
          color: s.color,
          background: s.backgroundColor,
          border: s.borderWidth,
          radius: s.borderRadius,
          shadow: s.boxShadow,
        }
      }),
    )
  return {
    fixture,
    styles,
    html: await fixture.innerHTML(),
    image: await fixture.screenshot({ animations: 'disabled' }),
  }
}
// Module state belongs to this file's worker; only serialized measurements survive.
const badgeReferences = createBrowserReferenceCache<{
  styles: Awaited<ReturnType<typeof specimen>>['styles']
  html: string
  image: string
}>()
function luminance(color: string) {
  const channels = color
    .match(/[\d.]+/g)!
    .slice(0, 3)
    .map(Number)
    .map((n) => n / 255)
    .map((n) => (n <= 0.04045 ? n / 12.92 : ((n + 0.055) / 1.055) ** 2.4))
  return channels[0] * 0.2126 + channels[1] * 0.7152 + channels[2] * 0.0722
}

for (const family of supportedStyleFamilies)
  for (const mode of ['light', 'dark'])
    for (const app of ['preview', 'vite', 'next', 'npm-vite', 'npm-next'])
      test(`Badge ${family}/${mode}/${app}: source parity, semantics, contrast, and reflow`, async ({
        page,
      }) => {
        const query = '?badges=1&mode=' + mode
        const previewUrl = 'http://127.0.0.1:4173/' + family + '/' + query
        await page.emulateMedia({ reducedMotion: 'reduce', forcedColors: 'none' })
        const colorScheme = await page.evaluate(() =>
          matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light',
        )
        const key = browserReferenceKey({
          family,
          mode,
          viewport: page.viewportSize() ?? { width: 1100, height: 800 },
          reducedMotion: 'reduce',
          forcedColors: 'none',
          colorScheme,
        })
        let captured: Awaited<ReturnType<typeof specimen>> | undefined
        const reference = await badgeReferences(key, async () => {
          await page.goto(previewUrl)
          captured = await specimen(page)
          return {
            styles: captured.styles,
            html: captured.html,
            image: captured.image.toString('base64'),
          }
        })
        if (app !== 'preview' || !captured)
          await page.goto(
            app === 'preview'
              ? previewUrl
              : 'http://127.0.0.1:' + consumers[app + '-' + family].port + '/' + query,
          )
        const actual =
          app === 'preview' && captured ? captured : await specimen(page)
        expect(actual.styles).toEqual(reference.styles)
        expect(actual.html).toBe(reference.html)
        expect(actual.image.equals(Buffer.from(reference.image, 'base64'))).toBe(
          true,
        )
        const badges = actual.fixture.locator('[data-slot="badge"]')
        await expect(badges).toHaveCount(4)
        expect(
          await badges.evaluateAll((elements) =>
            elements.every(
              (el) =>
                el.tagName === 'SPAN' &&
                !el.hasAttribute('role') &&
                !el.hasAttribute('tabindex'),
            ),
          ),
        ).toBe(true)
        await expect(badges.first()).toHaveClass('consumer-badge')
        await expect(badges.first()).toHaveAttribute(
          'title',
          'Synchronization status',
        )
        await expect(
          actual.fixture.getByText('Needs attention', { exact: true }),
        ).toHaveAttribute('data-variant', 'destructive')
        await expect(
          actual.fixture.getByText('Label <script> & text', { exact: true }),
        ).toBeVisible()
        for (const sample of actual.styles) {
          const a = luminance(sample.color),
            b = luminance(sample.background)
          expect(
            (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05),
          ).toBeGreaterThanOrEqual(4.5)
        }
        expect(
          (
            await new AxeBuilder({ page })
              .include('[data-testid="badge-fixture"]')
              .analyze()
          ).violations,
        ).toEqual([])
        if (app === 'preview')
          await test.info().attach('badge-' + family + '-' + mode, {
            body: actual.image,
            contentType: 'image/png',
          })
        await page.emulateMedia({ forcedColors: 'active' })
        await expect(badges.first()).toHaveCSS('box-shadow', 'none')
        await expect(
          actual.fixture.getByText('Needs attention', { exact: true }),
        ).toHaveCSS('border-style', 'double')
        expect(
          await actual.fixture
            .getByText('Needs attention', { exact: true })
            .evaluate((el) => parseFloat(getComputedStyle(el).borderTopWidth)),
        ).toBeGreaterThanOrEqual(3)
        await page.emulateMedia({ forcedColors: 'none' })
        await page.setViewportSize({ width: 320, height: 800 })
        const samples = await enlargeFixtureText(page, 2)
        expect(
          samples.filter((sample) => sample.selector.startsWith('span')),
        ).toHaveLength(4)
        expect(
          samples
            .filter((sample) => sample.selector.startsWith('span'))
            .every((sample) => sample.after >= sample.before * 2 - 0.1),
        ).toBe(true)
        expect(
          await badges.evaluateAll((elements) =>
            elements.every((el) => el.scrollWidth <= el.clientWidth + 1),
          ),
        ).toBe(true)
        expect(
          await page.evaluate(() =>
            Array.from(document.querySelectorAll('main *'))
              .filter((el) => el.getBoundingClientRect().right > innerWidth + 1)
              .map((el) => ({
                tag: el.tagName,
                text: el.textContent?.slice(0, 40),
                right: el.getBoundingClientRect().right,
              })),
          ),
        ).toEqual([])
        await test.info().attach('badge-measurements', {
          body: Buffer.from(
            JSON.stringify(
              {
                family,
                mode,
                app,
                styles: actual.styles,
                contrastRatios: actual.styles.map((sample) => {
                  const a = luminance(sample.color),
                    b = luminance(sample.background)
                  return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05)
                }),
                enlargedText: samples.filter((sample) =>
                  sample.selector.startsWith('span'),
                ),
                checks: {
                  parity: true,
                  semantics: true,
                  attributesAndRef: true,
                  escapedText: true,
                  contrast: true,
                  axe: true,
                  forcedColors: true,
                  enlargementAndReflow: true,
                },
              },
              null,
              2,
            ),
          ),
          contentType: 'application/json',
        })
      })
