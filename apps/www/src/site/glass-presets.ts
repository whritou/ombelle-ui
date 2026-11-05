import { getCatalog, startingPresetOrder, type StartingPresetId } from '@ombelle/catalog'

export function glassPresetId(value: string | null): StartingPresetId | undefined {
  return startingPresetOrder.find((id) => id === value)
}

export function glassPresetOptions() {
  const { startingPresets } = getCatalog('0.1.0')
  return startingPresetOrder.map((value) => ({ value, label: startingPresets[value].name }))
}

/** The lab uses Prisme for its main specimens and Pêche to show Relief's warm bevel. */
export function glassPresetBackdrop(id: StartingPresetId): 'kit' | 'prism' | 'peach' {
  if (id === 'builtin-liquid-glass-relief') return 'peach'
  return id === 'builtin-liquid-glass' ? 'kit' : 'prism'
}
