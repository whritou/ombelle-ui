import type { FromSchema } from 'json-schema-to-ts'
import { presetSchema } from './preset-schema.js'
export type Preset = FromSchema<typeof presetSchema>
export type ComponentId = 'button' | 'dialog' | 'input'
export type StyleFamily = 'flat' | 'neo-brutalism'

export type ResolvedPreset = { data: Preset; hash: string }
export type Dependency = { name: string; version: string }
export type Artifact = { logicalPath: string; kind: 'component' | 'style' | 'usage' | 'utility'; content: string; sha256: string }
export type ThemeData = { light: Record<string,string>; dark: Record<string,string>; theme: Record<string,string> }
export type CompileResult = { artifacts: Artifact[]; dependencies: Dependency[]; preset: ResolvedPreset; theme: ThemeData; provenance: { catalogRelease: string; compilerVersion: string } }
