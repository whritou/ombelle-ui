import { test, expect } from '@playwright/test'
import fs from 'node:fs'
import path from 'node:path'
import { sha256 } from '@ombelle/compiler'
import { supportedStyleFamilies } from '../../packages/contracts/src/style-families.js'
import {
  componentPresetReferences,
  componentPresetArtifact,
} from '../helpers/component-preset-fixture.js'
import {
  recipeStyles,
  recipeDom,
  recipeScreenshotFingerprint,
} from '../helpers/recipe-measurements.js'
import {
  componentPresetIsolationBaseline,
  assertComponentPresetHostIsolation,
} from '../helpers/component-preset-isolation.js'
import {
  validateComponentPresetMeasurements,
  componentPresetIsolationMethod,
  type ComponentPresetMeasurement,
} from '../../scripts/component-preset-evidence.js'

const map = JSON.parse(fs.readFileSync('.artifacts/consumers.json', 'utf8'))
const rows: ComponentPresetMeasurement[] = []
const previewOnly = process.env.OMBELLE_COMPONENT_PRESET_PREVIEW_ONLY === '1'
test.beforeAll(({ browser }, info) => {
  fs.rmSync('.artifacts/component-preset-measurements.json', { force: true })
  fs.writeFileSync(
    '.artifacts/component-preset-browser-version.json',
    JSON.stringify(
      {
        engine: browser.browserType().name(),
        version: browser.version(),
        channel: info.project.use.channel ?? 'bundled',
      },
      null,
      2,
    ),
  )
})
test.afterAll(async () => {
  if (!previewOnly) {
    await validateComponentPresetMeasurements(rows)
    fs.writeFileSync(
      '.artifacts/component-preset-measurements.json',
      JSON.stringify(rows, null, 2),
    )
  }
})
for (const hostFamily of supportedStyleFamilies)
  for (const selectedFamily of supportedStyleFamilies)
    for (const mode of ['light', 'dark']) {
      test(`${hostFamily} hosts ${selectedFamily} component preset ${mode}: parity and states`, async ({
        page,
      }) => {
        test.setTimeout(180000)
        const ref = (await componentPresetReferences()).find(
          (r) => r.preset.data.styleFamily === selectedFamily,
        )!
        let referenceStyles: unknown,
          referenceDom: unknown,
          referenceImage: Buffer | undefined
        for (const app of previewOnly
          ? ['preview']
          : ['preview', 'vite', 'next', 'npm-vite', 'npm-next']) {
          const base =
            app === 'preview'
              ? `http://127.0.0.1:4173/${hostFamily}/`
              : `http://127.0.0.1:${map[app + '-' + hostFamily].port}/`
          await page.emulateMedia({
            reducedMotion: 'reduce',
            forcedColors: 'none',
          })
          await page.goto(base + '?mode=' + mode)
          await expect(page.locator('main')).toHaveAttribute(
            'data-ready',
            'true',
          )
          const neighbors = await componentPresetIsolationBaseline(
            page,
            hostFamily,
            mode,
          )
          await page.goto(
            base + '?mode=' + mode + '&componentPresets=1&componentPreset=' + ref.preset.data.id,
          )
          const button = page.getByTestId('component-preset-default'),
            specimen = page.getByTestId('component-preset-specimen')
          await expect(button).toBeVisible()
          await expect(page.locator('main')).toHaveAttribute(
            'data-ready',
            'true',
          )
          await assertComponentPresetHostIsolation(page, neighbors)
          await expect(button).toHaveAttribute('data-slot', 'scoped-button')
          await expect(button).toHaveAttribute('data-ombelle-scope', ref.scope)
          await expect(button).toHaveAccessibleName('Preset action')
          await page.evaluate(() => document.fonts.ready)
          await page.mouse.move(0, 0)
          const computedStyles = await recipeStyles(button),
            dom = await recipeDom(specimen),
            image = await specimen.screenshot({ animations: 'disabled' })
          if (referenceImage) {
            expect(computedStyles).toEqual(referenceStyles)
            expect(dom).toEqual(referenceDom)
            expect(image.equals(referenceImage)).toBe(true)
          } else {
            referenceStyles = computedStyles
            referenceDom = dom
            referenceImage = image
            await test
              .info()
              .attach(
                `component-preset-${selectedFamily}-${hostFamily}-${mode}`,
                { body: image, contentType: 'image/png' },
              )
          }
          const transformedHashes: Record<string, string> = {}
          for (const a of ref.artifacts.filter((a) => a.kind !== 'utility')) {
            const expected = await componentPresetArtifact(
              a,
              app === 'preview' ? 'preview' : 'consumer',
            )
            const root =
              app === 'preview'
                ? path.join('apps/preview/src/generated', hostFamily)
                : map[app + '-' + hostFamily].root
            const content = fs.readFileSync(
              path.join(root, expected.path),
              'utf8',
            )
            expect(content).toBe(expected.content)
            transformedHashes[a.logicalPath] = await sha256(content)
          }
          await button.focus()
          await expect(button).toBeFocused()
          const focusOutlineWidth = await button.evaluate((el) =>
            parseFloat(getComputedStyle(el).outlineWidth),
          )
          expect(focusOutlineWidth).toBeGreaterThanOrEqual(3)
          await page.keyboard.press('Enter')
          await page.keyboard.press('Space')
          await button.click()
          await expect(page.getByTestId('component-preset-clicks')).toHaveText(
            '3',
          )
          await page
            .getByRole('button', { name: 'Toggle preset loading' })
            .click()
          await expect(button).toBeDisabled()
          await expect(button).toHaveAttribute('aria-busy', 'true')
          await expect(button).toHaveAccessibleName('Preset action')
          await button.evaluate((el) => (el as HTMLButtonElement).click())
          await expect(page.getByTestId('component-preset-clicks')).toHaveText(
            '3',
          )
          await page
            .getByRole('button', { name: 'Toggle preset loading' })
            .click()
          await page
            .getByRole('button', { name: 'Toggle preset disabled' })
            .click()
          await expect(button).toBeDisabled()
          await button.evaluate((el) => (el as HTMLButtonElement).click())
          await expect(page.getByTestId('component-preset-clicks')).toHaveText(
            '3',
          )
          await page
            .getByRole('button', { name: 'Toggle preset disabled' })
            .click()
          await page.emulateMedia({ reducedMotion: 'no-preference' })
          await button.evaluate((el) =>
            el.style.setProperty('--motion-duration', '150ms'),
          )
          const duration = () =>
            button.evaluate((el) =>
              Math.max(
                ...getComputedStyle(el)
                  .transitionDuration.split(',')
                  .map(
                    (v) => parseFloat(v) * (v.trim().endsWith('ms') ? 1 : 1000),
                  ),
              ),
            )
          const motionPositiveControlMs = await duration()
          expect(motionPositiveControlMs).toBe(150)
          await page.emulateMedia({ reducedMotion: 'reduce' })
          const reducedMotionMs = await duration()
          expect(reducedMotionMs).toBe(0)
          await page.emulateMedia({ forcedColors: 'active' })
          await page.keyboard.press('Tab')
          await button.focus()
          const forcedColorsOutline = await button.evaluate(
            (el) => getComputedStyle(el).outlineStyle,
          )
          expect(forcedColorsOutline).not.toBe('none')
          rows.push({
            hostFamily,
            presetId: ref.preset.data.id,
            presetHash: ref.preset.hash,
            scope: ref.scope,
            app,
            mode,
            canonicalHashes: Object.fromEntries(
              ref.artifacts.map((a) => [a.logicalPath, a.sha256]),
            ),
            transformedHashes,
            computedStyles,
            domHash: await sha256(JSON.stringify(dom)),
            screenshotHash: await sha256(image.toString('base64')),
            normalizedScreenshotHash: await recipeScreenshotFingerprint(
              page,
              image,
            ),
            focusOutlineWidth,
            forcedColorsOutline,
            motionPositiveControlMs,
            reducedMotionMs,
            checks: {
              parity: true,
              isolation: true,
              activation: true,
              disabled: true,
              loading: true,
              focus: true,
              forcedColors: true,
              reducedMotion: true,
            },
            isolationMethod: componentPresetIsolationMethod,
          })
        }
      })
    }

test('an unscoped preset rule affecting an ordinary Button fails the isolation check', async ({
  page,
}) => {
  const base = 'http://127.0.0.1:4173/flat/'
  const leak = '[data-slot="button"] { border-radius: 123px !important; }'
  await page.goto(base + '?mode=light')
  await expect(page.locator('main')).toHaveAttribute('data-ready', 'true')
  await page.addStyleTag({ content: leak })
  const baseline = await componentPresetIsolationBaseline(page, 'flat', 'light')
  await page.goto(base + '?mode=light&componentPresets=1&componentPreset=builtin-flat')
  await expect(page.getByTestId('component-preset-default')).toBeVisible()
  await page.addStyleTag({ content: leak })
  await expect(
    page.getByRole('button', { name: 'Save changes', exact: true }),
  ).toHaveCSS('border-radius', '123px')
  await expect(
    assertComponentPresetHostIsolation(page, baseline),
  ).rejects.toThrow('Component preset changed ordinary host styles')
})

 test('compiler-owned scoped attributes override caller tampering', async ({ page }) => {
   const ref = (await componentPresetReferences()).find(r => r.preset.data.id === 'builtin-flat')!
   await page.goto('http://127.0.0.1:4173/flat/?mode=light&componentPresets=1&componentPreset=builtin-flat&tamper=1')
   const button = page.getByTestId('component-preset-default')
   await expect(button).toBeVisible()
   await expect(button).toHaveAttribute('data-slot', 'scoped-button')
   await expect(button).toHaveAttribute('data-ombelle-scope', ref.scope)
 })
