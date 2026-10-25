import { expect, test, type Page } from '@playwright/test'
import fs from 'node:fs'
import path from 'node:path'
import { supportedStyleFamilies } from '../../packages/contracts/src/style-families.js'

const consumers = JSON.parse(
  fs.readFileSync('.artifacts/consumers.json', 'utf8'),
)
async function specimen(page: Page) {
  await expect(page.locator('main')).toHaveAttribute('data-ready', 'true')
  const fixture = page.getByTestId('card-fixture')
  await expect(fixture).toBeVisible()
  await page.evaluate(() => document.fonts.ready)
  const styles = await fixture.locator('[data-slot]').evaluateAll((elements) =>
    elements.map((el) => {
      const s = getComputedStyle(el)
      return {
        slot: el.getAttribute('data-slot'),
        color: s.color,
        background: s.backgroundColor,
        border: s.borderWidth,
        borderStyle: s.borderStyle,
        radius: s.borderRadius,
        shadow: s.boxShadow,
        paddingBlock: s.paddingBlock,
        paddingInline: s.paddingInline,
        gap: s.gap,
        fontSize: s.fontSize,
      }
    }),
  )
  return { fixture, styles, html: await fixture.innerHTML() }
}

for (const family of supportedStyleFamilies)
  for (const mode of ['light', 'dark'])
    for (const app of ['preview', 'vite', 'next', 'npm-vite', 'npm-next'])
      test(`Card ${family}/${mode}/${app}: source and DOM parity, density, forced colors and reflow`, async ({
        page,
      }) => {
        const query = '?cards=1&mode=' + mode
        await page.goto('http://127.0.0.1:4173/' + family + '/' + query)
        const reference = await specimen(page)
        const generated = 'apps/preview/src/generated/' + family
        const manifest = JSON.parse(
          fs.readFileSync(generated + '/manifest.json', 'utf8'),
        )
        for (const logicalPath of [
          'components/ui/card.tsx',
          'components/ui/card.css',
          'examples/card.tsx',
        ]) {
          const artifact = manifest.artifacts.find(
            (a: { logicalPath: string }) => a.logicalPath === logicalPath,
          )
          expect(artifact).toBeDefined()
          const previewSource = fs.readFileSync(
            path.join(generated, logicalPath),
            'utf8',
          )
          expect(previewSource).toBe(
            artifact.content
              .replaceAll('@/lib/utils', '../../lib/utils')
              .replaceAll('@/components/ui', '../components/ui'),
          )
          if (app !== 'preview')
            expect(
              fs.readFileSync(
                path.join(
                  consumers[app + '-' + family].root,
                  'src',
                  logicalPath.replace('examples/', 'ombelle-examples/'),
                ),
                'utf8',
              ),
            ).toBe(artifact.content)
        }
        if (app !== 'preview')
          await page.goto(
            'http://127.0.0.1:' +
              consumers[app + '-' + family].port +
              '/' +
              query,
          )
        const actual = app === 'preview' ? reference : await specimen(page)
        expect(
          await page
            .locator('html')
            .evaluate((el) => el.classList.contains('dark')),
        ).toBe(mode === 'dark')
        expect(actual.styles).toEqual(reference.styles)
        expect(actual.html).toBe(reference.html)
        const cards = actual.fixture.locator('[data-slot="card"]')
        await expect(cards).toHaveCount(2)
        await expect(cards.nth(0)).toHaveAttribute('data-density', 'default')
        await expect(cards.nth(1)).toHaveAttribute('data-density', 'dense')
        await expect(cards.nth(0)).toHaveClass('consumer-card')
        for (const card of [cards.nth(0), cards.nth(1)]) {
          await expect(card.getByRole('heading', { level: 2 })).toBeVisible()
          for (const slot of [
            'header',
            'title',
            'description',
            'content',
            'footer',
          ])
            await expect(
              card.locator('[data-slot="card-' + slot + '"]'),
            ).toHaveCount(1)
          expect(
            await card.evaluate(
              (el) =>
                el.tagName === 'DIV' &&
                !el.hasAttribute('tabindex') &&
                !el.hasAttribute('role'),
            ),
          ).toBe(true)
        }
        await expect(
          actual.fixture.getByText('Label <script> & text', { exact: true }),
        ).toBeVisible()
        await expect(
          actual.fixture.locator('img, button, a, [tabindex]'),
        ).toHaveCount(0)
        const rootStyles = actual.styles.filter((s) => s.slot === 'card')
        expect(parseFloat(rootStyles[0].paddingBlock)).toBeGreaterThan(
          parseFloat(rootStyles[1].paddingBlock),
        )
        for (const s of rootStyles) {
          expect(parseFloat(s.border)).toBeGreaterThan(0)
          expect(s.borderStyle).toBe('solid')
          expect(s.shadow === 'none').toBe(family !== 'neo-brutalism')
          expect(s.color).not.toBe(s.background)
        }
        await page.emulateMedia({ forcedColors: 'active' })
        for (const card of [cards.nth(0), cards.nth(1)]) {
          await expect(card).toHaveCSS('box-shadow', 'none')
          expect(
            await card.evaluate((el) => {
              const s = getComputedStyle(el)
              const probe = document.createElement('div')
              probe.style.cssText = 'color:CanvasText;background:Canvas'
              document.body.append(probe)
              const system = getComputedStyle(probe)
              const matches =
                s.color === system.color &&
                s.borderTopColor === system.color &&
                s.backgroundColor === system.backgroundColor
              probe.remove()
              return matches
            }),
          ).toBe(true)
        }
        await page.emulateMedia({ forcedColors: 'none' })
        await page.setViewportSize({ width: 320, height: 800 })
        expect(
          await actual.fixture
            .locator('[data-slot]')
            .evaluateAll((elements) =>
              elements.every(
                (el) =>
                  el.scrollWidth <= el.clientWidth + 1 &&
                  el.getBoundingClientRect().right <= innerWidth + 1,
              ),
            ),
        ).toBe(true)
        expect(
          await page.evaluate(
            () => document.documentElement.scrollWidth <= innerWidth,
          ),
        ).toBe(true)
        await page.goto(new URL('?mode=' + mode, page.url()).href)
        await expect(page.locator('main')).toHaveAttribute('data-ready', 'true')
        await expect(page.getByTestId('card-fixture')).toHaveCount(0)
        await expect(page.getByTestId('specimen')).toBeVisible()
        await test.info().attach('card-measurements', {
          body: Buffer.from(
            JSON.stringify(
              {
                family,
                mode,
                app,
                node: process.version,
                browserVersion: page.context().browser()?.version(),
                styles: actual.styles,
                checks: {
                  sourceParity: true,
                  domParity: true,
                  density: true,
                  forcedColors: true,
                  wrapping320: true,
                  queryGate: true,
                },
              },
              null,
              2,
            ),
          ),
          contentType: 'application/json',
        })
      })
