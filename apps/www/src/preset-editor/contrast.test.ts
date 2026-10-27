import { expect, it } from 'vitest'
import { getCatalog } from '@ombelle/catalog'
import { contrastRatio, measurePresetContrast } from './contrast'
it('computes normal-text contrast from bounded opaque sRGB channels', () => {
  expect(contrastRatio([0, 0, 0], [255, 255, 255])).toBe(21)
  expect(contrastRatio([123, 45, 67], [123, 45, 67])).toBe(1)
  expect(() => contrastRatio([-1, 0, 0], [0, 0, 0])).toThrow()
  expect(() => contrastRatio([Infinity, 0, 0], [0, 0, 0])).toThrow()
})
it('reports all eight pairs in both modes without treating alpha or unsupported colors as passing', () => {
  const preset = getCatalog('0.1.0').presets.flat
  const pass = measurePresetContrast(preset, () => [0, 0, 0, 1])
  expect(pass).toHaveLength(16)
  expect(new Set(pass.map((p) => p.mode + '/' + p.foreground + '/' + p.background)).size).toBe(16)
  expect(pass.every((p) => p.status === 'warning' && p.ratio === 1)).toBe(true)
  expect(measurePresetContrast(preset, () => [0, 0, 0, 0.5]).every((p) => p.status === 'not-evaluated' && p.ratio === null)).toBe(true)
  expect(measurePresetContrast(preset, () => null).every((p) => p.status === 'not-evaluated')).toBe(true)
  const contrast = measurePresetContrast({ ...preset, modes: { light: { ...preset.modes.light, foreground: '#000000', background: '#ffffff' }, dark: preset.modes.dark } }, (color) => color === '#000000' ? [0, 0, 0, 1] : [255, 255, 255, 1])
  expect(contrast[0]).toMatchObject({ mode: 'light', status: 'pass', ratio: 21 })
})
