import type { FromSchema } from 'json-schema-to-ts'
import { presetSchema } from './preset-schema.js'
import type { NormalizedRecipe } from './recipe.js'
import type { SnapshotSource } from './snapshot.js'
export type Preset = FromSchema<typeof presetSchema>
export type { ComponentId } from './component-ids.js'
export type { StyleFamily } from './style-families.js'

export type ResolvedPreset = { data: Preset; hash: string }
export type Dependency = { name: string; version: string }
export type Artifact = {
  logicalPath: string
  kind: 'component' | 'style' | 'usage' | 'utility'
  content: string
  sha256: string
}
export type ThemeData = {
  light: Record<string, string>
  dark: Record<string, string>
  theme: Record<string, string>
}
export type CompileResult = {
  artifacts: Artifact[]
  dependencies: Dependency[]
  preset: ResolvedPreset
  theme: ThemeData
  provenance: { catalogRelease: string; compilerVersion: string }
}

export type ManagedDeclaration = {
  selector: string
  property: string
  value: string
  important?: boolean
  existedBefore: boolean
}
export type RecipeCompileResult = {
  artifacts: Artifact[]
  dependencies: Dependency[]
  recipe: { data: NormalizedRecipe; hash: string }
  preset: ResolvedPreset
  scope: string
  darkSelector: string
  provenance: CompileResult['provenance']
}
export type ComponentPresetCompileResult = {
  artifacts: Artifact[]
  dependencies: Dependency[]
  preset: ResolvedPreset
  scope: string
  darkSelector: string
  provenance: CompileResult['provenance']
}
export type InstalledRecipe = Omit<
  RecipeCompileResult,
  'dependencies' | 'artifacts'
> & {
  artifacts: Record<string, InstalledArtifact>
}
export type InstalledComponentPreset = Omit<
  ComponentPresetCompileResult,
  'artifacts' | 'dependencies'
> & {
  artifacts: Record<string, InstalledArtifact>
}
export type InstalledArtifact = {
  logicalPath: string
  sha256: string
  kind: Artifact['kind']
}
export type ProjectLock = {
  presetSource?: SnapshotSource
  componentPresetSources?: Record<string, SnapshotSource>
  componentPresets?: Record<string, InstalledComponentPreset>
  recipes?: Record<string, InstalledRecipe>
  lockVersion: 1
  catalogRelease: string
  compilerVersion: string
  presetHash: string
  artifacts: Record<string, InstalledArtifact>
  managedDeclarations: ManagedDeclaration[]
}
export type PackageManager = 'pnpm' | 'npm' | 'yarn' | 'bun'
export type BunLockfile = 'bun.lock' | 'bun.lockb'
export type ProjectConfig = {
  configVersion: 1
  platform: 'react-web'
  language: 'tsx'
  presetFile: string
  lockFile: string
  packageManager: 'auto' | PackageManager
  theme: { strategy: 'merge'; cssEntry: string; darkSelector?: string }
  paths: { components: string; styleOutput: string; recipeOutput?: string }
  registryBase?: string
}
export type ProjectContext = {
  bunLockfile?: BunLockfile
  preconditions: Record<string, string | null>
  root: string
  framework: 'vite' | 'next'
  manager: PackageManager
  cssEntry: string
  darkSelector: string
  componentsDir: string
  utilsFile: string
  styleFile: string
  uiAlias: string
  utilsAlias: string
  sourceDir: string
  packageJson: {
    dependencies?: Record<string, string>
    devDependencies?: Record<string, string>
    packageManager?: string
  }
  upstream?: {
    style: string
    aliases: { components: string; utils: string; ui?: string }
    tailwind: { css: string }
  }
  config?: ProjectConfig
  preset?: Preset
  lock?: ProjectLock
}
export type FileChange = {
  path: string
  beforeHash: string | null
  afterContent: string
  kind: Artifact['kind'] | 'config' | 'lock' | 'preset' | 'theme'
  action: 'create' | 'update' | 'noop' | 'conflict'
}
export type InstallPlan = {
  presetResolution?: { source: SnapshotSource; via: 'network' | 'cache' }
  componentPreset?: Omit<InstalledComponentPreset, 'artifacts'> & {
    importPath: string
    examplePath: string
  }
  recipe?: Omit<InstalledRecipe, 'artifacts'> & {
    importPath: string
    examplePath: string
  }
  bunLockfile?: BunLockfile
  packageManager: PackageManager
  managerWarning?: string
  preconditions: Record<string, string | null>
  projectRoot: string
  preset: ResolvedPreset
  provenance: CompileResult['provenance']
  changes: FileChange[]
  managedDeclarations: ManagedDeclaration[]
  dependencyPlan: Dependency[]
  diagnostics: { code: string; message: string; path?: string }[]
  networkAccess: boolean
}
