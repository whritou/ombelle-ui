import { expect, it } from 'vitest'
import { glassPresetId, glassPresetOptions } from './glass-presets'

it('offers five glass presets and keeps a pinned retired one selectable', () => {
  const labels = (options: { label: string }[]) => options.map((option) => option.label)
  expect(labels(glassPresetOptions())).toEqual(['Cristal', 'Givré', 'Fumé', 'Relief', 'Liquid glass'])
  expect(labels(glassPresetOptions('builtin-liquid-glass-relief'))).toHaveLength(5)
  expect(labels(glassPresetOptions('builtin-liquid-glass-prism'))).toEqual(['Cristal', 'Givré', 'Fumé', 'Relief', 'Liquid glass', 'Prism'])
  // Shared links and pinned recipes keep resolving to a retired preset.
  expect(glassPresetId('builtin-liquid-glass-liquid')).toBe('builtin-liquid-glass-liquid')
})
