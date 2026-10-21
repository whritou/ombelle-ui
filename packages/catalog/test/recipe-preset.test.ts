import { expect, it } from 'vitest'
import { resolveRecipePreset } from '../src/index.js'
import example from '../../../examples/recipe.example.json'
it.each(['flat', 'minimalist', 'neo-brutalism'])('resolves exact built-in %s', family => {
  const ref = { ...example.presetRef, id: 'builtin-' + family }
  expect(resolveRecipePreset(ref).id).toBe(ref.id)
})
it.each([{ id: 'absent' }, { revision: 2 }, { catalogRelease: '9.0.0' }, { compilerVersion: '9.0.0' }])('rejects unresolved reference %j', patch => {
  expect(() => resolveRecipePreset({ ...example.presetRef, ...patch })).toThrow()
})
