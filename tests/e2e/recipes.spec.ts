import { test, expect } from '@playwright/test'
import AxeBuilder from '@axe-core/playwright'
import fs from 'node:fs'
import path from 'node:path'
import { compile, compileRecipe, sha256 } from '@ombelle/compiler'
import { getCatalog } from '@ombelle/catalog'
import { recipeFixtures } from '../../fixtures/shared/recipes.js'
import { supportedStyleFamilies } from '../../packages/contracts/src/style-families.js'
import { recipeStyles, recipeDom } from '../helpers/recipe-measurements.js'
import { enlargeFixtureText } from '../helpers/text-enlargement.js'
import {
  validateRecipeMeasurements,
  type RecipeMeasurement,
} from '../../scripts/recipe-evidence.ts'
const map = JSON.parse(fs.readFileSync('.artifacts/consumers.json', 'utf8')),
  rows: RecipeMeasurement[] = []
test.beforeAll(() =>
  fs.rmSync('.artifacts/recipe-measurements.json', { force: true }),
)
test.afterAll(async () => {
  if (rows.length === 90) {
    await validateRecipeMeasurements(rows)
    fs.writeFileSync(
      '.artifacts/recipe-measurements.json',
      JSON.stringify(rows, null, 2),
    )
  }
})
for (const hostFamily of supportedStyleFamilies)
  for (const recipe of recipeFixtures())
    for (const mode of ['light', 'dark']) {
      test(`${hostFamily} hosts ${recipe.id} ${mode}: recipe parity and states`, async ({
        page,
      }) => {
        test.setTimeout(180000)
        const compiled = await compileRecipe({ recipe })
        let referenceImage: Buffer | undefined,
          referenceDom: unknown,
          referenceStyles: Record<string, string> | undefined
        for (const app of process.env.OMBELLE_RECIPE_PREVIEW_ONLY === '1'
          ? ['preview']
          : ['preview', 'vite', 'next', 'npm-vite', 'npm-next']) {
          const base =
            app === 'preview'
              ? 'http://127.0.0.1:4173/' + hostFamily + '/'
              : 'http://127.0.0.1:' + map[app + '-' + hostFamily].port + '/'
          await page.setViewportSize({ width: 1100, height: 800 })
          await page.emulateMedia({
            reducedMotion: 'reduce',
            forcedColors: 'none',
          })
          await page.goto(base + '?mode=' + mode)
          await expect(page.locator('main')).toHaveAttribute(
            'data-ready',
            'true',
          )
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
          await page.goto(
            base + '?mode=' + mode + '&recipes=1&recipe=' + recipe.id,
          )
          await expect(page.getByTestId('recipe-fixture')).toBeVisible()
          await expect(page.locator('main')).toHaveAttribute(
            'data-ready',
            'true',
          )
          const after = await page
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
          expect(after).toEqual(neighbors)
          const button = page.getByTestId('recipe-default'),
            specimen = page.getByTestId('recipe-specimen')
          await page.evaluate(() => document.fonts.ready)
          await page.mouse.move(0, 0)
          const styles = await recipeStyles(button),
            dom = await recipeDom(specimen),
            image = await specimen.screenshot({ animations: 'disabled' })
          expect(styles.minHeight).toBe('44px')
          expect(styles.borderRadius).toBe('0px')
          expect(styles.border).toContain('2px')
          if (referenceImage) {
            expect(styles).toEqual(referenceStyles)
            expect(dom).toEqual(referenceDom)
            expect(image.equals(referenceImage)).toBe(true)
          } else {
            referenceImage = image
            referenceDom = dom
            referenceStyles = styles
            await test
              .info()
              .attach('recipe-' + recipe.id + '-' + hostFamily + '-' + mode, {
                body: image,
                contentType: 'image/png',
              })
          }
          const transformedHashes: Record<string, string> = {}
          const transforms =
            app === 'preview'
              ? JSON.parse(
                  fs.readFileSync(
                    'apps/preview/src/generated/' +
                      hostFamily +
                      '/recipes-transforms.json',
                    'utf8',
                  ),
                )
              : undefined
          for (const artifact of compiled.artifacts.filter(
            (a) => a.kind !== 'utility',
          )) {
            const dest =
              artifact.kind === 'usage'
                ? 'src/ombelle-examples/' +
                  artifact.logicalPath.slice('examples/'.length)
                : 'src/components/ui/' + artifact.logicalPath
            if (app === 'preview') {
              const file = path.join(
                'apps/preview/src/generated',
                hostFamily,
                artifact.kind === 'usage'
                  ? artifact.logicalPath
                  : 'components/ui/' + artifact.logicalPath,
              )
              const actualHash = await sha256(fs.readFileSync(file, 'utf8'))
              expect(actualHash).toBe(
                transforms[artifact.logicalPath].previewHash,
              )
              transformedHashes[artifact.logicalPath] = actualHash
            } else {
              const content = fs.readFileSync(
                path.join(map[app + '-' + hostFamily].root, dest),
                'utf8',
              )
              expect(await sha256(content)).toBe(artifact.sha256)
              transformedHashes[artifact.logicalPath] = await sha256(content)
            }
          }
          if (app === 'preview') {
            const browserHashes = await page.evaluate(
              async (id) =>
                Promise.all((window as any).__recipeArtifactHashes[id]),
              recipe.id,
            )
            expect(browserHashes).toEqual(
              compiled.artifacts.map((a) => a.sha256),
            )
          }
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
          await page
            .getByRole('button', { name: 'Toggle recipe loading' })
            .click()
          await expect(button).toBeDisabled()
          await expect(button).toHaveAttribute('aria-busy', 'true')
          await expect(button).toHaveAccessibleName('Recipe action')
          await button.evaluate((el) => (el as HTMLButtonElement).click())
          await expect(page.getByTestId('recipe-clicks')).toHaveText('3')
          await page
            .getByRole('button', { name: 'Toggle recipe loading' })
            .click()
          await page
            .getByRole('button', { name: 'Toggle recipe disabled' })
            .click()
          await expect(button).toBeDisabled()
          await button.evaluate((el) => (el as HTMLButtonElement).click())
          await expect(page.getByTestId('recipe-clicks')).toHaveText('3')
          await page
            .getByRole('button', { name: 'Toggle recipe disabled' })
            .click()
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
          const textEvidence: RecipeMeasurement['textEvidence'] = []
          for (const width of [1100, 320]) {
            await page.setViewportSize({ width, height: 800 })
            await page.goto(
              base +
                '?mode=' +
                mode +
                '&recipes=1&recipe=' +
                recipe.id +
                '&recipeStates=1&tamper=1',
            )
            await expect(page.getByTestId('recipe-states')).toBeVisible()
            await expect(button).toHaveAttribute('data-slot', 'recipe-button')
            await expect(button).toHaveAttribute(
              'data-ombelle-recipe',
              compiled.scope,
            )
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
            for (const s of samples)
              expect(s.after / s.before).toBeCloseTo(2, 1)
            expect(
              await page
                .getByTestId('recipe-fixture')
                .evaluate((el) =>
                  Array.from(
                    el.querySelectorAll('[data-slot="recipe-button"]'),
                  ).every(
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
                  (el) =>
                    el.getBoundingClientRect().right > window.innerWidth + 1,
                )
                .slice(0, 8)
                .map((el) => ({
                  tag: el.tagName,
                  text: el.textContent?.slice(0, 45),
                  right: el.getBoundingClientRect().right,
                })),
            }))
            expect(
              overflow.actual,
              JSON.stringify(overflow),
            ).toBeLessThanOrEqual(overflow.width)
            textEvidence.push({ width, samples })
          }
          rows.push({
            hostFamily,
            recipeId: recipe.id,
            recipeHash: compiled.recipe.hash,
            app,
            mode,
            canonicalHashes: Object.fromEntries(
              compiled.artifacts.map((a) => [a.logicalPath, a.sha256]),
            ),
            transformedHashes,
            computedStyles: styles,
            textEvidence,
            checks: {
              parity: true,
              isolation: true,
              activation: true,
              disabled: true,
              loading: true,
              focus: true,
              text: true,
              overrideHeight: true,
              reducedMotion: true,
              forcedColors: true,
              axe: true,
              enlargement: true,
            },
          })
        }
      })
    }
test('custom dark class on the element or ancestor uses the same pinned recipe scope', async ({
  page,
}) => {
  const recipe = recipeFixtures()[0],
    compiled = await compileRecipe({ recipe, darkSelector: '.night' })
  await page.goto(
    'http://127.0.0.1:4173/flat/?mode=light&recipes=1&recipe=' + recipe.id,
  )
  const button = page.getByTestId('recipe-default')
  await expect(button).toBeVisible()
  const light = await recipeStyles(button)
  await page.addStyleTag({
    content: compiled.artifacts.find((a) => a.kind === 'style')!.content,
  })
  await button.evaluate((el) => el.classList.add('night'))
  const same = await recipeStyles(button)
  expect(same.background).not.toBe(light.background)
  await button.evaluate((el) => el.classList.remove('night'))
  await page.locator('html').evaluate((el) => el.classList.add('night'))
  expect((await recipeStyles(button)).background).toBe(same.background)
  await expect(button).toHaveAttribute('data-ombelle-recipe', compiled.scope)
})
test('a compatible host theme change preserves the rendered recipe', async ({
  page,
}) => {
  const recipe = recipeFixtures()[2]
  await page.goto(
    'http://127.0.0.1:4173/flat/?mode=light&recipes=1&recipe=' + recipe.id,
  )
  const button = page.getByTestId('recipe-default')
  await expect(button).toBeVisible()
  const before = await recipeStyles(button),
    neighbor = page.getByRole('button', { name: 'Save changes', exact: true })
  const oldHost = await neighbor.evaluate(
    (el) => getComputedStyle(el).backgroundColor,
  )
  const theme = await compile({
    preset: getCatalog('0.1.0').presets.minimalist,
    componentIds: [],
    catalogRelease: '0.1.0',
    compilerVersion: '0.1.0',
  })
  await page.addStyleTag({
    content: theme.artifacts
      .filter((a) => a.kind === 'style')
      .map((a) => a.content)
      .join('\n'),
  })
  expect(
    await neighbor.evaluate((el) => getComputedStyle(el).backgroundColor),
  ).not.toBe(oldHost)
  expect(await recipeStyles(button)).toEqual(before)
})
