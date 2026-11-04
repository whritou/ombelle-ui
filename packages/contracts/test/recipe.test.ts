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
it('accepts bounded padding, gap and typography overrides', () => {
  const overrides = {
    paddingXPx: 48, paddingYPx: 0, gapPx: 24,
    fontWeight: 700, fontSizePx: 11, letterSpacingEm: -0.05, uppercase: true,
  }
  expect(validateRecipe({ ...example, overrides }).overrides).toEqual(overrides)
})
it.each([
  [{ paddingXPx: 49 }, '/overrides/paddingXPx'],
  [{ paddingXPx: -1 }, '/overrides/paddingXPx'],
  [{ paddingYPx: 25 }, '/overrides/paddingYPx'],
  [{ gapPx: 24.5 }, '/overrides/gapPx'],
  [{ fontWeight: 450 }, '/overrides/fontWeight'],
  [{ fontWeight: 900 }, '/overrides/fontWeight'],
  [{ fontSizePx: 10 }, '/overrides/fontSizePx'],
  [{ letterSpacingEm: 0.3 }, '/overrides/letterSpacingEm'],
  [{ uppercase: 'yes' }, '/overrides/uppercase'],
])('rejects out-of-range layout or type override %#', (overrides, path) => {
  try {
    validateRecipe({ ...example, overrides })
    expect.unreachable()
  } catch (error) {
    expect(error).toMatchObject({ code: 'INVALID_DATA', path })
  }
})
it('accepts reviewed icons and keeps their schema enum and lucide map in step', async () => {
  const { recipeIcons } = await import('../src/index.js')
  const { recipeSchema } = await import('../src/recipe-schema.js')
  expect(Object.keys(recipeIcons).sort()).toEqual([...recipeSchema.properties.icon.properties.name.enum].sort())
  const icon = { name: 'arrow-right', position: 'end', iconOnly: false }
  expect(validateRecipe({ ...example, icon }).icon).toEqual(icon)
  expect(validateRecipe({ ...example, icon: { name: 'plus' } }).icon).toEqual({ name: 'plus' })
})
it.each([
  [{ ...example, icon: { name: 'rocket' } }, '/icon/name'],
  [{ ...example, icon: { position: 'start' } }, '/icon/name'],
  [{ ...example, icon: { name: 'plus', position: 'middle' } }, '/icon/position'],
  [{ ...example, icon: { name: 'plus', svg: '<svg/>' } }, '/icon/svg'],
  [{ ...example, content: '   ', icon: { name: 'plus', iconOnly: true } }, '/content'],
])('rejects an unreviewed icon or an icon-only Button without a label %#', (input, path) => {
  try {
    validateRecipe(input)
    expect.unreachable()
  } catch (error) {
    expect(error).toMatchObject({ code: 'INVALID_DATA', path })
  }
})
it('accepts hover and pressed colors per mode and checks them like base colors', () => {
  const colors = {
    light: { hoverBackground: '#1D4ED8', pressedForeground: 'oklch(98% 0.01 260)' },
    dark: { hoverBorder: '#000000', pressedBackground: 'oklch(0.7 0.15 260)' },
  }
  expect(validateRecipe({ ...example, overrides: { colors } }).overrides.colors).toEqual(colors)
  for (const [bad, path] of [
    [{ light: { hoverBackground: 'red' } }, '/overrides/colors/light/hoverBackground'],
    [{ dark: { pressedBorder: 'oklch(120% 0.1 20)' } }, '/overrides/colors/dark/pressedBorder'],
    [{ light: { focusBackground: '#000000' } }, '/overrides/colors/light/focusBackground'],
  ] as const)
    expect(() => validateRecipe({ ...example, overrides: { colors: bad } })).toThrow(
      expect.objectContaining({ path }),
    )
})
it('normalizes icon defaults only when an icon is set', async () => {
  const { normalizeRecipe } = await import('../src/index.js')
  expect(normalizeRecipe(validateRecipe(example))).not.toHaveProperty('icon')
  expect(normalizeRecipe(validateRecipe({ ...example, icon: { name: 'plus' } })).icon).toEqual({
    name: 'plus', position: 'start', iconOnly: false,
  })
})
