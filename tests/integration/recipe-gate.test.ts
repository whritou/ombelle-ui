import { expect, it } from 'vitest'
import { compileRecipe } from '@ombelle/compiler'
import { recipeFixtures } from '../../fixtures/shared/recipes.js'
import { consumerCases } from '../../scripts/consumer-matrix.js'
import {
  finalizeRecipeEvidence,
  recipeMeasurementKeys,
  recipeTransformedHashes,
} from '../../scripts/recipe-evidence.ts'
import type { ConsumerEvidence } from '../../scripts/consumer-evidence.js'
async function fixture() {
  const refs = await Promise.all(
      recipeFixtures().map((recipe) => compileRecipe({ recipe })),
    ),
    matrix: Record<string, ConsumerEvidence> = {},
    consumers: Record<string, unknown> = {}
  for (const spec of consumerCases()) {
    const recipes: Record<string, unknown> = {},
      sourceHashes: Record<string, string> = {}
    for (const ref of refs) {
      const { artifacts, dependencies, ...meta } = ref
      const files = Object.fromEntries(
        artifacts
          .filter((a) => a.kind !== 'utility')
          .map((a) => {
            const path =
              a.kind === 'usage'
                ? 'src/ombelle-examples/' + a.logicalPath.slice(9)
                : 'src/components/ui/' + a.logicalPath
            sourceHashes[path] = a.sha256
            return [
              path,
              { logicalPath: a.logicalPath, kind: a.kind, sha256: a.sha256 },
            ]
          }),
      )
      recipes[ref.recipe.data.id + '@1'] = { ...meta, artifacts: files }
    }
    const cliRuntime = {
        executable: spec.cliRuntime,
        name: spec.cliRuntime,
        version: spec.cliRuntime === 'bun' ? '1.4.3' : '24.21.0',
      },
      buildRuntime = {
        executable: 'node',
        name: 'node' as const,
        version: '24.21.0',
      },
      audit = {
        exitCode: 0,
        scope:
          spec.manager === 'bun' ? ('all' as const) : ('production' as const),
      }
    matrix[spec.id] = {
      family: spec.family,
      manager: spec.manager,
      managerVersion: 'verified',
      cliRuntime,
      buildRuntime,
      sourceHashes,
      audit,
      build: { exitCode: 0 },
    }
    consumers[spec.id] = {
      recipes,
      protectedHashes: { 'ui-preset.json': 'a'.repeat(64) },
      cliRuntime,
      buildRuntime,
      audit,
      build: { status: 'passed', exitCode: 0 },
    }
  }
  const measurements = await Promise.all(
    recipeMeasurementKeys().map(async (key) => {
      const [hostFamily, recipeId, mode, app] = key.split('/'),
        r = refs.find((r) => r.recipe.data.id === recipeId)!
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
        computedStyles: { color: 'rgb(1, 2, 3)' },
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
  return { matrix, input: { measurements, consumers } }
}
it('requires complete recipe measurements and all 102 installed recipes with finished builds', async () => {
  const { matrix, input } = await fixture()
  await expect(finalizeRecipeEvidence(input, matrix)).resolves.toMatchObject({
    measurements: expect.any(Array),
  })
  delete input.consumers[Object.keys(input.consumers)[0]]
  await expect(finalizeRecipeEvidence(input, matrix)).rejects.toThrow()
})
it('rejects pending builds, missing measurements and tampered installed source', async () => {
  const { matrix, input } = await fixture(),
    first = Object.keys(input.consumers)[0]
  const row = input.consumers[first] as Record<string, unknown>
  row.build = { status: 'pending' }
  await expect(finalizeRecipeEvidence(input, matrix)).rejects.toThrow()
  row.build = { status: 'passed', exitCode: 0 }
  input.measurements.pop()
  await expect(finalizeRecipeEvidence(input, matrix)).rejects.toThrow()
  const fresh = await fixture()
  fresh.matrix[first].sourceHashes = {}
  await expect(
    finalizeRecipeEvidence(fresh.input, fresh.matrix),
  ).rejects.toThrow()
})
