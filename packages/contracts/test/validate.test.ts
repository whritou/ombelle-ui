import { describe, it, expect } from 'vitest'
import example from '../../../examples/preset.example.json'
import { validatePreset, FoundationError } from '../src/index.js'
describe('preset contract', () => {
  it('accepts the existing example without changing its style', () => {
    expect(validatePreset(example).styleFamily).toBe('neo-brutalism')
  })
  it.each([
    ['unknown field', { ...example, surprise: true }, '/surprise'],
    [
      'out of bounds',
      { ...example, design: { ...example.design, radiusRem: 3 } },
      '/design/radiusRem',
    ],
    [
      'invalid color numbers',
      {
        ...example,
        modes: {
          ...example.modes,
          light: { ...example.modes.light, primary: 'oklch(200% 0.2 10)' },
        },
      },
      '/modes/light/primary',
    ],
    [
      'malformed numeric color',
      {
        ...example,
        modes: {
          ...example.modes,
          light: { ...example.modes.light, primary: 'oklch(0..2 0.2 10)' },
        },
      },
      '/modes/light/primary',
    ],
    [
      'nonfinite design',
      { ...example, design: { ...example.design, radiusRem: Infinity } },
      '/design/radiusRem',
    ],
  ])('rejects %s with a stable diagnostic', (_label, input, path) => {
    try {
      validatePreset(input)
      expect.fail('expected rejection')
    } catch (error) {
      expect(error).toBeInstanceOf(FoundationError)
      expect(error).toMatchObject({ code: 'INVALID_DATA', path })
    }
  })
  it('does not reject a schema-valid later style at schema validation', () => {
    expect(
      validatePreset({ ...example, styleFamily: 'minimalist' }).styleFamily,
    ).toBe('minimalist')
  })
})
