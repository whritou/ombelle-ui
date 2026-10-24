import { recipeMeasurements as rows } from '../helpers/foundation-evidence-fixture.js'
import { expect, it } from 'vitest'
import { compileRecipe } from '@ombelle/compiler'
import { recipeFixtures } from '../../fixtures/shared/recipes.js'
import {
  recipeMeasurementKeys,
  validateRecipeMeasurements,
  recipeTransformedHashes,
} from '../../scripts/recipe-evidence.ts'
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
