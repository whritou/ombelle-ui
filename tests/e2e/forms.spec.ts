import { expect, test, type Locator, type Page } from '@playwright/test'
import AxeBuilder from '@axe-core/playwright'
import fs from 'node:fs'
import path from 'node:path'
import { supportedStyleFamilies } from '../../packages/contracts/src/style-families.js'
import {
  browserReferenceKey,
  createBrowserReferenceCache,
} from '../helpers/browser-references.js'
import { expectColorParity, resolveColor } from '../helpers/color-compare.js'
import { renderedTextContrast } from '../helpers/rendered-contrast.js'

const consumers = JSON.parse(
  fs.readFileSync('.artifacts/consumers.json', 'utf8'),
)
async function specimen(page: Page) {
  await expect(page.locator('main')).toHaveAttribute('data-ready', 'true')
  const fixture = page.getByTestId('forms-fixture')
  await expect(fixture).toBeVisible()
  await page.evaluate(() => document.fonts.ready)
  const styles = await fixture.locator('[data-slot]').evaluateAll((elements) =>
    elements.map((el) => {
      const s = getComputedStyle(el)
      return {
        slot: el.getAttribute('data-slot'),
        testId: el.getAttribute('data-testid'),
        color: s.color,
        background: s.backgroundColor,
        border: s.borderWidth,
        borderStyle: s.borderStyle,
        borderColor: s.borderColor,
        radius: s.borderRadius,
        shadow: s.boxShadow,
        paddingBlock: s.paddingBlock,
        paddingInline: s.paddingInline,
        minHeight: s.minHeight,
        gap: s.gap,
        fontSize: s.fontSize,
        fontWeight: s.fontWeight,
        opacity: s.opacity,
        display: s.display,
      }
    }),
  )
  return { fixture, styles, html: await fixture.innerHTML() }
}
// Only serialized measurements survive between tests in this file's worker.
const formsReferences = createBrowserReferenceCache<{
  styles: Awaited<ReturnType<typeof specimen>>['styles']
  html: string
}>()

async function focusRing(control: Locator) {
  await control.focus()
  await expect(control).toBeFocused()
  return control.evaluate((el) => {
    const s = getComputedStyle(el)
    return {
      focusVisible: el.matches(':focus-visible'),
      borderTopWidth: s.borderTopWidth,
      borderBottomWidth: s.borderBottomWidth,
      borderBottomColor: s.borderBottomColor,
      borderRadius: s.borderRadius,
      outlineStyle: s.outlineStyle,
      outlineWidth: s.outlineWidth,
      outlineColor: s.outlineColor,
      outlineOffset: s.outlineOffset,
      shadow: s.boxShadow,
    }
  })
}
for (const family of supportedStyleFamilies)
  for (const mode of ['light', 'dark'])
    for (const app of ['preview', 'vite', 'next', 'npm-vite', 'npm-next'])
      test(`Forms ${family}/${mode}/${app}: source and DOM parity, control states, accessibility, forced colors and reflow`, async ({
        page,
      }) => {
        const query = '?forms=1&mode=' + mode
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
        const reference = await formsReferences(key, async () => {
          await page.goto(previewUrl)
          captured = await specimen(page)
          return { styles: captured.styles, html: captured.html }
        })
        const generated = 'apps/preview/src/generated/' + family
        const manifest = JSON.parse(
          fs.readFileSync(generated + '/manifest.json', 'utf8'),
        )
        for (const id of ['label', 'textarea', 'native-select'])
          for (const logicalPath of [
            'components/ui/' + id + '.tsx',
            'components/ui/' + id + '.css',
            'examples/' + id + '.tsx',
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
        if (app !== 'preview' || !captured)
          await page.goto(
            app === 'preview'
              ? previewUrl
              : 'http://127.0.0.1:' + consumers[app + '-' + family].port + '/' + query,
          )
        const actual = app === 'preview' && captured ? captured : await specimen(page)
        expect(
          await page
            .locator('html')
            .evaluate((el) => el.classList.contains('dark')),
        ).toBe(mode === 'dark')
        expectColorParity(actual.styles, reference.styles)
        expect(actual.html).toBe(reference.html)
        const fixture = actual.fixture
        const byId = (id: string) => fixture.getByTestId(id)
        const wrapperOf = (id: string) =>
          fixture.locator(
            '[data-slot="native-select-wrapper"]:has(> [data-testid="' + id + '"])',
          )
        const iconOf = (id: string) =>
          wrapperOf(id).locator('[data-slot="native-select-icon"]')

        // Composition: every control has a Label associated through htmlFor.
        expect(
          await fixture
            .locator('input, textarea, select')
            .evaluateAll((elements) =>
              elements.map((el) => {
                const label = (el as HTMLInputElement).labels?.[0]
                return Boolean(
                  label &&
                    label.dataset.slot === 'label' &&
                    label.htmlFor === el.id,
                )
              }),
            ),
        ).toEqual(Array(14).fill(true))
        const requiredLabel = byId('forms-label-required')
        await expect(requiredLabel.locator('[aria-hidden="true"]')).toHaveText('*')
        const input = fixture.getByRole('textbox', {
          name: 'Project name',
          exact: true,
        })
        await expect(input).toHaveAttribute('required', '')
        await expect(input).not.toHaveAttribute('aria-invalid')
        expect(
          await byId('forms-long-label').evaluate((el) => el.textContent?.length),
        ).toBe(120)
        expect(
          await byId('forms-select-optgroup')
            .locator('option')
            .evaluateAll((options) =>
              Math.max(...options.map((o) => o.textContent?.length ?? 0)),
            ),
        ).toBe(90)

        // Each family keeps its focus treatment across fields; minimalist Textarea
        // has a complete outline while its single-line fields use an ink underline.
        const inputRing = await focusRing(input)
        const textareaRing = await focusRing(byId('forms-textarea-filled'))
        const selectRing = await focusRing(byId('forms-select-default'))
        const ringColor = await input.evaluate((el) => {
          const probe = document.createElement('div')
          probe.style.color = 'var(--ring)'
          el.parentElement!.append(probe)
          const color = getComputedStyle(probe).color
          probe.remove()
          return color
        })
        for (const [index, ring] of [inputRing, textareaRing, selectRing].entries()) {
          expect(ring.focusVisible).toBe(true)
          if (family === 'minimalist' && index !== 1) {
            expect(ring.outlineStyle).toBe('none')
            expect(parseFloat(ring.borderBottomWidth)).toBeGreaterThanOrEqual(2)
            expectColorParity(ring.borderBottomColor, ringColor)
          } else if (family === 'flat') {
            expect(ring.shadow).toContain('inset')
            expect(resolveColor(ring.outlineColor).alpha).toBe(0)
            expectColorParity(ring.borderBottomColor, ringColor)
          } else {
            expect(ring.outlineStyle).toBe(family === 'neo-brutalism' ? 'dashed' : 'solid')
            expect(parseFloat(ring.outlineWidth)).toBeGreaterThanOrEqual(1)
            expectColorParity(ring.outlineColor, ringColor)
          }
        }
        await page.evaluate(() => (document.activeElement as HTMLElement)?.blur())

        // Invalid controls show destructive ink on the visible rule or shadow.
        const destructive = await page.evaluate(() => {
          const probe = document.createElement('div')
          probe.style.cssText = 'border:1px solid var(--destructive)'
          document.body.append(probe)
          const value = getComputedStyle(probe).borderTopColor
          probe.remove()
          return value
        })
        const invalid = [
          'forms-textarea-invalid',
          'forms-select-invalid',
          'forms-input-invalid',
        ]
        for (const id of invalid) {
          const border = await byId(id).evaluate((el) => {
            const s = getComputedStyle(el)
            const probe = document.createElement('div')
            probe.style.boxShadow = 'var(--shadow-x) var(--shadow-y) 0 var(--destructive)'
            el.parentElement!.append(probe)
            const destructiveShadow = getComputedStyle(probe).boxShadow
            probe.remove()
            return {
              colors: [
                s.borderTopColor,
                s.borderRightColor,
                s.borderBottomColor,
                s.borderLeftColor,
              ],
              widths: [s.borderTopWidth, s.borderRightWidth, s.borderBottomWidth, s.borderLeftWidth].map(parseFloat),
              shadow: s.boxShadow,
              destructiveShadow,
            }
          })
          expect(Math.max(...border.widths)).toBeGreaterThanOrEqual(2)
          if (family === 'neo-brutalism') {
            expect(border.shadow).not.toBe('none')
            expectColorParity(border.shadow, border.destructiveShadow)
          } else {
            const visibleColors = border.colors.filter((_, index) => border.widths[index] > 0)
            expect(visibleColors.length).toBeGreaterThan(0)
            expectColorParity(visibleColors, visibleColors.map(() => destructive))
          }
        }
        await expect(byId('forms-textarea-invalid')).toHaveAttribute(
          'aria-describedby',
          'forms-feedback-error',
        )
        await expect(byId('forms-select-invalid')).toHaveAttribute(
          'aria-describedby',
          'forms-plan-error',
        )

        // Native Select changes value by keyboard.
        const select = byId('forms-select-default')
        await expect(select).toHaveValue('eu')
        await select.focus()
        await page.keyboard.press('ArrowDown')
        await expect(select).toHaveValue('apac')
        await page.evaluate(() => (document.activeElement as HTMLElement)?.blur())

        // A label click focuses its enabled control.
        const labels = fixture.locator('[data-slot="label"]')
        await expect(labels).toHaveCount(14)
        let clicked = 0
        for (let index = 0; index < 14; index++) {
          const label = labels.nth(index)
          const control = fixture.locator(
            '#' + (await label.getAttribute('for')),
          )
          if (await control.isDisabled()) continue
          await label.click()
          await expect(control).toBeFocused()
          clicked++
        }
        expect(clicked).toBe(11)

        // The icon is decorative and never intercepts pointer input.
        for (const id of [
          'forms-select-default',
          'forms-select-sm',
          'forms-select-invalid',
          'forms-select-optgroup',
        ]) {
          const icon = iconOf(id)
          await expect(icon).toBeVisible()
          await expect(icon).toHaveAttribute('aria-hidden', 'true')
          await byId(id).scrollIntoViewIfNeeded()
          expect(
            await wrapperOf(id).evaluate((wrapper) => {
              const icon = wrapper.querySelector('[data-slot="native-select-icon"]')!
              const r = icon.getBoundingClientRect()
              return (
                document.elementFromPoint(r.x + r.width / 2, r.y + r.height / 2) ===
                wrapper.querySelector('select')
              )
            }),
          ).toBe(true)
        }
        await expect(iconOf('forms-select-multiple')).toBeHidden()

        // Disabled treatments are family-specific: dimmed wrappers/fields or dotted ink.
        for (const id of ['forms-select-disabled', 'forms-select-fieldset']) {
          await expect(byId(id)).toBeDisabled()
          await expect(wrapperOf(id)).toHaveCSS('opacity', family === 'ombelle' ? '0.7' : '1')
          await expect(byId(id)).toHaveCSS('opacity', family === 'flat' ? '0.55' : '1')
          await expect(byId(id)).toHaveCSS('border-bottom-style',
            family === 'flat' || family === 'minimalist' ? 'dotted' : 'dashed')
        }
        await expect(wrapperOf('forms-select-default')).toHaveCSS('opacity', '1')

        // The icon mirrors to the inline end in right-to-left layouts.
        const iconSide = () =>
          wrapperOf('forms-select-default').evaluate((wrapper) => {
            const icon = wrapper
              .querySelector('[data-slot="native-select-icon"]')!
              .getBoundingClientRect()
            const control = wrapper.querySelector('select')!.getBoundingClientRect()
            return {
              icon: icon.x + icon.width / 2,
              centre: control.x + control.width / 2,
            }
          })
        const ltr = await iconSide()
        expect(ltr.icon).toBeGreaterThan(ltr.centre)
        await page.evaluate(() => {
          document.documentElement.dir = 'rtl'
        })
        const rtl = await iconSide()
        expect(rtl.icon).toBeLessThan(rtl.centre)
        await page.evaluate(() => document.documentElement.removeAttribute('dir'))

        // Required marker and error text keep readable contrast.
        const contrast = {
          requiredMarker: await renderedTextContrast(
            requiredLabel.locator('[aria-hidden="true"]'),
          ),
          textareaError: await renderedTextContrast(byId('forms-textarea-error')),
          selectError: await renderedTextContrast(byId('forms-select-error')),
        }
        for (const sample of Object.values(contrast))
          expect(sample.ratio).toBeGreaterThanOrEqual(4.5)

        // Every Label, Input state, Textarea and Native Select passes axe.
        const axe = await new AxeBuilder({ page }).analyze()
        expect(axe.violations).toEqual([])

        // Forced colors: invalid borders become double and shadows are removed.
        await page.emulateMedia({ forcedColors: 'active' })
        for (const id of invalid)
          await expect(byId(id)).toHaveCSS('border-bottom-style', 'double')
        expect(
          await fixture
            .locator('input, textarea, select')
            .evaluateAll((elements) =>
              elements.map((el) => getComputedStyle(el).boxShadow),
            ),
        ).toEqual(Array(14).fill('none'))
        await page.emulateMedia({ forcedColors: 'none' })

        // 320 CSS pixel reflow with the long label and option.
        await page.setViewportSize({ width: 320, height: 800 })
        expect(
          await page.evaluate(() => document.documentElement.scrollWidth),
        ).toBeLessThanOrEqual(320)
        expect(
          await fixture
            .locator('[data-slot]')
            .evaluateAll((elements) =>
              elements
                .filter((el) => el.getBoundingClientRect().width > 0)
                .every((el) => el.getBoundingClientRect().right <= innerWidth + 1),
            ),
        ).toBe(true)

        await page.goto(new URL('?mode=' + mode, page.url()).href)
        await expect(page.locator('main')).toHaveAttribute('data-ready', 'true')
        await expect(page.getByTestId('forms-fixture')).toHaveCount(0)
        await expect(page.getByTestId('specimen')).toBeVisible()
        await test.info().attach('forms-measurements', {
          body: Buffer.from(
            JSON.stringify(
              {
                family,
                mode,
                app,
                node: process.version,
                browserVersion: page.context().browser()?.version(),
                styles: actual.styles,
                focusRing: inputRing,
                destructive,
                contrast,
                axeViolations: axe.violations,
                iconPosition: { ltr, rtl },
                checks: {
                  sourceParity: true,
                  domParity: true,
                  inputParity: true,
                  invalid: true,
                  labelFocus: true,
                  keyboardSelect: true,
                  iconPointer: true,
                  disabled: true,
                  rtl: true,
                  forcedColors: true,
                  reflow320: true,
                  contrast: true,
                  axe: true,
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
