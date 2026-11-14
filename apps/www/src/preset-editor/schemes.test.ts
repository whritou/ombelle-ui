import { describe, expect, it } from 'vitest'
import { parseColor } from '../../../../packages/catalog/src/templates/color-picker'
import { contrastRatio } from './contrast'
import { createPresetDraft, materializePreset, presetFieldValue, setPresetEdit } from './model'
import {
  accentSchemes,
  applyColorScheme,
  paletteSchemes,
  paletteTokenKeys,
  releasePalette,
  primaryTokenKeys,
  resetColorScheme,
  resetPalette,
  resetPrimary,
  schemeMatches,
} from './schemes'

const rose = accentSchemes.find((scheme) => scheme.id === 'rose')!
// Each family joins this list as its palettes land.
const familiesWithPalettes = ['flat', 'minimalist', 'neo-brutalism', 'ombelle'] as const
type Family = 'flat' | 'minimalist' | 'neo-brutalism' | 'ombelle'

const rgb = (color: string) => {
  const { r, g, b } = parseColor(color)!.rgb
  return [r, g, b] as [number, number, number]
}
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

  it.each(palettes.map((p) => [p.label, p] as const))('%s sets every token and never destructive', (_name, palette) => {
    for (const mode of ['light', 'dark'] as const) {
      expect(Object.keys(palette[mode]).sort()).toEqual([...paletteTokenKeys].sort())
      for (const value of Object.values(palette[mode])) expect(value).toMatch(family === 'ombelle' ? /^oklch\(/ : /^#[0-9A-F]{6}$/i)
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
      // Field outlines are non-text UI: WCAG 1.4.11.
      expect(ratio(t.input!, t.background!), `${mode} input`).toBeGreaterThanOrEqual(3)
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

  it('releases a carried palette before entering liquid glass, keeping a primary colour', () => {
    const draft = applyColorScheme(applyColorScheme(createPresetDraft(family), first), rose)
    const released = releasePalette(draft)
    expect(Object.keys(released.edits).every((path) => /\/(primary|primaryForeground|ring)$/.test(path))).toBe(true)
    expect(schemeMatches(released, rose)).toBe(true)
    // A single hand-edited token is not a palette and travels.
    const hand = setPresetEdit(createPresetDraft(family), '/modes/light/card', '#FAFAFA')
    expect(releasePalette(hand).edits).toEqual(hand.edits)
  })

  it.runIf(family === 'minimalist')('carries each palette colour in its accent and ring, except neutral Ink', () => {
    const spread = (color: string) => {
      const channels = rgb(color)
      return Math.max(...channels) - Math.min(...channels)
    }
    for (const palette of palettes.filter((p) => p.id !== 'ink')) {
      expect(spread(palette.light.accent!), `${palette.id} light accent`).toBeGreaterThanOrEqual(24)
      expect(spread(palette.dark.accent!), `${palette.id} dark accent`).toBeGreaterThanOrEqual(20)
      expect(spread(palette.light.ring!), `${palette.id} light ring`).toBeGreaterThanOrEqual(60)
      expect(spread(palette.light.background!), `${palette.id} light background`).toBeGreaterThanOrEqual(6)
    }
  })

  it('tells palettes apart by their light and dark swatch', () => {
    expect(new Set(palettes.map((p) => p.swatch)).size).toBe(palettes.length)
    expect(new Set(palettes.map((p) => p.swatchDark)).size).toBe(palettes.length)
  })

  it('keeps the primary choice when only the palette is reset, and the palette when only the primary is', () => {
    let draft = applyColorScheme(applyColorScheme(createPresetDraft(family), first), rose)
    draft = resetPalette(draft)
    expect(schemeMatches(draft, rose)).toBe(true)
    expect(Object.keys(draft.edits).every((path) => /\/(primary|primaryForeground|ring)$/.test(path))).toBe(true)
    draft = applyColorScheme(applyColorScheme(createPresetDraft(family), first), rose)
    draft = resetPrimary(draft)
    expect(schemeMatches(draft, first)).toBe(true)
    expect(presetFieldValue(draft, '/modes/dark/primary')).toBe(first.dark.primary)
    // Without a palette, resetting the primary returns to the style default.
    expect(resetPrimary(applyColorScheme(createPresetDraft(family), rose)).edits).toEqual({})
    // A palette still matches while a primary colour overrides its primary.
    expect(schemeMatches(applyColorScheme(applyColorScheme(createPresetDraft(family), first), rose), first, primaryTokenKeys)).toBe(true)
  })

  it('lets the primary row override only primary, foreground and ring, and the palette restores them', () => {
    let draft = applyColorScheme(applyColorScheme(createPresetDraft(family), first), rose)
    expect(presetFieldValue(draft, '/modes/light/primary')).toBe('#E11D48')
    expect(presetFieldValue(draft, '/modes/light/background')).toBe(first.light.background)
    draft = applyColorScheme(draft, first)
    expect(presetFieldValue(draft, '/modes/light/primary')).toBe(first.light.primary)
  })
})
