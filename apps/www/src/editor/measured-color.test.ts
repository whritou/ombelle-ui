import { expect, it } from 'vitest'
import { colorPlaceholder, hexFromComputedColor } from './measured-color'

it('hex from rgb', () => {
  expect(hexFromComputedColor('rgb(29, 78, 216)')).toBe('#1D4ED8')
  expect(hexFromComputedColor('rgba(0, 0, 0, 0.5)')).toBe('#00000080')
  expect(hexFromComputedColor('color(srgb 1 1 1 / 0.57)')).toBe('#FFFFFF91')
  expect(hexFromComputedColor('rgb(29 78 216 / 1)')).toBe('#1D4ED8')
  expect(hexFromComputedColor('oklch(0.5 0.1 200)')).toBeNull()
})

it('placeholder only in the preview mode', () => {
  expect(colorPlaceholder('#1D4ED8', 'dark', 'light', 'Preset')).toBe('Preset')
  expect(colorPlaceholder('#1D4ED8', 'light', 'light', 'Preset')).toBe('#1D4ED8')
  expect(colorPlaceholder(undefined, 'light', 'light', 'Preset')).toBe('Preset')
})
