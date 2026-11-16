import { describe, it, expect } from 'vitest'
import example from '../../../examples/preset.example.json'
import {
  validatePreset,
  FoundationError,
  presetSchemaVersion,
  usesExtendedTypography,
} from '../src/index.js'
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
  it('accepts papier as a style family', () => {
    expect(validatePreset({ ...example, styleFamily: 'papier' }).styleFamily).toBe('papier')
  })
  it('accepts organic as a style family', () => {
    expect(validatePreset({ ...example, styleFamily: 'organic' }).styleFamily).toBe('organic')
  })
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

describe('extended typography and the schema version', () => {
  const withDesign = (schemaVersion: string, design: Record<string, string>) => ({
    ...example,
    schemaVersion,
    design: { ...example.design, ...design },
  })
  const rejected = (input: unknown) => {
    try {
      validatePreset(input)
      expect.fail('expected rejection')
    } catch (error) {
      expect(error).toBeInstanceOf(FoundationError)
      return error as FoundationError
    }
  }
  it('rejects a 1.0 preset that sets headingFontFamilyId', () => {
    const error = rejected(withDesign('1.0', { headingFontFamilyId: 'fraunces' }))
    expect(error).toMatchObject({ code: 'INVALID_DATA', path: '/schemaVersion' })
    expect(error.message).toContain('1.1')
  })
  it('rejects a 1.0 preset that sets a registry fontFamilyId', () => {
    expect(rejected(withDesign('1.0', { fontFamilyId: 'inter' }))).toMatchObject({
      code: 'INVALID_DATA',
      path: '/schemaVersion',
    })
  })
  it('rejects a 1.0 preset that sets monoFontFamilyId', () => {
    expect(rejected(withDesign('1.0', { monoFontFamilyId: 'geist-mono' }))).toMatchObject({
      path: '/schemaVersion',
    })
  })
  it('accepts a 1.1 preset with heading, mono and registry body fonts', () => {
    const preset = validatePreset(
      withDesign('1.1', {
        fontFamilyId: 'inter',
        headingFontFamilyId: 'fraunces',
        monoFontFamilyId: 'jetbrains-mono',
      }),
    )
    expect(preset.schemaVersion).toBe('1.1')
  })
  it('accepts a 1.1 preset that uses only system ids', () => {
    expect(validatePreset(withDesign('1.1', { fontFamilyId: 'system-serif' })).schemaVersion).toBe('1.1')
  })
  it('accepts a 1.0 preset that uses only system ids unchanged', () => {
    expect(validatePreset(withDesign('1.0', { fontFamilyId: 'system-mono' })).schemaVersion).toBe('1.0')
  })
  it('rejects an unknown font id at its field', () => {
    expect(rejected(withDesign('1.1', { headingFontFamilyId: 'not-a-font' }))).toMatchObject({
      path: '/design/headingFontFamilyId',
    })
  })
  it('chooses 1.0 unless a preset uses extended typography', () => {
    expect(presetSchemaVersion(undefined)).toBe('1.0')
    expect(presetSchemaVersion({})).toBe('1.0')
    expect(presetSchemaVersion({ fontFamilyId: 'system-serif' })).toBe('1.0')
    expect(presetSchemaVersion({ headingFontFamilyId: 'fraunces' })).toBe('1.1')
    // These fields are new even when their values name system stacks.
    expect(presetSchemaVersion({ headingFontFamilyId: 'system-serif' })).toBe('1.1')
    expect(presetSchemaVersion({ monoFontFamilyId: 'system-mono' })).toBe('1.1')
    expect(presetSchemaVersion({ monoFontFamilyId: 'geist-mono' })).toBe('1.1')
    expect(presetSchemaVersion({ fontFamilyId: 'inter' })).toBe('1.1')
    expect(usesExtendedTypography({ fontFamilyId: 'system-sans' })).toBe(false)
    expect(usesExtendedTypography({ fontFamilyId: 'inter' })).toBe(true)
  })
})
