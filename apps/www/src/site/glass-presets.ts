import type { PresetBackdrop } from '../preset-editor/preview-protocol'
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

export type GlassPreviewMode = 'light' | 'dark'

/**
 * Each starting preset's default preview backdrop per mode, picked so its text
 * reads without a heavy halo: light scenes behind dark ink, dark scenes behind
 * light ink. Fumé keeps light ink in both modes, so it stays on dark scenes;
 * Relief keeps Pêche, which shows its warm bevel. The family base keeps the kit.
 */
const presetBackdropsByMode: Record<StartingPresetId, Record<GlassPreviewMode, PresetBackdrop>> = {
  'builtin-liquid-glass-cristal': { light: 'mist', dark: 'prism' },
  'builtin-liquid-glass-givre': { light: 'dawn', dark: 'night' },
  'builtin-liquid-glass-fume': { light: 'prism', dark: 'night' },
  'builtin-liquid-glass-relief': { light: 'peach', dark: 'night' },
  'builtin-liquid-glass-voile': { light: 'grid', dark: 'prism' },
  'builtin-liquid-glass-clear': { light: 'mist', dark: 'prism' },
  'builtin-liquid-glass-prism': { light: 'mist', dark: 'prism' },
  'builtin-liquid-glass-liquid': { light: 'mist', dark: 'prism' },
  'builtin-liquid-glass': { light: 'kit', dark: 'kit' },
}

/** The default preview backdrop for a starting preset in one colour mode. */
export function glassPresetBackdrop(id: StartingPresetId, mode: GlassPreviewMode): PresetBackdrop {
  return presetBackdropsByMode[id][mode]
}

/** Liquid glass preview backdrops, shared by the preset editor and the component pages. Preview only, never saved. */
export const glassBackdropOptions: { value: PresetBackdrop; label: string }[] = [
  { value: 'kit', label: 'Kit' },
  { value: 'mist', label: 'Brume' },
  { value: 'dawn', label: 'Aube' },
  { value: 'grid', label: 'Trame' },
  { value: 'peach', label: 'Pêche' },
  { value: 'prism', label: 'Prisme' },
  { value: 'night', label: 'Nuit' },
]
