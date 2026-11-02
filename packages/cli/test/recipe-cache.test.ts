import fs from 'node:fs/promises'
import path from 'node:path'
import { tmpdir } from 'node:os'
import { createHash } from 'node:crypto'
import { afterEach, expect, it } from 'vitest'
import { getCatalog } from '@ombelle/catalog'
import { canonicalize, normalizePublishedRecipe, normalizePublishedPreset } from '@ombelle/compiler'
import type { RecipeSnapshot, RecipeSnapshotSource, PresetSnapshot } from '@ombelle/contracts'
import recipe from '../../../examples/recipe.example.json'
import { readRecipeSnapshotCache, writeRecipeSnapshotCache } from '../src/snapshots/recipe-cache.js'
import { readSnapshotCache, writeSnapshotCache } from '../src/snapshots/cache.js'
const roots: string[] = []
afterEach(async () => { for (const root of roots.splice(0)) await fs.rm(root, { recursive: true, force: true }) })
async function setup() {
  const parent = await fs.mkdtemp(path.join(tmpdir(), 'ombelle-recipe-cache-')); roots.push(parent)
  const compiled = await normalizePublishedRecipe(recipe)
  const common = { snapshotVersion: '1.0' as const, revision: 1 as const, createdAt: '2026-11-01T12:00:00.000Z', catalogRelease: '0.1.0' as const, compilerVersion: '0.1.0' as const, validationStatus: 'draft' as const }
  const snapshot: RecipeSnapshot = { ...common, id: 'rc_' + 'a'.repeat(32), recipe: compiled.recipe.data, recipeHash: compiled.recipe.hash, preset: compiled.preset.data, presetHash: compiled.preset.hash }
  const key: RecipeSnapshotSource = { origin: 'https://ombelle-ui.vercel.app', reference: snapshot.id + '@1', recipeHash: snapshot.recipeHash }
  return { parent, root: path.join(parent, 'cache'), snapshot, key, common }
}
it('isolates verified recipe cache keys, refuses mutation and leaves corrupt bytes untouched', async () => {
  const { root, snapshot, key } = await setup()
  await writeRecipeSnapshotCache(root, key, snapshot)
  expect(await readRecipeSnapshotCache(root, key)).toEqual(snapshot)
  for (const change of [{ origin: 'https://other.test' }, { reference: 'rc_' + 'b'.repeat(32) + '@1' }, { recipeHash: 'f'.repeat(64) }])
    expect(await readRecipeSnapshotCache(root, { ...key, ...change })).toBeNull()
  await expect(writeRecipeSnapshotCache(root, key, { ...snapshot, createdAt: '2026-11-02T00:00:00.000Z' })).rejects.toThrow(/immutable/)
  const file = path.join(root, (await fs.readdir(root))[0])
  await fs.writeFile(file, '{')
  expect(await readRecipeSnapshotCache(root, key)).toBeNull()
  expect(await fs.readFile(file, 'utf8')).toBe('{')
})
it('rejects wrong-kind envelopes before writing any cache files', async () => {
  const { root, snapshot, key, parent } = await setup()
  await expect(writeRecipeSnapshotCache(root, key, { ...snapshot, id: 'ps_' + 'a'.repeat(32) })).rejects.toThrow()
  expect(await fs.readdir(parent)).toEqual([])
})
it('counts recipe and preset entries together in the bounded cache', async () => {
  const { root, snapshot, key, common } = await setup()
  const preset = await normalizePublishedPreset(getCatalog('0.1.0').presets.flat)
  const first: PresetSnapshot = { ...common, id: 'ps_' + '0'.repeat(32), preset: preset.data, presetHash: preset.hash }
  const firstKey = { origin: key.origin, reference: first.id + '@1', presetHash: first.presetHash }
  await writeSnapshotCache(root, firstKey, first)
  const file = path.join(root, (await fs.readdir(root))[0])
  await fs.utimes(file, new Date(0), new Date(0))
  // Seed valid entries directly; the admission under test must account for both
  // kinds. Repeatedly revalidating every growing prefix only tests setup cost.
  for (let index = 0; index < 99; index++) {
    const item = { ...snapshot, id: 'rc_' + index.toString(16).padStart(32, '0') }
    const source = { ...key, reference: item.id + '@1' }
    const name = createHash('sha256').update(canonicalize(source)).digest('hex') + '.json'
    await fs.writeFile(path.join(root, name), canonicalize(item), { mode: 0o600 })
  }
  const item = { ...snapshot, id: 'rc_' + (99).toString(16).padStart(32, '0') }
  await writeRecipeSnapshotCache(root, { ...key, reference: item.id + '@1' }, item)
  expect(await fs.readdir(root)).toHaveLength(100)
  expect(await readSnapshotCache(root, firstKey)).toBeNull()
  expect(await readRecipeSnapshotCache(root, { ...key, reference: 'rc_' + (99).toString(16).padStart(32, '0') + '@1' })).not.toBeNull()
})
