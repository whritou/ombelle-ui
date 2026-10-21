import { expect, it } from 'vitest'
import { validateRecipe } from '../src/index.js'
import example from '../../../examples/recipe.example.json'

it('validates and clones the authoritative recipe example', () => {
  expect(validateRecipe(example)).toEqual(example)
  const result = validateRecipe(example)
  result.props.size = 'sm'
  expect(example.props.size).toBe('lg')
})
it.each([
  { ...example, surprise: true },
  { ...example, component: 'dialog' },
  { ...example, revision: Number.MAX_SAFE_INTEGER + 1 },
  { ...example, content: 'x'.repeat(201) },
  { ...example, props: { onClick: 'alert(1)' } },
  { ...example, props: { size: 'huge' } },
  { ...example, overrides: { minHeightPx: 23 } },
  { ...example, overrides: { radiusRem: Infinity } },
  { ...example, presetRef: { ...example.presetRef, id: '../preset.json' } },
  {
    ...example,
    presetRef: { ...example.presetRef, revision: Number.MAX_SAFE_INTEGER + 1 },
  },
])('rejects unsafe recipe input %#', (input) =>
  expect(() => validateRecipe(input)).toThrow(),
)
