import { expect, it } from 'vitest'
import { compileRecipe } from '@ombelle/compiler'
import { recipeFixtures } from '../../fixtures/shared/recipes.js'
import {
  recipeMeasurementKeys,
  validateRecipeMeasurements,
  recipeTransformedHashes,
} from '../../scripts/recipe-evidence.ts'
async function rows() {
  const compiled = await Promise.all(
    recipeFixtures().map((recipe) => compileRecipe({ recipe })),
  )
  return Promise.all(
    recipeMeasurementKeys().map(async (key) => {
      const [hostFamily, recipeId, mode, app] = key.split('/'),
        r = compiled.find((r) => r.recipe.data.id === recipeId)!
      return {
        hostFamily,
        recipeId,
        mode,
        app,
        recipeHash: r.recipe.hash,
        canonicalHashes: Object.fromEntries(
          r.artifacts.map((a) => [a.logicalPath, a.sha256]),
        ),
        transformedHashes: await recipeTransformedHashes(r, app),
        computedStyles: { color: 'rgb(1, 2, 3)', background: 'rgb(4, 5, 6)' },
        checks: Object.fromEntries(
          [
            'parity',
            'isolation',
            'activation',
            'disabled',
            'loading',
            'focus',
            'text',
            'overrideHeight',
            'reducedMotion',
            'forcedColors',
            'axe',
            'enlargement',
          ].map((k) => [k, true]),
        ),
        textEvidence: [1100, 320].map((width) => ({
          width,
          samples: [{ before: 14, after: 28 }],
        })),
      }
    }),
  )
}
it('requires all 90 attributable app/host/recipe/mode outcomes', async () => {
  const data = await rows()
  expect(data).toHaveLength(90)
  await expect(validateRecipeMeasurements(data)).resolves.toHaveLength(90)
})
it('rejects missing duplicated failed tampered and stale recipe evidence', async () => {
  const data = await rows()
  await expect(validateRecipeMeasurements(data.slice(1))).rejects.toThrow()
  for (const patch of [
    { app: 'fake' },
    { recipeHash: '0'.repeat(64) },
    { checks: {} },
    { canonicalHashes: {} },
    { textEvidence: [] },
  ])
    await expect(
      validateRecipeMeasurements([{ ...data[0], ...patch }, ...data.slice(1)]),
    ).rejects.toThrow()
  await expect(
    validateRecipeMeasurements([data[0], data[0], ...data.slice(2)]),
  ).rejects.toThrow()
})
it('rejects a well-shaped but incorrect transformed source digest', async () => {
  const data = await rows()
  data[0].transformedHashes[Object.keys(data[0].transformedHashes)[0]] =
    'f'.repeat(64)
  await expect(validateRecipeMeasurements(data)).rejects.toThrow()
})
