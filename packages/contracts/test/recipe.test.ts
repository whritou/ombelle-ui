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
it('accepts per-mode Button color overrides in preset color syntax', () => {
  const colors = {
    light: { background: '#1D4ED8', foreground: 'oklch(98% 0.01 260)', border: '#000000' },
    dark: { background: 'oklch(0.7 0.15 260 / 0.9)' },
  }
  const recipe = validateRecipe({ ...example, overrides: { colors } })
  expect(recipe.overrides.colors).toEqual(colors)
  expect(validateRecipe({ ...example, overrides: { colors: {} } }).overrides.colors).toEqual({})
})
it.each([
  [{ light: { background: 'red' } }, '/overrides/colors/light/background'],
  [{ dark: { foreground: '#12345' } }, '/overrides/colors/dark/foreground'],
  [{ dark: { border: 'oklch(120% 0.1 20)' } }, '/overrides/colors/dark/border'],
  [{ light: { foreground: 'oklch(0.5 0.9 20)' } }, '/overrides/colors/light/foreground'],
  [{ light: { background: 'oklch(0.5 0.1 400)' } }, '/overrides/colors/light/background'],
  [{ light: { ring: '#000000' } }, '/overrides/colors/light/ring'],
  [{ dim: {} }, '/overrides/colors/dim'],
])('rejects invalid recipe color %# with its JSON pointer', (colors, path) => {
  try {
    validateRecipe({ ...example, overrides: { colors } })
    expect.unreachable()
  } catch (error) {
    expect(error).toMatchObject({ code: 'INVALID_DATA', path })
  }
})
