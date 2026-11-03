import { expect, it } from 'vitest'
import { createPresetDraft, materializePreset, presetFieldValue } from './model'
import {
  accentSchemes,
  applyColorScheme,
  baseSchemes,
  resetColorScheme,
  schemeMatches,
} from './schemes'

const rose = accentSchemes.find((scheme) => scheme.id === 'rose')!
const stone = baseSchemes.find((scheme) => scheme.id === 'stone')!

it('applies an accent scheme to primary and ring in both modes as one valid preset', () => {
  const draft = applyColorScheme(createPresetDraft('flat'), rose)
  expect(presetFieldValue(draft, '/modes/light/primary')).toBe('#E11D48')
  expect(presetFieldValue(draft, '/modes/dark/ring')).toBe('#FDA4AF')
  expect(schemeMatches(draft, rose)).toBe(true)
  expect(() => materializePreset(draft)).not.toThrow()
})

it('keeps accent and base schemes independent and resets only the chosen group', () => {
  let draft = applyColorScheme(applyColorScheme(createPresetDraft('neo-brutalism'), rose), stone)
  expect(schemeMatches(draft, rose) && schemeMatches(draft, stone)).toBe(true)
  draft = resetColorScheme(draft, baseSchemes)
  expect(schemeMatches(draft, stone)).toBe(false)
  expect(schemeMatches(draft, rose)).toBe(true)
  expect(Object.keys(draft.edits).every((path) => /primary|ring/i.test(path))).toBe(true)
})

it('never touches borders, inputs or destructive tokens that the style family owns', () => {
  for (const scheme of [...accentSchemes, ...baseSchemes])
    for (const mode of ['light', 'dark'] as const)
      for (const key of Object.keys(scheme[mode]))
        expect(['border', 'input', 'destructive', 'destructiveForeground']).not.toContain(key)
})

it('produces presets that validate for every family and scheme pair', () => {
  for (const family of ['flat', 'minimalist', 'neo-brutalism', 'liquid-glass'] as const)
    for (const accent of accentSchemes)
      for (const base of baseSchemes)
        expect(() =>
          materializePreset(applyColorScheme(applyColorScheme(createPresetDraft(family), accent), base)),
        ).not.toThrow()
})
