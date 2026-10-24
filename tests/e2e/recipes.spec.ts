import { test, expect } from '@playwright/test'
import fs from 'node:fs'
import { compile, compileRecipe } from '@ombelle/compiler'
import { getCatalog } from '@ombelle/catalog'
import { recipeFixtures } from '../../fixtures/shared/recipes.js'
import { supportedStyleFamilies } from '../../packages/contracts/src/style-families.js'
import { recipeStyles, recipeDom } from '../helpers/recipe-measurements.js'
import {
  assertRecipeIsolation,
  assertRecipeStates,
  measureRecipeTextLayouts,
} from '../helpers/recipe-browser.js'
import { verifyRecipeSourceEvidence } from '../helpers/recipe-source-evidence.js'
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
          await assertRecipeIsolation(page, base, mode, recipe.id)
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
          const transformedHashes = await verifyRecipeSourceEvidence(page, {
            app,
            hostFamily,
            recipeId: recipe.id,
            compiled,
            consumers: map,
          })
          await assertRecipeStates(page, button)
          const textEvidence = await measureRecipeTextLayouts(page, button, {
            base,
            mode,
            recipeId: recipe.id,
            scope: compiled.scope,
          })
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
