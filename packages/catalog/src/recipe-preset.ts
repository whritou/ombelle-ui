import { FoundationError, type Recipe, type Preset } from '@ombelle/contracts'
import { getCatalog } from './index.js'
export function resolveRecipePreset(ref: Recipe['presetRef']): Preset {
  if (ref.compilerVersion !== '0.1.0') throw new FoundationError('UNSUPPORTED_RELEASE', 'Unsupported recipe compiler version', '/presetRef/compilerVersion')
  const catalog = getCatalog(ref.catalogRelease)
  const preset = Object.values(catalog.presets).find(p => p.id === ref.id && p.revision === ref.revision)
  if (!preset) throw new FoundationError('RESOLUTION_FAILURE', 'Exact built-in preset ID/revision not found', '/presetRef', 'Select a built-in preset and revision from the pinned catalog.')
  return structuredClone(preset)
}
