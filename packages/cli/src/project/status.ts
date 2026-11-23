import {
  supportedComponentIds,
  type ComponentId,
  type CompileResult,
  type Dependency,
  type InstalledArtifact,
  type Preset,
  type ProjectContext,
} from '@ombelle/contracts'
import { compile, compileButtonPreset, compileInstallableRecipe, sha256 } from '@ombelle/compiler'
import { readText } from './inspect.js'
import { besideComponents } from './beside.js'
import { transformArtifact } from './transform.js'
import { transformRecipeArtifact } from './recipe-transform.js'
import { transformComponentPresetArtifact } from './component-preset-transform.js'

/**
 * The state of one managed file, comparing three things: the bytes the lock recorded at install, the
 * bytes on disk, and the bytes today's catalog produces for the same input.
 * - `current`: on disk as installed, and the catalog still produces it.
 * - `update-available`: on disk as installed; the catalog now produces other bytes (update refreshes it).
 * - `edited`: changed on disk; the catalog still produces what was installed.
 * - `edited-update-available`: changed on disk, and the catalog changed too.
 * Both edited states conflict in add and update until `--overwrite <path>` replaces the file.
 * - `missing`: recorded but absent (add or update creates it again).
 * - `not-generated`: recorded, but today's catalog no longer produces this file for its owner.
 */
export type FileState =
  | 'current'
  | 'update-available'
  | 'edited'
  | 'edited-update-available'
  | 'missing'
  | 'not-generated'
export type FileOwner =
  | { type: 'component'; id: ComponentId }
  | { type: 'shared' }
  | { type: 'recipe'; key: string }
  | { type: 'component-preset'; key: string }
export type ManagedFile = {
  path: string
  kind: InstalledArtifact['kind']
  owner: FileOwner
  state: FileState
  /** Bytes on disk, or null when missing. */
  current: string | null
  /** Bytes today's catalog produces, when it still produces the file. */
  expected?: string
}
export type ProjectStatus = {
  components: ComponentId[]
  files: ManagedFile[]
  /** The ordinary compile, reused by update so it plans exactly what status reported. */
  compiled?: CompileResult
  dependencies: Dependency[]
}

/** Ordinary catalog components the lock records, from their component source or stylesheet. */
export function installedComponentIds(context: ProjectContext): ComponentId[] {
  const ids = new Set<ComponentId>()
  for (const record of Object.values(context.lock?.artifacts ?? {})) {
    const match = /^components\/ui\/([a-z0-9-]+)\.(tsx|css)$/.exec(record.logicalPath)
    if (match && (supportedComponentIds as readonly string[]).includes(match[1]!)) ids.add(match[1] as ComponentId)
  }
  return supportedComponentIds.filter((id) => ids.has(id))
}

const lf = (text: string) => text.replace(/\r\n/g, '\n')
async function stateOf(recorded: string, current: string | null, expected: string | undefined): Promise<FileState> {
  if (current === null) return 'missing'
  if (expected === undefined) return 'not-generated'
  const unedited = (await sha256(current)) === recorded || (await sha256(lf(current))) === recorded
  const catalogChanged = (await sha256(expected)) !== recorded
  if (unedited) return catalogChanged && lf(current) !== expected ? 'update-available' : 'current'
  if (lf(current) === expected) return 'current'
  return catalogChanged ? 'edited-update-available' : 'edited'
}

/** Recompiles every installed owner with its recorded input and compares it with disk and the lock. */
export async function projectStatus(
  context: ProjectContext,
  options: { ids?: readonly ComponentId[]; scoped?: boolean } = {},
): Promise<ProjectStatus> {
  const lock = context.lock
  if (!lock || !context.preset) return { components: [], files: [], dependencies: [] }
  const ids = options.ids ?? installedComponentIds(context)
  const expected = new Map<string, { content: string; owner: FileOwner }>()
  const dependencies: Dependency[] = []
  const compiled = await compile({
    preset: context.preset as Preset,
    componentIds: ids,
    catalogRelease: lock.catalogRelease,
    compilerVersion: lock.compilerVersion,
    glassContrast: 'report',
    edition: context.edition,
    prefixedComponents: besideComponents(context),
  })
  dependencies.push(...compiled.dependencies)
  const beside = new Set<string>(besideComponents(context))
  for (const artifact of compiled.artifacts) {
    if (artifact.logicalPath === 'styles/ui-tokens.css') continue
    const target = transformArtifact(context, artifact, beside)
    const match = /^components\/ui\/([a-z0-9-]+)\.(tsx|css)$/.exec(artifact.logicalPath)
    const usage = artifact.kind === 'usage' ? /([a-z0-9-]+)\.tsx$/.exec(artifact.logicalPath) : null
    const id = (match?.[1] ?? usage?.[1]) as ComponentId | undefined
    expected.set(target.path, {
      content: target.content,
      owner: id && ids.includes(id) ? { type: 'component', id } : { type: 'shared' },
    })
  }
  if (options.scoped !== false) {
    for (const [key, row] of Object.entries(lock.recipes ?? {})) {
      const result = await compileInstallableRecipe({ recipe: row.recipe.data, darkSelector: row.darkSelector, preset: row.preset.data })
      dependencies.push(...result.dependencies)
      for (const artifact of result.artifacts) {
        const target = await transformRecipeArtifact(context, artifact, result.recipe.data)
        if (!expected.has(target.path)) expected.set(target.path, { content: target.content, owner: { type: 'recipe', key } })
      }
    }
    for (const [key, row] of Object.entries(lock.componentPresets ?? {})) {
      const result = await compileButtonPreset({ preset: row.preset.data, darkSelector: row.darkSelector, glassContrast: 'report' })
      dependencies.push(...result.dependencies)
      for (const artifact of result.artifacts) {
        const target = await transformComponentPresetArtifact(context, artifact)
        if (!expected.has(target.path)) expected.set(target.path, { content: target.content, owner: { type: 'component-preset', key } })
      }
    }
  }
  const owners = new Map<string, FileOwner>()
  for (const [key, row] of Object.entries(lock.recipes ?? {}))
    for (const file of Object.keys(row.artifacts)) owners.set(file, { type: 'recipe', key })
  for (const [key, row] of Object.entries(lock.componentPresets ?? {}))
    for (const file of Object.keys(row.artifacts)) owners.set(file, { type: 'component-preset', key })
  const files: ManagedFile[] = []
  for (const [file, record] of Object.entries(lock.artifacts).sort(([a], [b]) => (a < b ? -1 : 1))) {
    const owner = expected.get(file)?.owner ?? owners.get(file) ?? ownerOf(record.logicalPath)
    // With explicit ids, other components' files are outside the question.
    if (options.ids && owner.type === 'component' && !options.ids.includes(owner.id)) continue
    if (options.scoped === false && owner.type !== 'component' && owner.type !== 'shared') continue
    const current = await readText(context.root, file)
    const content = expected.get(file)?.content
    files.push({
      path: file,
      kind: record.kind,
      owner,
      state: await stateOf(record.sha256, current, content),
      current,
      ...(content === undefined ? {} : { expected: content }),
    })
  }
  return { components: [...ids], files, compiled, dependencies }
}

function ownerOf(logicalPath: string): FileOwner {
  const match = /^components\/ui\/([a-z0-9-]+)\.(tsx|css)$/.exec(logicalPath) ?? /^examples\/([a-z0-9-]+)\.tsx$/.exec(logicalPath)
  return match && (supportedComponentIds as readonly string[]).includes(match[1]!)
    ? { type: 'component', id: match[1] as ComponentId }
    : { type: 'shared' }
}

export const ownerLabel = (owner: FileOwner): string =>
  owner.type === 'component' ? owner.id
    : owner.type === 'shared' ? 'shared'
      : (owner.type === 'recipe' ? 'recipe ' : 'component preset ') + owner.key
