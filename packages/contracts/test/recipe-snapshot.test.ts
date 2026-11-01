import { expect, it } from 'vitest'
import recipe from '../../../examples/recipe.example.json'
import preset from '../../catalog/src/presets/neo-brutalism.json'
import { parseRecipeSnapshotReference, validateRecipeSnapshot, validateRecipeSnapshotSource } from '../src/index.js'

const id = 'rc_0123456789abcdef0123456789abcdef'
const envelope = {
  snapshotVersion: '1.0', id, revision: 1, recipe, recipeHash: 'a'.repeat(64),
  preset, presetHash: 'b'.repeat(64), catalogRelease: '0.1.0', compilerVersion: '0.1.0',
  createdAt: '2026-11-01T10:00:00.000Z', validationStatus: 'draft',
}

it('parses only exact immutable recipe references', () => {
  expect(parseRecipeSnapshotReference(id + '@1')).toEqual({ id, revision: 1 })
})
it.each([id, id + '@01', id + '@2', id.toUpperCase() + '@1', id + '@1\n', id.replace('rc_', 'ps_') + '@1', id + '@1/path'])(
  'rejects malformed or wrong-kind recipe reference %s', (value) => {
    expect(() => parseRecipeSnapshotReference(value)).toThrow()
  },
)
it('validates and clones recipe envelopes without replacing embedded identities', () => {
  expect(validateRecipeSnapshot(envelope)).toEqual(envelope)
  expect(validateRecipeSnapshot(envelope).recipe).not.toBe(recipe)
})
it.each([
  { ...envelope, extra: true }, { ...envelope, recipe: { ...recipe, extra: true } },
  { ...envelope, revision: 2 }, { ...envelope, id: id.replace('rc_', 'ps_') },
  { ...envelope, catalogRelease: '2.0.0' }, { ...envelope, recipeHash: 'A'.repeat(64) },
  { ...envelope, recipe: { ...recipe, revision: Number.MAX_SAFE_INTEGER + 1 } },
  { ...envelope, createdAt: '2026-02-30T10:00:00.000Z' },
  { ...envelope, recipe: { ...recipe, presetRef: { ...recipe.presetRef, compilerVersion: '2.0.0' } } },
  { ...envelope, preset: { ...preset, catalogRelease: '2.0.0' } },
])('rejects malformed or unsupported recipe envelopes %#', (value) => {
  expect(() => validateRecipeSnapshot(value)).toThrow()
})
it('validates a separate canonical recipe source', () => {
  const source = { origin: 'https://ombelle-ui.vercel.app', reference: id + '@1', recipeHash: 'a'.repeat(64) }
  expect(validateRecipeSnapshotSource(source)).toEqual(source)
  for (const bad of [{ ...source, origin: 'https://EXAMPLE.com/' }, { ...source, presetHash: 'b'.repeat(64) }, { ...source, reference: id + '@2' }])
    expect(() => validateRecipeSnapshotSource(bad)).toThrow()
})
