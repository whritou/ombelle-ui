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
  it.each([1, 2, Number.MAX_SAFE_INTEGER])(
    'accepts safe positive revision %s',
    (revision) => {
      expect(validatePreset({ ...example, revision }).revision).toBe(revision)
    },
  )
  it.each([0, -1, 1.5, Number.MAX_SAFE_INTEGER + 1, 1e21])(
    'rejects unsafe or nonpositive revision %s at its field',
    (revision) => {
      expect(() => validatePreset({ ...example, revision })).toThrow(
        expect.objectContaining({ code: 'INVALID_DATA', path: '/revision' }),
      )
    },
  )
  it('accepts ombelle as a style family', () => {
    expect(validatePreset({ ...example, styleFamily: 'ombelle' }).styleFamily).toBe('ombelle')
  })
  it('rejects a style family outside the enum', () => {
    expect(() => validatePreset({ ...example, styleFamily: 'not-a-family' })).toThrow(
      expect.objectContaining({ code: 'INVALID_DATA', path: '/styleFamily' }),
    )
  })
  it('does not reject a schema-valid later style at schema validation', () => {
    expect(
      validatePreset({ ...example, styleFamily: 'minimalist' }).styleFamily,
    ).toBe('minimalist')
  })
})

describe('liquid glass material settings', () => {
  const glass = (design: Record<string, number>) => ({
    ...example,
    styleFamily: 'liquid-glass',
    design: { ...example.design, ...design },
  })
  it('accepts the material settings at their maxima', () => {
    const design = validatePreset(
      glass({
        glassRefraction: 1,
        glassRefractionWidth: 0.3,
        glassHalo: 1,
        glassDepth: 1,
        glassMotion: 1,
        glassDispersion: 1,
        glassBackdropContrast: 1.25,
        glassSheen: 0.76,
      }),
    ).design as Record<string, unknown>
    expect(design.glassRefractionWidth).toBe(0.3)
    expect(design.glassBackdropContrast).toBe(1.25)
    expect(design.glassSheen).toBe(0.76)
  })
  it.each([
    ['glassRefractionWidth', 0.31],
    ['glassBackdropContrast', 1.61],
    ['glassSheen', 1.01],
    ['glassHalo', 1.01],
  ])('rejects %s at %s', (field, value) => {
    try {
      validatePreset(glass({ [field]: value }))
      expect.unreachable()
    } catch (error) {
      expect(error).toBeInstanceOf(FoundationError)
      expect((error as FoundationError).path).toBe('/design/' + field)
    }
  })
})
