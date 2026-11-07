import { expect, it } from 'vitest'
import { glassPresetId, glassPresetOptions } from './glass-presets'

it('offers six glass presets and keeps a pinned retired one selectable', () => {
  const labels = (options: { label: string }[]) => options.map((option) => option.label)
  expect(labels(glassPresetOptions())).toEqual(['Cristal', 'Givré', 'Fumé', 'Relief', 'Voile', 'Liquid glass'])
  expect(labels(glassPresetOptions('builtin-liquid-glass-relief'))).toHaveLength(6)
  expect(labels(glassPresetOptions('builtin-liquid-glass-prism'))).toEqual(['Cristal', 'Givré', 'Fumé', 'Relief', 'Voile', 'Liquid glass', 'Prism'])
  // Shared links and pinned recipes keep resolving to a retired preset.
  expect(glassPresetId('builtin-liquid-glass-liquid')).toBe('builtin-liquid-glass-liquid')
})
