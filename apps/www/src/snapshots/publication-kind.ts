import {
  isStyleFamily,
  validatePreset,
  type Preset,
  type PresetSnapshot,
  type ResolvedPreset,
} from '@ombelle/contracts'
import { normalizePublishedPreset, verifyPresetSnapshot } from '@ombelle/compiler'
import type { PublicationKind } from '../publication/kind'

export type PresetPublicationTypes = {
  field: 'preset'
  hashField: 'presetHash'
  data: Preset
  snapshot: PresetSnapshot
  resolved: ResolvedPreset
}

export const presetPublication: PublicationKind<PresetPublicationTypes> = {
  noun: 'preset',
  endpoint: '/api/v1/presets',
  field: 'preset',
  hashField: 'presetHash',
  storageKey: 'ombelle:preset-editor:publication:v1',
  // validatePreset has already limited schemaVersion to 1.0 and 1.1 and matched it to the fields.
  validate: validatePreset,
  release: (preset) => preset,
  supported: (preset) => isStyleFamily(preset.styleFamily),
  normalize: normalizePublishedPreset,
  verify: (input) => verifyPresetSnapshot(input),
}
