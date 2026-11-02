import { afterEach, beforeAll, expect, it, vi } from 'vitest'
import https from 'node:https'
import http, { createServer } from 'node:http'
import fs from 'node:fs/promises'
import path from 'node:path'
import { tmpdir } from 'node:os'
import { normalizePublishedRecipe, normalizePublishedPreset } from '@ombelle/compiler'
import { getCatalog } from '@ombelle/catalog'
import type { RecipeSnapshot, PresetSnapshot } from '@ombelle/contracts'
import recipe from '../../../examples/recipe.example.json'
import { resolvePresetInput } from '../src/snapshots/input.js'
import { resolveRecipeInput } from '../src/snapshots/recipe-input.js'
import { writeRecipeSnapshotCache } from '../src/snapshots/recipe-cache.js'

const official = 'https://ombelle-ui.vercel.app'
const cleanups: Array<() => Promise<unknown>> = []
let presetSnapshot: PresetSnapshot, recipeSnapshot: RecipeSnapshot
beforeAll(async () => {
  const preset = await normalizePublishedPreset(getCatalog('0.1.0').presets.flat)
  const compiled = await normalizePublishedRecipe(recipe)
  const common = { snapshotVersion: '1.0' as const, revision: 1 as const, catalogRelease: '0.1.0' as const, compilerVersion: '0.1.0' as const, createdAt: '2026-11-01T12:00:00.000Z', validationStatus: 'draft' as const }
  presetSnapshot = { ...common, id: 'ps_' + 'a'.repeat(32), preset: preset.data, presetHash: preset.hash }
  recipeSnapshot = { ...common, id: 'rc_' + 'b'.repeat(32), recipe: compiled.recipe.data, recipeHash: compiled.recipe.hash, preset: compiled.preset.data, presetHash: compiled.preset.hash }
})
afterEach(async () => { vi.restoreAllMocks(); for (const close of cleanups.splice(0).reverse()) await close() })
async function fixture(transform: (value: unknown) => unknown = value => value, status = 200) {
  const root = await fs.mkdtemp(path.join(tmpdir(), 'ombelle-hosted-input-'))
  cleanups.push(() => fs.rm(root, { recursive: true, force: true }))
  const requested: string[] = []
  const server = createServer((request, response) => {
    requested.push(request.url!)
    response.writeHead(status, { 'Content-Type': 'application/json' })
    response.end(JSON.stringify(transform(request.url!.includes('/recipes/') ? recipeSnapshot : presetSnapshot)))
  })
  await new Promise<void>(resolve => server.listen(0, '127.0.0.1', resolve))
  cleanups.push(async () => { server.closeAllConnections(); await new Promise<void>(resolve => server.close(() => resolve())) })
  const origin = 'http://127.0.0.1:' + (server.address() as { port: number }).port
  const secure = vi.spyOn(https, 'get').mockImplementation(((url: URL, options: https.RequestOptions) => {
    expect(url.origin).toBe(official)
    expect(options.rejectUnauthorized).toBe(true)
    return http.get(new URL(url.pathname, origin), options)
  }) as typeof https.get)
  return { root, cacheRoot: path.join(root, 'cache'), origin, requested, secure }
}
it('resolves a preset code alone at the official HTTPS origin and records the actual hash', async () => {
  const context = await fixture(), reference = presetSnapshot.id + '@1'
  const input = await resolvePresetInput(reference, { cacheRoot: context.cacheRoot })
  expect(input.source).toEqual({ origin: official, reference, presetHash: presetSnapshot.presetHash })
  expect(input.preset).toEqual(presetSnapshot.preset)
  expect(context.requested).toEqual([`/api/v1/presets/${presetSnapshot.id}/1`])
  expect(await fs.readdir(context.root)).toEqual([])
})
it('resolves a recipe code alone without reading unused cache configuration', async () => {
  const context = await fixture(), reference = recipeSnapshot.id + '@1'
  const input = await resolveRecipeInput(reference, { get cacheRoot(): string { throw new Error('Unused cache must not be read') } })
  expect(input.source).toEqual({ origin: official, reference, recipeHash: recipeSnapshot.recipeHash })
  expect(input.recipe).toEqual(recipeSnapshot.recipe)
  expect(input.resolution).toBe('network')
  expect(context.requested).toEqual([`/api/v1/recipes/${recipeSnapshot.id}/1`])
})
it.each(['preset', 'recipe'] as const)('rejects official %s identity swaps despite self-valid payload hashes', async kind => {
  const context = await fixture(value => ({ ...(value as object), id: (kind === 'preset' ? 'ps_' : 'rc_') + 'f'.repeat(32) }))
  const run = kind === 'preset' ? resolvePresetInput : resolveRecipeInput
  const reference = (kind === 'preset' ? presetSnapshot.id : recipeSnapshot.id) + '@1'
  await expect(run(reference, { cacheRoot: context.cacheRoot })).rejects.toMatchObject({ code: 'RESOLUTION_FAILURE' })
})
it('does not silently fall back when an official recipe was withdrawn', async () => {
  const context = await fixture(value => value, 410)
  await expect(resolveRecipeInput(recipeSnapshot.id + '@1', { cacheRoot: context.cacheRoot })).rejects.toMatchObject({ code: 'RESOLUTION_FAILURE' })
  expect(await fs.readdir(context.root)).toEqual([])
})
it('preserves explicit pinned recipe offline use while treating online withdrawal as authoritative', async () => {
  const context = await fixture(value => value, 410), reference = recipeSnapshot.id + '@1'
  await writeRecipeSnapshotCache(context.cacheRoot, { origin: context.origin, reference, recipeHash: recipeSnapshot.recipeHash }, recipeSnapshot)
  const options = { origin: context.origin, expectedHash: recipeSnapshot.recipeHash, cacheRoot: context.cacheRoot }
  expect(await resolveRecipeInput(reference, { ...options, offline: true })).toMatchObject({ recipe: recipeSnapshot.recipe, resolution: 'cache', networkAccess: false })
  expect(context.requested).toEqual([])
  await expect(resolveRecipeInput(reference, options)).rejects.toMatchObject({ code: 'RESOLUTION_FAILURE' })
  expect(context.requested).toHaveLength(1)
})
it.each([
  ['oversize', (value: unknown) => ' '.repeat(140_000)],
  ['unknown field', (value: unknown) => ({ ...(value as object), unknown: true })],
  ['wrong hash', (value: unknown) => ({ ...(value as object), recipeHash: 'f'.repeat(64) })],
  ['tampered content', (value: unknown) => ({ ...(value as RecipeSnapshot), recipe: { ...(value as RecipeSnapshot).recipe, content: 'changed' } })],
  ['kind swap', () => presetSnapshot],
] as const)('rejects %s recipe responses without writing a cache', async (_, transform) => {
  const context = await fixture(transform)
  await expect(resolveRecipeInput(recipeSnapshot.id + '@1', { cacheRoot: context.cacheRoot })).rejects.toMatchObject({ code: 'RESOLUTION_FAILURE' })
  expect(await fs.readdir(context.root)).toEqual([])
})
it('preserves unsupported release classification for recipe codes', async () => {
  const context = await fixture(value => ({ ...(value as object), compilerVersion: '2.0.0' }))
  await expect(resolveRecipeInput(recipeSnapshot.id + '@1', { cacheRoot: context.cacheRoot })).rejects.toMatchObject({ code: 'UNSUPPORTED_RELEASE' })
})
it.each(['preset', 'recipe'] as const)('keeps custom-origin %s resolution explicitly hash-pinned', async kind => {
  const context = await fixture(), reference = (kind === 'preset' ? presetSnapshot.id : recipeSnapshot.id) + '@1'
  const run = kind === 'preset' ? resolvePresetInput : resolveRecipeInput
  await expect(run(reference, { origin: context.origin, cacheRoot: context.cacheRoot })).rejects.toMatchObject({ code: 'INVALID_DATA' })
  await expect(run(reference, { expectedHash: 'a'.repeat(64), cacheRoot: context.cacheRoot })).rejects.toMatchObject({ code: 'INVALID_DATA' })
  expect(context.requested).toEqual([])
  const hash = kind === 'preset' ? presetSnapshot.presetHash : recipeSnapshot.recipeHash
  expect((await run(reference, { origin: context.origin, expectedHash: hash, cacheRoot: context.cacheRoot })).resolution).toBe('network')
  expect(context.secure).not.toHaveBeenCalled()
})
it.each(['preset', 'recipe'] as const)('gives actionable syntax guidance for code-only %s offline requests', async kind => {
  const context = await fixture(), reference = (kind === 'preset' ? presetSnapshot.id : recipeSnapshot.id) + '@1'
  const run = kind === 'preset' ? resolvePresetInput : resolveRecipeInput
  await expect(run(reference, { offline: true, cacheRoot: context.cacheRoot })).rejects.toMatchObject({ code: 'INVALID_DATA', message: expect.stringMatching(/origin|hash/i) })
  expect(context.requested).toEqual([])
})
it('keeps code-looking recipe filenames local when path-prefixed and rejects wrong kinds before fetching', async () => {
  const context = await fixture(), file = path.join(context.root, recipeSnapshot.id + '@1')
  await fs.writeFile(file, JSON.stringify(recipe))
  expect(await resolveRecipeInput(file, { cacheRoot: 'unused-relative' })).toMatchObject({ recipe, resolution: 'local', networkAccess: false })
  for (const value of [presetSnapshot.id + '@1', 'rc_bad@1', 'https://example.test/recipe'])
    await expect(resolveRecipeInput(value, { cacheRoot: context.cacheRoot })).rejects.toMatchObject({ code: 'INVALID_DATA' })
  expect(context.requested).toEqual([])
})
