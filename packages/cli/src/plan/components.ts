import {
  FoundationError,
  type CompileResult,
  type ProjectContext,
  type InstallPlan,
  type FileChange,
  type ProjectLock,
  type ProjectConfig,
  type Artifact,
  type BlockId,
  type ComponentId,
} from '@ombelle/contracts'
import { planDependencies } from './dependencies.js'
import { sha256, canonicalize, resolvePreset } from '@ombelle/compiler'
import { assertEdition } from '../project/edition.js'
import {
  besideComponents,
  componentForPath,
  resolutionKey,
  type Resolution,
} from '../project/beside.js'
import { getCatalog, knownShadcnUtilityHashes } from '@ombelle/catalog'
import path from 'node:path'
import { caseMismatch, caseMismatchMessage, safePath } from '../project/paths.js'
import { readText } from '../project/inspect.js'
import { transformArtifact } from '../project/transform.js'
export async function fileChange(
  root: string,
  file: string,
  content: string,
  kind: FileChange['kind'],
): Promise<FileChange> {
  await safePath(root, file)
  const before = await readText(root, file)
  // A CRLF checkout (Git for Windows' default core.autocrlf=true) holds the bytes Ombelle wrote with other
  // line endings. Compare its LF form, so it is neither rewritten nor treated as edited (CLI-03).
  const lf = before?.includes('\r\n') ? before.replace(/\r\n/g, '\n') : before
  const change: FileChange = {
    path: file,
    beforeHash: before === null ? null : await sha256(before),
    afterContent: content,
    kind,
    action: before === null ? 'create' : lf === content ? 'noop' : 'update',
  }
  if (lf !== null && lf !== before) lfHashes.set(change, await sha256(lf))
  return change
}
const lfHashes = new WeakMap<FileChange, string>()
/** Whether the file a change replaces holds the bytes a lock recorded, in either line-ending form (CLI-03). */
export function matchesRecord(change: FileChange, recorded: string | undefined): boolean {
  return recorded !== undefined && change.beforeHash !== null &&
    (recorded === change.beforeHash || recorded === lfHashes.get(change))
}
/** The hashes a change's current file can be identified by: its bytes, and their LF form for a CRLF file. */
export function beforeHashes(change: FileChange): string[] {
  const lf = lfHashes.get(change)
  return change.beforeHash === null ? [] : lf ? [change.beforeHash, lf] : [change.beforeHash]
}
/** Whether a managed file's bytes differ from its lock record, in both line-ending forms (CLI-03). */
export async function editedSinceInstall(context: ProjectContext, file: string): Promise<boolean> {
  const record = context.lock?.artifacts[file]
  const text = await readText(context.root, file)
  if (!record || text === null) return false
  return (await sha256(text)) !== record.sha256 &&
    (await sha256(text.replace(/\r\n/g, '\n'))) !== record.sha256
}
/**
 * A managed file the plan would change (PUB-01, INS-05): `refresh` when it still holds the bytes the
 * lock recorded, so only the catalog changed it; `conflict` when it was edited after install. A conflict
 * is resolved only by an explicit --overwrite of that path.
 */
export function managedOutcome(change: FileChange, recorded: string): 'refresh' | 'conflict' {
  return matchesRecord(change, recorded) && change.action === 'update' ? 'refresh' : 'conflict'
}
export const refreshNotice = (file: string) =>
  'refresh ' + file + ' (unedited since install; the catalog source changed)'
/**
 * The conflict for a managed file edited after install. Ordinary `add`, `update` and `preset apply`
 * accept `--overwrite <path>` for it; scoped commands point to `update`, which does.
 */
export function editedConflict(file: string, via: 'rerun' | 'update' = 'rerun'): InstallPlan['diagnostics'][number] {
  return {
    code: 'FILE_CONFLICT',
    message:
      file + ' was edited after install; keep your version, or ' +
      (via === 'rerun' ? 'rerun with' : 'run update') + ' --overwrite ' + file +
      ' to replace it with the catalog source (diff shows the changes)',
    path: file,
    ...(via === 'rerun' ? { resolutions: ['overwrite' as const] } : {}),
  }
}
export function projectConfig(context: ProjectContext): ProjectConfig {
  return (
    context.config ?? {
      configVersion: 1,
      platform: 'react-web',
      language: 'tsx',
      presetFile: './ui-preset.json',
      lockFile: './ui-library.lock.json',
      packageManager: context.manager,
      theme: { strategy: 'merge', cssEntry: context.cssEntry },
      paths: {
        components: context.componentsDir,
        styleOutput: context.styleFile,
      },
    }
  )
}
export function baseLock(
  context: ProjectContext,
  result: CompileResult,
): ProjectLock {
  return {
    lockVersion: 1,
    // An unsupported style only takes the palette; it never changes the edition
    // that installed components were built for.
    edition: context.upstreamStyleSupported
      ? context.edition
      : (context.lock?.edition ?? context.edition),
    ...result.provenance,
    presetHash: result.preset.hash,
    artifacts: { ...context.lock?.artifacts },
    managedDeclarations: context.lock?.managedDeclarations ?? [],
    ...(context.lock?.presetSource
      ? { presetSource: structuredClone(context.lock.presetSource) }
      : {}),
    ...(context.lock?.componentPresetSources
      ? { componentPresetSources: structuredClone(context.lock.componentPresetSources) }
      : {}),
    ...(context.lock?.recipes
      ? { recipes: structuredClone(context.lock.recipes) }
      : {}),
    ...(context.lock?.recipeSources
      ? { recipeSources: structuredClone(context.lock.recipeSources) }
      : {}),
    ...(context.lock?.componentPresets
      ? { componentPresets: structuredClone(context.lock.componentPresets) }
      : {}),
    ...(context.lock?.placements
      ? { placements: structuredClone(context.lock.placements) }
      : {}),
  }
}
export async function appendState(
  plan: InstallPlan,
  context: ProjectContext,
  result: CompileResult,
  lock: ProjectLock,
): Promise<void> {
  const config = projectConfig(context)
  for (const [p, obj, kind] of [
    [config.presetFile, result.preset.data, 'preset'],
    ['ui-library.config.json', config, 'config'],
    [config.lockFile, lock, 'lock'],
  ] as const)
    plan.changes.push(
      await fileChange(context.root, p, canonicalize(obj) + '\n', kind),
    )
}
export type { Resolution }
/** The component a component source, component stylesheet or usage example belongs to. */
function artifactComponent(artifact: Artifact): ComponentId | undefined {
  const own =
    artifact.kind === 'component' ||
    artifact.kind === 'usage' ||
    (artifact.kind === 'style' && artifact.logicalPath.startsWith('components/ui/'))
  return own ? (path.basename(artifact.logicalPath).replace(/\.(tsx|css)$/, '') as ComponentId) : undefined
}
export type PlanAddOptions = {
  /**
   * Each component reached only through a block (not named on the command line), mapped to the blocks
   * that need it. A managed file of such a component edited after install is kept as it is, with a
   * notice, instead of conflicting (blocks spec, CLI).
   */
  viaBlocks?: ReadonlyMap<ComponentId, readonly BlockId[]>
}
export async function planAdd(
  context: ProjectContext,
  result: CompileResult,
  resolutions: Record<string, Resolution> = {},
  options: PlanAddOptions = {},
): Promise<InstallPlan> {
  assertEdition(context)
  if (context.preset && context.lock) {
    const savedPreset = await resolvePreset(
      context.preset,
      getCatalog(context.lock.catalogRelease),
    )
    if (
      savedPreset.hash !== context.lock.presetHash ||
      context.lock.compilerVersion !== savedPreset.data.compilerVersion
    )
      throw new FoundationError(
        'FILE_CONFLICT',
        'Saved global preset does not match its lock provenance',
        context.config?.presetFile,
        'Use theme add <local.json> to update the global preset explicitly.',
      )
  }
  const plan: InstallPlan = {
    packageManager: context.manager,
    ...(context.bunLockfile ? { bunLockfile: context.bunLockfile } : {}),
    ...(context.packageJson.packageManager &&
    context.packageJson.packageManager.split('@')[0] !== context.manager
      ? {
          managerWarning:
            'Using explicit package manager ' +
            context.manager +
            ' despite package.json declaring ' +
            context.packageJson.packageManager.split('@')[0] +
            '.',
        }
      : {}),
    preconditions: context.preconditions,
    projectRoot: context.root,
    preset: result.preset,
    provenance: result.provenance,
    changes: [],
    managedDeclarations: context.lock?.managedDeclarations ?? [],
    dependencyPlan: [],
    diagnostics: [],
    notices: [],
    networkAccess: false,
  }
  const lock = baseLock(context, result),
    seen = new Set<string>()
  const artifacts = result.artifacts.filter(
    (a) => a.logicalPath !== 'styles/ui-tokens.css',
  )
  const placed = new Set(Object.keys(context.lock?.placements ?? {}))
  const beside = new Set(besideComponents(context, resolutions))
  const besideIntroduced = [...beside].some((id) => !placed.has(id))
  const overwrite = new Set<string>()
  // A resolution only ever applies to an existing file Ombelle doesn't own.
  for (const [file, resolution] of Object.entries(resolutions)) {
    if (
      resolution === 'beside' &&
      artifacts.some((a) => a.kind === 'block' && resolutionKey(transformArtifact(context, a).path) === resolutionKey(file))
    )
      throw new FoundationError('INVALID_DATA', '--beside applies to component files, not block files', file)
    const match = artifacts.find(
      (a) =>
        resolutionKey(transformArtifact(context, a).path) === resolutionKey(file) &&
        (resolution === 'overwrite' || componentForPath(context, file) !== undefined),
    )
    const target = match && transformArtifact(context, match).path
    const managed = target !== undefined && context.lock?.artifacts[target] !== undefined
    if (
      !target ||
      (await readText(context.root, target)) === null ||
      // A managed file can only be overwritten, and only once it was edited after install (PUB-01).
      (managed && (resolution !== 'overwrite' || !(await editedSinceInstall(context, target))))
    )
      throw new FoundationError(
        'INVALID_DATA',
        '--' + resolution + ' ' + file +
          " doesn't match a file Ombelle can resolve; --overwrite takes an existing file Ombelle doesn't manage or a managed file edited after install, and --beside an existing component file Ombelle doesn't manage",
        file,
      )
    if (resolution === 'overwrite') overwrite.add(target)
  }
  for (const a of artifacts) {
    const target = transformArtifact(context, a, beside)
    let kept = false
    const lower = target.path.toLowerCase()
    if (seen.has(lower))
      throw new FoundationError(
        'FILE_CONFLICT',
        'Duplicate destination',
        target.path,
      )
    seen.add(lower)
    const c = await fileChange(
        context.root,
        target.path,
        target.content,
        a.kind,
      ),
      record = context.lock?.artifacts[target.path]
    // The utility shadcn generated is replaced like an Ombelle-owned file.
    const shadcnUtility =
      a.kind === 'utility' &&
      !record &&
      beforeHashes(c).some(hash => (knownShadcnUtilityHashes as readonly string[]).includes(hash))
    // Installing beside adds prefixed copies of shared rules to an unedited
    // shared stylesheet; theme add would write the same bytes.
    const besideSharedStyle =
      besideIntroduced &&
      a.logicalPath === 'styles/ui-style.css' &&
      matchesRecord(c, record?.sha256)
    const mismatch = c.action === 'create' ? await caseMismatch(context.root, target.path) : undefined
    if (mismatch) {
      c.action = 'conflict'
      plan.diagnostics.push({
        code: 'FILE_CONFLICT',
        message: caseMismatchMessage(mismatch),
        path: target.path,
      })
    } else if (shadcnUtility && c.action === 'update')
      plan.notices.push('adopt ' + target.path + ' (generated by shadcn)')
    else if (overwrite.has(target.path) || besideSharedStyle) {
      // Explicitly resolved: replace the file and own it from now on.
    } else if (c.beforeHash !== null && !record) {
      c.action = 'conflict'
      const choices: Resolution[] = componentForPath(context, target.path)
        ? ['overwrite', 'beside']
        : ['overwrite']
      plan.diagnostics.push({
        code: 'FILE_CONFLICT',
        message:
          target.path + ' exists and is not managed by Ombelle; rerun with ' +
          choices.map((choice) => '--' + choice + ' ' + target.path).join(' or '),
        path: target.path,
        resolutions: choices,
      })
    } else if (c.beforeHash !== null && record && (!matchesRecord(c, record.sha256) || c.action === 'update')) {
      // A managed file the plan would change, or one edited after install (PUB-01, INS-05): an unedited
      // file whose catalog source changed is refreshed; an edited one conflicts until --overwrite.
      const owner = artifactComponent(a)
      const blocks = owner && options.viaBlocks?.get(owner)
      if (managedOutcome(c, record.sha256) === 'refresh') plan.notices.push(refreshNotice(target.path))
      else if (blocks?.length) {
        // Edited after install and needed only by a block: the block uses the user's version as is.
        c.action = 'noop'
        c.afterContent = (await readText(context.root, target.path))!
        kept = true
        plan.notices.push(target.path + ' was edited after install; ' + blocks.join(', ') + ' uses it as is')
      } else {
        c.action = 'conflict'
        plan.diagnostics.push(editedConflict(target.path))
      }
    }
    plan.changes.push(c)
    const placedId = path.basename(a.logicalPath, '.tsx') as ComponentId
    if (kept) continue
    if (c.action !== 'conflict' && a.kind === 'component' && beside.has(placedId))
      lock.placements = { ...lock.placements, [placedId]: 'beside' }
    if (c.action !== 'conflict')
      lock.artifacts[target.path] = {
        logicalPath: a.logicalPath,
        kind: a.kind,
        sha256: await sha256(c.afterContent),
      }
  }
  const dependencies = planDependencies(context, result.dependencies)
  plan.dependencyPlan = dependencies.plan
  plan.notices.push(...dependencies.notices)
  await appendState(plan, context, result, lock)
  const targets = new Set<string>()
  for (const c of plan.changes) {
    const key = c.path.replace(/^\.\//, '').toLowerCase()
    if (targets.has(key))
      throw new FoundationError(
        'FILE_CONFLICT',
        'Duplicate state or artifact destination',
        c.path,
      )
    targets.add(key)
  }
  return plan
}
