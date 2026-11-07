import {
  FoundationError,
  type CompileResult,
  type ProjectContext,
  type InstallPlan,
  type FileChange,
  type ProjectLock,
  type ProjectConfig,
  type ComponentId,
} from '@ombelle/contracts'
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
import { safePath } from '../project/paths.js'
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
  return {
    path: file,
    beforeHash: before === null ? null : await sha256(before),
    afterContent: content,
    kind,
    action: before === null ? 'create' : before === content ? 'noop' : 'update',
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
    edition: context.edition,
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
export async function planAdd(
  context: ProjectContext,
  result: CompileResult,
  resolutions: Record<string, Resolution> = {},
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
    const match = artifacts.find(
      (a) =>
        resolutionKey(transformArtifact(context, a).path) === resolutionKey(file) &&
        (resolution === 'overwrite' || componentForPath(context, file) !== undefined),
    )
    const target = match && transformArtifact(context, match).path
    if (
      !target ||
      context.lock?.artifacts[target] ||
      (await readText(context.root, target)) === null
    )
      throw new FoundationError(
        'INVALID_DATA',
        '--' + resolution + ' ' + file +
          " doesn't match a file Ombelle can resolve; only existing files Ombelle doesn't manage can be overwritten or kept beside",
        file,
      )
    if (resolution === 'overwrite') overwrite.add(target)
  }
  for (const a of artifacts) {
    const target = transformArtifact(context, a, beside)
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
      c.beforeHash !== null &&
      (knownShadcnUtilityHashes as readonly string[]).includes(c.beforeHash)
    // Installing beside adds prefixed copies of shared rules to an unedited
    // shared stylesheet; theme add would write the same bytes.
    const besideSharedStyle =
      besideIntroduced &&
      a.logicalPath === 'styles/ui-style.css' &&
      record?.sha256 === c.beforeHash
    if (shadcnUtility && c.action === 'update')
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
    } else if (
      c.beforeHash !== null &&
      (!record || record.sha256 !== c.beforeHash || c.action === 'update')
    ) {
      // An unedited shared stylesheet that merely lags the catalog is refreshed
      // by theme add; any other conflict still needs an explicit migration.
      const staleSharedStyle =
        a.logicalPath === 'styles/ui-style.css' &&
        record?.sha256 === c.beforeHash &&
        c.action === 'update'
      c.action = 'conflict'
      plan.diagnostics.push({
        code: 'FILE_CONFLICT',
        message: staleSharedStyle
          ? 'Shared style rules changed in this catalog; run theme add ' +
            path.resolve(context.root, context.config?.presetFile ?? './ui-preset.json') +
            ' to refresh them'
          : 'Existing source requires an explicit migration',
        path: target.path,
      })
    }
    plan.changes.push(c)
    const placedId = path.basename(a.logicalPath, '.tsx') as ComponentId
    if (c.action !== 'conflict' && a.kind === 'component' && beside.has(placedId))
      lock.placements = { ...lock.placements, [placedId]: 'beside' }
    if (c.action !== 'conflict')
      lock.artifacts[target.path] = {
        logicalPath: a.logicalPath,
        kind: a.kind,
        sha256: await sha256(c.afterContent),
      }
  }
  const installed =
    context.manager === 'bun'
      ? (context.packageJson.dependencies ?? {})
      : {
          ...context.packageJson.devDependencies,
          ...context.packageJson.dependencies,
        }
  plan.dependencyPlan = result.dependencies.filter(
    (d) => installed[d.name] !== d.version,
  )
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
