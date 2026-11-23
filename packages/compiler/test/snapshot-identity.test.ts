// Decision 0009: a published snapshot is identified by its stored bytes. Snapshots published before a
// built-in preset or a family default changed must keep verifying and keep compiling with their own preset.
import { expect, it } from 'vitest'
import { getCatalog, type Catalog } from '@ombelle/catalog'
import type { InstallableRecipeSnapshot, Preset, PresetSnapshot, RecipeSnapshot } from '@ombelle/contracts'
import flatBefore from './fixtures/legacy-presets/flat-before-2026-11-04.json'
import badge from '../../../examples/component-recipe.badge.json'
import neoBefore from './fixtures/legacy-presets/neo-brutalism-2026-11-02.json'
import {
  canonicalize, compileComponentRecipe, compileRecipe, presetWithDefaults, sha256,
  verifyInstallableRecipeSnapshot, verifyPresetSnapshot, verifyRecipeSnapshot,
} from '../src/index.js'

/** The preset as publication stored it at the time: normalized against the catalog of that day. */
async function published(old: unknown) {
  const preset = old as Preset
  const data = presetWithDefaults(preset, { presets: { [preset.styleFamily]: preset } } as unknown as Catalog)
  return { data, hash: await sha256(canonicalize(data)) }
}
const envelope = (id: string) => ({
  id, revision: 1 as const, catalogRelease: '0.1.0' as const, compilerVersion: '0.1.0' as const,
  createdAt: '2026-11-01T10:00:00.000Z', validationStatus: 'draft' as const,
})

it('reproduces the hashes decision 0003 recorded for the presets before the refresh', async () => {
  expect((await published(flatBefore)).hash).toBe('5ff15eb2735326caa531570abf3bb701cc2ad8e054ce90b2940888bed4bd6038')
  expect((await published(neoBefore)).hash).toBe('d4408485d0042453f1b9ba3b2e4340fc9b23ea38f973b49603b76f1b4c9c6fac')
})

it('verifies a preset code published before a family default was added', async () => {
  const preset = await published(neoBefore)
  expect(Object.hasOwn(getCatalog('0.1.0').presets['neo-brutalism'].modes.light, 'shadowColor')).toBe(true)
  expect(Object.hasOwn(preset.data.modes.light, 'shadowColor')).toBe(false)
  const snapshot: PresetSnapshot = {
    snapshotVersion: '1.0', ...envelope('ps_0123456789abcdef0123456789abcdef'),
    preset: preset.data, presetHash: preset.hash,
  }
  expect(await verifyPresetSnapshot(snapshot, { reference: snapshot.id + '@1', presetHash: preset.hash })).toEqual(snapshot)
})

it('verifies a Button recipe code published against a built-in that changed since', async () => {
  const preset = await published(flatBefore)
  const current = await compileRecipe({ recipe: { ...recipe, presetRef: { ...recipe.presetRef, id: 'builtin-flat' } } })
  expect(current.preset.hash).not.toBe(preset.hash)
  const compiled = await compileRecipe({ recipe: { ...recipe, presetRef: { ...recipe.presetRef, id: 'builtin-flat' } }, preset: preset.data })
  expect(compiled.preset).toEqual(preset)
  const snapshot: RecipeSnapshot = {
    snapshotVersion: '1.0', ...envelope('rc_0123456789abcdef0123456789abcdef'),
    recipe: compiled.recipe.data, recipeHash: compiled.recipe.hash, preset: preset.data, presetHash: preset.hash,
  }
  expect(await verifyRecipeSnapshot(snapshot)).toEqual(snapshot)
  // The stored preset, not today's built-in, decides the identity and the scope.
  expect(compiled.scope).not.toBe(current.scope)
})

it('verifies a component recipe code published against a built-in that changed since', async () => {
  const preset = await published(flatBefore)
  const data = { ...badge, id: 'old-badge', presetRef: { ...badge.presetRef, id: 'builtin-flat', revision: 1 } }
  const compiled = await compileComponentRecipe({ recipe: data, preset: preset.data })
  expect(compiled.preset).toEqual(preset)
  const snapshot = {
    snapshotVersion: '2.0', ...envelope('rc_0123456789abcdef0123456789abcdef'),
    recipe: compiled.recipe.data, recipeHash: compiled.recipe.hash, preset: preset.data, presetHash: preset.hash,
  } as InstallableRecipeSnapshot
  expect(await verifyInstallableRecipeSnapshot(snapshot)).toEqual(snapshot)
})

it('still rejects a stored preset that is not the built-in the recipe names', async () => {
  const preset = await published(neoBefore)
  const compiled = await compileRecipe({ recipe: { ...recipe, presetRef: { ...recipe.presetRef, id: 'builtin-flat' } } })
  await expect(compileRecipe({ recipe: { ...recipe, presetRef: { ...recipe.presetRef, id: 'builtin-flat' } }, preset: preset.data }))
    .rejects.toThrow('not the built-in preset the recipe names')
  const snapshot: RecipeSnapshot = {
    snapshotVersion: '1.0', ...envelope('rc_0123456789abcdef0123456789abcdef'),
    recipe: compiled.recipe.data, recipeHash: compiled.recipe.hash, preset: preset.data, presetHash: preset.hash,
  }
  await expect(verifyRecipeSnapshot(snapshot)).rejects.toThrow(/preset/)
})

const recipe = {
  schemaVersion: '1.0', id: 'old-button', revision: 1, component: 'button',
  presetRef: { id: 'builtin-flat', revision: 1, catalogRelease: '0.1.0', compilerVersion: '0.1.0' },
  props: {}, content: 'Save', overrides: {},
}
