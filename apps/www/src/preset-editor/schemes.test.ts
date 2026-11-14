import { describe, expect, it } from 'vitest'
import { contrastRatio } from './contrast'
import { createPresetDraft, materializePreset, presetFieldValue, setPresetEdit } from './model'
import {
  accentSchemes,
  applyColorScheme,
  paletteSchemes,
  paletteTokenKeys,
  resetColorScheme,
  schemeMatches,
} from './schemes'

const rose = accentSchemes.find((scheme) => scheme.id === 'rose')!
// Each family joins this list as its palettes land.
const familiesWithPalettes = ['flat', 'minimalist', 'neo-brutalism', 'ombelle'] as const
type Family = 'flat' | 'minimalist' | 'neo-brutalism' | 'ombelle'

const rgb = (hex: string) =>
  [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16)) as [number, number, number]
const ratio = (a: string, b: string) => contrastRatio(rgb(a), rgb(b))
const textPairs = [
  ['foreground', 'background'],
  ['cardForeground', 'card'],
  ['popoverForeground', 'popover'],
  ['primaryForeground', 'primary'],
  ['secondaryForeground', 'secondary'],
  ['mutedForeground', 'muted'],
  ['accentForeground', 'accent'],
] as const

it('applies an accent scheme to primary and ring in both modes as one valid preset', () => {
  const draft = applyColorScheme(createPresetDraft('flat'), rose)
  expect(presetFieldValue(draft, '/modes/light/primary')).toBe('#E11D48')
  expect(presetFieldValue(draft, '/modes/dark/ring')).toBe('#FDA4AF')
  expect(schemeMatches(draft, rose)).toBe(true)
  expect(() => materializePreset(draft)).not.toThrow()
})

it('offers no palettes for liquid glass, which keeps its tint control', () => {
  expect(paletteSchemes('liquid-glass')).toEqual([])
})

describe.each(familiesWithPalettes)('%s palettes', (family: Family) => {
  const palettes = paletteSchemes(family)
  const first = palettes[0]!

  it('offers at least 6 palettes', () => {
    expect(palettes.length).toBeGreaterThanOrEqual(6)
    expect(new Set(palettes.map((p) => p.id)).size).toBe(palettes.length)
  })

  it.each(palettes.map((p) => [p.label, p] as const))('%s sets every token in hex and never destructive', (_name, palette) => {
    for (const mode of ['light', 'dark'] as const) {
      expect(Object.keys(palette[mode]).sort()).toEqual([...paletteTokenKeys].sort())
      for (const value of Object.values(palette[mode])) expect(value).toMatch(/^#[0-9A-F]{6}$/i)
    }
    expect(palette.family).toBe(family)
    expect(palette.swatch).toBe(palette.light.background)
    expect(palette.swatchDark).toBe(palette.dark.background)
  })

  it.each(palettes.map((p) => [p.label, p] as const))('%s is light in light mode and dark in dark mode', (_name, palette) => {
    // Contrast against black: light backgrounds sit well above dark ones.
    expect(ratio(palette.light.background!, '#000000')).toBeGreaterThan(12)
    expect(ratio(palette.dark.background!, '#000000')).toBeLessThan(2)
  })

  it.each(palettes.map((p) => [p.label, p] as const))('%s keeps text, ring and border legible in both modes', (_name, palette) => {
    for (const mode of ['light', 'dark'] as const) {
      const t = palette[mode]
      for (const [fg, bg] of textPairs) expect(ratio(t[fg]!, t[bg]!), `${mode} ${fg}/${bg}`).toBeGreaterThanOrEqual(4.5)
      expect(ratio(t.ring!, t.background!), `${mode} ring`).toBeGreaterThanOrEqual(3)
      expect(ratio(t.border!, t.background!), `${mode} border`).toBeGreaterThanOrEqual(1.1)
    }
  })

  it('validates as a preset, matches once applied and resets to the style default', () => {
    for (const palette of palettes) {
      const draft = applyColorScheme(createPresetDraft(family), palette)
      expect(() => materializePreset(draft)).not.toThrow()
      expect(schemeMatches(draft, palette)).toBe(true)
      expect(resetColorScheme(draft, palettes).edits).toEqual({})
    }
  })

  it("survives another family's palette and old Slate edits, and resets them", () => {
    const other =
      (['flat', 'minimalist', 'neo-brutalism', 'ombelle'] as const)
        .filter((f) => f !== family)
        .flatMap((f) => paletteSchemes(f))[0] ?? palettes[1]!
    let draft = applyColorScheme(createPresetDraft(family), other)
    draft = setPresetEdit(draft, '/modes/dark/background', '#0F172A')
    expect(schemeMatches(draft, first)).toBe(false)
    expect(() => materializePreset(draft)).not.toThrow()
    const all = familiesWithPalettes.flatMap((f) => paletteSchemes(f))
    expect(resetColorScheme(draft, all).edits).toEqual({})
  })

  it('lets the primary row override only primary, foreground and ring, and the palette restores them', () => {
    let draft = applyColorScheme(applyColorScheme(createPresetDraft(family), first), rose)
    expect(presetFieldValue(draft, '/modes/light/primary')).toBe('#E11D48')
    expect(presetFieldValue(draft, '/modes/light/background')).toBe(first.light.background)
    draft = applyColorScheme(draft, first)
    expect(presetFieldValue(draft, '/modes/light/primary')).toBe(first.light.primary)
  })
})
