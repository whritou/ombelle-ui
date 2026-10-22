import { test, expect } from '@playwright/test'
import fs from 'node:fs/promises'
import path from 'node:path'
import { compileButtonPreset, sha256 } from '@ombelle/compiler'
import { supportedStyleFamilies } from '../../packages/contracts/src/style-families.js'
import { componentPresetFixtures } from '../helpers/component-preset-fixture.js'
import {
  componentPresetTransformedArtifacts,
  validateComponentPresetMeasurements,
} from '../../scripts/component-preset-evidence.ts'

const map = JSON.parse(await fs.readFile('.artifacts/consumers.json', 'utf8'))
const rows: Record<string, unknown>[] = []
const apps = ['preview', 'vite', 'next', 'npm-vite', 'npm-next'] as const
const checks = [
  'componentBehavior',
  'focus',
  'forcedColors',
  'reducedMotion',
  'hostStyleIsolation',
] as const

test.beforeAll(async () => {
  await fs.rm('.artifacts/component-preset-measurements.json', { force: true })
})

test.afterAll(async () => {
  if (rows.length === 90) {
    await validateComponentPresetMeasurements(rows)
    await fs.writeFile(
      '.artifacts/component-preset-measurements.json',
      JSON.stringify(rows, null, 2),
    )
  }
})

async function visualStyles(locator: import('@playwright/test').Locator) {
  return locator.evaluate((element) => {
    const style = getComputedStyle(element)
    return {
      color: style.color,
      background: style.backgroundColor,
      border: style.border,
      borderRadius: style.borderRadius,
      minHeight: style.minHeight,
      fontFamily: style.fontFamily,
      fontSize: style.fontSize,
      lineHeight: style.lineHeight,
      boxShadow: style.boxShadow,
      padding: style.padding,
    }
  })
}

function pageUrl(hostFamily: string, app: string): string {
  if (app === 'preview') return `http://127.0.0.1:4173/${hostFamily}/`
  const id = app.startsWith('npm-')
    ? `${app}-${hostFamily}`
    : `${app}-${hostFamily}`
  return `http://127.0.0.1:${map[id].port}/`
}

for (const hostFamily of supportedStyleFamilies)
  for (const { family: presetFamily, preset } of componentPresetFixtures())
    for (const mode of ['light', 'dark']) {
      test(`${hostFamily} host / ${presetFamily} Button preset / ${mode}: rendered parity and states`, async ({ page }) => {
        test.setTimeout(180000)
        const result = await compileButtonPreset({ preset }),
          measurementKey = [hostFamily, presetFamily, mode].join('/')
        let expectedStyles: Record<string, string> | undefined

        for (const app of apps) {
          const base = pageUrl(hostFamily, app)
          await page.setViewportSize({ width: 1100, height: 800 })
          await page.emulateMedia({ reducedMotion: 'reduce', forcedColors: 'none' })
          await page.goto(base + '?mode=' + mode)
          await expect(page.locator('main')).toHaveAttribute('data-ready', 'true')
          const ordinary = page.getByRole('button', { name: 'Save changes', exact: true }),
            ordinaryButtonBefore = await visualStyles(ordinary)

          await page.goto(
            base +
              '?mode=' +
              mode +
              '&componentPresets=1&componentPreset=' +
              result.preset.data.id +
              '&tamper=1',
          )
          await expect(page.getByTestId('component-preset-fixture')).toBeVisible()
          await expect(page.locator('main')).toHaveAttribute('data-ready', 'true')
          const button = page.getByTestId('component-preset-default')
          await expect(button).toBeVisible()
          await expect(button).toHaveAttribute('data-slot', 'scoped-button')
          await expect(button).toHaveAttribute('data-ombelle-scope', result.scope)
          await expect(button).toHaveAttribute('data-variant', 'default')
          await expect(button).toHaveAttribute('data-size', 'default')

          const ordinaryButtonAfter = await visualStyles(ordinary)
          expect(ordinaryButtonAfter).toEqual(ordinaryButtonBefore)
          const styles = await visualStyles(button)
          expect(styles.minHeight).toBe('40px')
          expect(styles.fontFamily).toContain('Arial')
          const radiusRem = preset.design.radiusRem ?? 0
          expect(styles.borderRadius).toBe(
            radiusRem === 0 ? '0px' : `${radiusRem * 16}px`,
          )
          if (expectedStyles) expect(styles).toEqual(expectedStyles)
          else expectedStyles = styles

          await button.focus()
          await expect(button).toBeFocused()
          expect(
            await button.evaluate((element) => getComputedStyle(element).outlineStyle),
          ).not.toBe('none')
          await page.keyboard.press('Enter')
          await page.keyboard.press('Space')
          await expect(page.getByTestId('component-preset-clicks')).toHaveText('2')

          await page.emulateMedia({ reducedMotion: 'no-preference' })
          await button.evaluate((element) =>
            (element as HTMLElement).style.setProperty('--motion-duration', '150ms'),
          )
          expect(
            await button.evaluate((element) =>
              getComputedStyle(element).transitionDuration
                .split(',')
                .every((value) => parseFloat(value) > 0),
            ),
          ).toBe(true)
          await page.emulateMedia({ reducedMotion: 'reduce' })
          expect(
            await button.evaluate((element) =>
              getComputedStyle(element).transitionDuration
                .split(',')
                .every((value) => parseFloat(value) === 0),
            ),
          ).toBe(true)

          await page.emulateMedia({ forcedColors: 'active' })
          expect(await page.evaluate(() => matchMedia('(forced-colors: active)').matches)).toBe(true)
          expect(
            await button.evaluate((element) => getComputedStyle(element).outlineStyle),
          ).not.toBe('none')
          await page.emulateMedia({ forcedColors: 'none' })

          const transformedArtifacts = await componentPresetTransformedArtifacts(
            result,
            app,
          )
          for (const artifact of transformedArtifacts) {
            const file =
              app === 'preview'
                ? path.join(
                    'apps/preview/src/generated',
                    hostFamily,
                    artifact.path.startsWith('src/ombelle-examples/')
                      ? artifact.path.slice('src/'.length)
                      : artifact.path.slice('src/'.length),
                  )
                : path.join(map[`${app}-${hostFamily}`].root, artifact.path)
            expect(await sha256(await fs.readFile(file, 'utf8'))).toBe(artifact.sha256)
          }

          rows.push({
            hostFamily,
            presetFamily,
            presetId: result.preset.data.id,
            presetHash: result.preset.hash,
            scope: result.scope,
            mode,
            app,
            canonicalHashes: Object.fromEntries(
              result.artifacts
                .filter((artifact) => artifact.kind !== 'utility')
                .map((artifact) => [artifact.logicalPath, artifact.sha256]),
            ),
            transformedArtifacts,
            computedStyles: styles,
            ordinaryButtonBefore,
            ordinaryButtonAfter,
            checks: Object.fromEntries(checks.map((check) => [check, true])),
          })
        }
        expect(rows.filter((row) => [row.hostFamily, row.presetFamily, row.mode].join('/') === measurementKey)).toHaveLength(5)
      })
    }
