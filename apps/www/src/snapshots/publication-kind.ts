import {
  isStyleFamily,
  validatePreset,
  type Preset,
  type PresetSnapshot,
  type ResolvedPreset,
} from '@ombelle/contracts'
import type { PublicationKind } from '../publication/kind'

// The compiler is loaded when a code is published or read back, not with the page.
const compiler = () => import('@ombelle/compiler')

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
  normalize: async (preset) => (await compiler()).normalizePublishedPreset(preset),
  verify: async (input) => (await compiler()).verifyPresetSnapshot(input),
}
