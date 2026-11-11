import { expect, it } from 'vitest'
import { getCatalog, startingPresetOrder, type StartingPresetId } from '@ombelle/catalog'
import type { Preset } from '@ombelle/contracts'
import { glassBackdropOptions, glassPresetBackdrop } from './glass-presets'
import { glassSceneRatios, labInkFor, pickGlassScene } from './glass-backdrops'

const preset = (id: StartingPresetId): Preset => structuredClone(getCatalog('0.1.0').startingPresets[id])
const modes = ['light', 'dark'] as const

it('built-in presets keep their scene', () => {
  for (const id of startingPresetOrder)
    for (const mode of modes)
      expect(pickGlassScene(preset(id), mode, id), `${id} ${mode}`).toBe(glassPresetBackdrop(id, mode))
})

it('an edit that keeps the text as readable keeps the scene', () => {
  const data = preset('builtin-liquid-glass-cristal')
  data.design = { ...data.design, radius: 0.25 } as Preset['design']
  expect(pickGlassScene(data, 'dark', 'builtin-liquid-glass-cristal')).toBe('prism')
})

it('an edit that makes the text less readable moves to the best scene', () => {
  const data = preset('builtin-liquid-glass-cristal')
  Object.assign(data.modes.light, {
    foreground: '#f5f5f5', cardForeground: '#f5f5f5', popoverForeground: '#f5f5f5', mutedForeground: '#d4d4d4', secondaryForeground: '#f5f5f5',
    card: '#151515', popover: '#151515', background: '#151515', muted: '#262626', secondary: '#262626',
  })
  const ratios = glassSceneRatios(data, 'light')
  const picked = pickGlassScene(data, 'light', 'builtin-liquid-glass-cristal')
  expect(ratios.mist, JSON.stringify(ratios)).toBeLessThan(4.5)
  expect(picked).not.toBe('mist')
  expect(ratios[picked]).toBe(Math.max(...Object.values(ratios)))
})

it('without a starting preset, picks the best scene with ties in menu order', () => {
  const dark = preset('builtin-liquid-glass-cristal')
  Object.assign(dark.modes.light, { foreground: '#0b0b0b', cardForeground: '#0b0b0b', popoverForeground: '#0b0b0b' })
  expect(['mist', 'dawn', 'grid']).toContain(pickGlassScene(dark, 'light'))
  const reduced = preset('builtin-liquid-glass-cristal')
  reduced.design = { ...reduced.design, transparency: 'reduced' } as Preset['design']
  expect(new Set(Object.values(glassSceneRatios(reduced, 'light'))).size).toBe(1)
  expect(pickGlassScene(reduced, 'light')).toBe(glassBackdropOptions[0]!.value)
})

it('lights the lab ink for an unedited lab preset on its own scene, in both modes', () => {
  expect(labInkFor(preset('builtin-liquid-glass-givre'), 'light', 'dawn')).toBe('light')
  expect(labInkFor(preset('builtin-liquid-glass-givre'), 'dark', 'night')).toBe('dark')
  expect(labInkFor(preset('builtin-liquid-glass-cristal'), 'dark', 'prism')).toBe('dark')
  expect(labInkFor(preset('builtin-liquid-glass-relief'), 'light', 'peach')).toBe('light')
})

it('keeps the plate on other scenes, edited presets, other presets and reduced transparency', () => {
  expect(labInkFor(preset('builtin-liquid-glass-givre'), 'light', 'night')).toBeNull()
  const edited = preset('builtin-liquid-glass-givre')
  edited.modes.dark.foreground = '#ffffff'
  expect(labInkFor(edited, 'dark', 'night')).toBeNull()
  for (const mode of modes) expect(labInkFor(preset('builtin-liquid-glass-voile'), mode, glassPresetBackdrop('builtin-liquid-glass-voile', mode))).toBeNull()
  const reduced = preset('builtin-liquid-glass-givre')
  reduced.design = { ...reduced.design, transparency: 'reduced' } as Preset['design']
  expect(labInkFor(reduced, 'light', 'dawn')).toBeNull()
})
