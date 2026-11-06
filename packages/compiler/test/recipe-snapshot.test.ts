import { beforeAll, expect, it } from 'vitest'
import example from '../../../examples/recipe.example.json'
import type { RecipeSnapshot } from '@ombelle/contracts'
import { canonicalize, compileRecipe, normalizePublishedRecipe, verifyRecipeSnapshot } from '../src/index.js'

let snapshot: RecipeSnapshot
beforeAll(async () => {
  const compiled = await compileRecipe({ recipe: example })
  snapshot = {
    snapshotVersion: '1.0', id: 'rc_0123456789abcdef0123456789abcdef', revision: 1,
    recipe: compiled.recipe.data, recipeHash: compiled.recipe.hash,
    preset: compiled.preset.data, presetHash: compiled.preset.hash,
    catalogRelease: '0.1.0', compilerVersion: '0.1.0', createdAt: '2026-11-01T10:00:00.000Z', validationStatus: 'draft',
  }
})
it('normalizes publication through the existing recipe compiler with unchanged artifacts', async () => {
  expect(await normalizePublishedRecipe(example)).toEqual(await compileRecipe({ recipe: example }))
  expect(await verifyRecipeSnapshot(snapshot)).toEqual(snapshot)
})
it('normalizes a glass Button recipe with a low-contrast opacity override', async () => {
  const compiled = await normalizePublishedRecipe({
    ...example,
    presetRef: { ...example.presetRef, id: 'builtin-liquid-glass' },
    overrides: { glassOpacity: 0.3 },
  })
  expect(compiled.recipe.data.overrides.glassOpacity).toBe(0.3)
  expect(compiled.artifacts.find(({ kind }) => kind === 'style')?.content).toContain('--glass-opacity: 0.3')
})
it('checks requested recipe distribution identity and pinned hash', async () => {
  const expected = { reference: snapshot.id + '@1', recipeHash: snapshot.recipeHash }
  expect(await verifyRecipeSnapshot(snapshot, expected)).toEqual(snapshot)
  for (const bad of [{ ...expected, recipeHash: 'f'.repeat(64) }, { ...expected, reference: 'rc_' + 'f'.repeat(32) + '@1' }])
    await expect(verifyRecipeSnapshot(snapshot, bad)).rejects.toThrow()
})
it.each(['recipeHash', 'presetHash', 'recipe', 'preset', 'normalization'])(
  'rejects tampering or noncanonical recipe data: %s', async (field) => {
    const value = structuredClone(snapshot)
    if (field === 'recipeHash') value.recipeHash = 'f'.repeat(64)
    if (field === 'presetHash') value.presetHash = 'f'.repeat(64)
    if (field === 'recipe') value.recipe.content = 'Tampered'
    if (field === 'preset') value.preset.name = 'Tampered'
    if (field === 'normalization') delete value.recipe.props.type
    await expect(verifyRecipeSnapshot(value)).rejects.toThrow()
  },
)
it('rejects a recipe envelope whose resolved preset differs from its builtin reference', async () => {
  const other = await compileRecipe({ recipe: { ...example, presetRef: { ...example.presetRef, id: 'builtin-flat' } } })
  await expect(verifyRecipeSnapshot({ ...snapshot, preset: other.preset.data, presetHash: other.preset.hash })).rejects.toThrow()
})
it('rejects oversized source and envelope data before accepting publication', async () => {
  await expect(normalizePublishedRecipe({ ...example, content: 'x'.repeat(65_537) })).rejects.toThrow()
  await expect(verifyRecipeSnapshot({ ...snapshot, junk: 'x'.repeat(131_073) })).rejects.toThrow()
})
it('keeps distribution identity and timestamps outside the compiled recipe hash', async () => {
  const value = { ...snapshot, id: 'rc_' + 'f'.repeat(32), createdAt: '2026-11-02T00:00:00.000Z' }
  expect((await verifyRecipeSnapshot(value)).recipeHash).toBe(snapshot.recipeHash)
  expect(canonicalize(snapshot.recipe)).toBe(canonicalize((await normalizePublishedRecipe(example)).recipe.data))
})
