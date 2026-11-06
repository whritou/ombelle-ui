import { expect, it } from 'vitest'
import { normalizePublishedRecipe } from '@ombelle/compiler'
import example from '../../../../examples/recipe.example.json'
import { createPublishAttempt } from './publication'
import { publicationStorageKey, readPublishAttempt, writePublishAttempt } from './publication-storage'
function storage(): Storage {
  const values = new Map<string, string>()
  return { get length() { return values.size }, clear: () => values.clear(), key: i => [...values.keys()][i] ?? null, getItem: k => values.get(k) ?? null, setItem: (k, v) => { values.set(k, v) }, removeItem: k => { values.delete(k) } }
}
it('round-trips detached recipe attempts while leaving draft and preset retry keys untouched', async () => {
  const session = storage(), recipe = (await normalizePublishedRecipe(example)).recipe
  session.setItem('ombelle.button-editor.draft', 'draft sentinel')
  session.setItem('ombelle:preset-editor:publication:v1', 'preset sentinel')
  const attempt = createPublishAttempt(recipe, 100)
  writePublishAttempt(session, attempt)
  expect(readPublishAttempt(session, 101)).toEqual(attempt)
  expect(readPublishAttempt(session, 100 + 86_400_000)).toBeNull()
  expect(session.getItem('ombelle.button-editor.draft')).toBe('draft sentinel')
  expect(session.getItem('ombelle:preset-editor:publication:v1')).toBe('preset sentinel')
})
it('discards only corrupt, future, unsupported, deeply nested or oversized retry records', async () => {
  const session = storage(), attempt = createPublishAttempt((await normalizePublishedRecipe(example)).recipe, 100)
  let nested: unknown = 0
  for (let index = 0; index < 18; index++) nested = { child: nested }
  for (const value of ['{', JSON.stringify({ ...attempt, key: 'bad' }), JSON.stringify({ ...attempt, createdAt: 200 }), JSON.stringify({ ...attempt, extra: true }), JSON.stringify({ ...attempt, recipeHash: 'bad' }), JSON.stringify({ ...attempt, recipe: { ...attempt.recipe, overrides: nested } }), JSON.stringify({ ...attempt, recipe: { ...attempt.recipe, content: 'é'.repeat(70_000) } })]) {
    session.setItem(publicationStorageKey, value)
    expect(readPublishAttempt(session, 101)).toBeNull()
  }
})
it('refuses oversized or malformed writes before storing any bytes', async () => {
  const session = storage(), recipe = (await normalizePublishedRecipe(example)).recipe
  const attempt = createPublishAttempt(recipe, 100)
  expect(() => writePublishAttempt(session, { ...attempt, recipe: { ...recipe.data, content: 'é'.repeat(70_000) } })).toThrow()
  expect(session.length).toBe(0)
})
