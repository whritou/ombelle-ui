// The catalog's presets and fonts without its templates and stylesheets: the `@ombelle/catalog/presets`
// entry. Browser code that only reads presets imports this, so a page does not load every family's styles.
import {
  FoundationError,
  isSupportedContractRelease,
  validatePreset,
  type Preset,
  type StyleFamily,
  styleFamilies,
} from '@ombelle/contracts'
import { catalogPresetData } from './generated-presets.js'
export { fontById, fontRegistry, styleFamilyFonts, type FontEntry, type FontRole } from './fonts.js'
export { glassTintPalettes, type GlassTintId, type GlassTintPalette } from './glass-tints.js'
export { resolveRecipePreset } from './recipe-preset.js'

export const defaultGlassPresetId = 'builtin-liquid-glass-cristal'
/** The liquid glass starting points in picker order: Cristal first, the original family base last. */
export const startingPresetOrder = [
  defaultGlassPresetId,
  'builtin-liquid-glass-givre',
  'builtin-liquid-glass-fume',
  'builtin-liquid-glass-relief',
  'builtin-liquid-glass-clear',
  'builtin-liquid-glass-prism',
  'builtin-liquid-glass-liquid',
  'builtin-liquid-glass-voile',
  'builtin-liquid-glass',
] as const
export type StartingPresetId = (typeof startingPresetOrder)[number]
/**
 * The starting presets the editors and component pages offer, in picker order. Clear, Prism
 * and Liquid shipped in 0.5.0 and stay in the catalog, so recipes, snapshots and projects
 * pinned to them still resolve; they are no longer offered.
 */
export const offeredGlassPresetOrder = [
  defaultGlassPresetId,
  'builtin-liquid-glass-givre',
  'builtin-liquid-glass-fume',
  'builtin-liquid-glass-relief',
  'builtin-liquid-glass-voile',
  'builtin-liquid-glass',
] as const satisfies readonly StartingPresetId[]

export type CatalogPresets = {
  release: string
  presets: Record<StyleFamily, Preset>
  /** Liquid glass starting points, keyed by preset id; see startingPresetOrder. */
  startingPresets: Record<StartingPresetId, Preset>
  /** Earlier revisions of built-in and starting presets, resolvable only by exact id@revision. */
  retiredPresets: Preset[]
}

const built = new Map<string, CatalogPresets>()
/** The validated built-in presets of a catalog release, built once per release. */
export function getCatalogPresets(release: string): CatalogPresets {
  if (!isSupportedContractRelease(release))
    throw new FoundationError('UNSUPPORTED_RELEASE', 'Unsupported catalog release', '/catalogRelease')
  let presets = built.get(release)
  if (!presets) {
    presets = {
      release,
      presets: Object.fromEntries(
        styleFamilies.map((family) => [family, validatePreset(catalogPresetData.presets[family])]),
      ) as Record<StyleFamily, Preset>,
      startingPresets: Object.fromEntries(
        startingPresetOrder.map((id) => [
          id,
          validatePreset(catalogPresetData.startingPresets[id as keyof typeof catalogPresetData.startingPresets]),
        ]),
      ) as Record<StartingPresetId, Preset>,
      retiredPresets: catalogPresetData.retiredPresets.map((preset) => validatePreset(preset)),
    }
    built.set(release, presets)
  }
  return presets
}
