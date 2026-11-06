import { getCatalog, offeredGlassPresetOrder, startingPresetOrder, type StartingPresetId } from '@ombelle/catalog'

/** Any starting preset, offered or retired, so pinned recipes and shared links keep their material. */
export function glassPresetId(value: string | null): StartingPresetId | undefined {
  return startingPresetOrder.find((id) => id === value)
}

/** The offered presets, plus the current one when it is retired so a pinned recipe still shows its material. */
export function glassPresetOptions(current?: StartingPresetId) {
  const { startingPresets } = getCatalog('0.1.0')
  const ids: readonly StartingPresetId[] = offeredGlassPresetOrder
  return [...ids, ...(current && !ids.includes(current) ? [current] : [])]
    .map((value) => ({ value, label: startingPresets[value].name }))
}

/** The lab uses Prisme for its main specimens and Pêche to show Relief's warm bevel. */
export function glassPresetBackdrop(id: StartingPresetId): 'kit' | 'prism' | 'peach' {
  if (id === 'builtin-liquid-glass-relief') return 'peach'
  return id === 'builtin-liquid-glass' ? 'kit' : 'prism'
}
