import type { FromSchema } from 'json-schema-to-ts'
import { presetSchema } from './preset-schema.js'
export type Preset = FromSchema<typeof presetSchema>
export type ComponentId = 'button' | 'dialog' | 'input'
export type StyleFamily = 'flat' | 'neo-brutalism'
