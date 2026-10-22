import {
  FoundationError,
  type ComponentPresetCompileResult,
  type InstalledArtifact,
  type InstalledComponentPreset,
  type InstallPlan,
  type ProjectContext,
} from '@ombelle/contracts'
import { canonicalize, resolvePreset, sha256 } from '@ombelle/compiler'
import { getCatalog } from '@ombelle/catalog'
import { fileChange } from './components.js'
import { transformComponentPresetArtifact } from '../project/component-preset-transform.js'

export async function planComponentPreset(
  context: ProjectContext,
  result: ComponentPresetCompileResult,
): Promise<InstallPlan> {
  if (!context.config || !context.preset || !context.lock)
    throw new FoundationError(
      'UNSUPPORTED_PROJECT',
      'Initialize a saved project preset first',
      context.root,
      'Run init --preset <local.json>.',
    )
  if (
    context.upstream &&
    !['radix-nova', 'new-york'].includes(context.upstream.style)
  )
    throw new FoundationError(
      'UNSUPPORTED_PROJECT',
      'Component primitive edition is not supported',
      'components.json',
    )
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
    )

  const { artifacts: unused, dependencies: ignored, ...identity } = result
  const id = result.preset.data.id
  const revision = result.preset.data.revision
  const key = id + '@' + revision
  const importPath =
    context.uiAlias + '/presets/' + id + '/r' + revision + '/button'
  const usage = result.artifacts.find((artifact) => artifact.kind === 'usage')
  if (!usage)
    throw new FoundationError(
      'INVALID_DATA',
      'Component preset is missing its usage artifact',
      key,
    )
  const examplePath = (await transformComponentPresetArtifact(context, usage))
    .path
  const plan: InstallPlan = {
    packageManager: context.manager,
    ...(context.bunLockfile ? { bunLockfile: context.bunLockfile } : {}),
    preconditions: { ...context.preconditions },
    projectRoot: context.root,
    preset: result.preset,
    provenance: result.provenance,
    changes: [],
    managedDeclarations: structuredClone(context.lock.managedDeclarations),
    dependencyPlan: [],
    diagnostics: [],
    networkAccess: false,
    componentPreset: { ...identity, importPath, examplePath },
  }
  const lock = structuredClone(context.lock)
  const previous = lock.componentPresets?.[key]
  const conflict = (message: string, file?: string) =>
    plan.diagnostics.push({ code: 'FILE_CONFLICT', message, path: file })
  if (previous) {
    const { artifacts: priorFiles, ...priorIdentity } = previous
    if (canonicalize(priorIdentity) !== canonicalize(identity))
      conflict(
        'Component preset identity/revision or dark context changed; install a new revision or migrate explicitly',
        key,
      )
  }

  const owned: Record<string, InstalledArtifact> = {}
  const seen = new Set<string>()
  for (const artifact of result.artifacts) {
    const target = await transformComponentPresetArtifact(context, artifact)
    const normalized = target.path.replace(/^\.\//, '').toLowerCase()
    if (seen.has(normalized))
      throw new FoundationError(
        'FILE_CONFLICT',
        'Duplicate component preset destination',
        target.path,
      )
    seen.add(normalized)
    const change = await fileChange(
      context.root,
      target.path,
      target.content,
      artifact.kind,
    )
    const record = lock.artifacts[target.path]
    if (
      change.beforeHash !== null &&
      (!record ||
        record.sha256 !== change.beforeHash ||
        change.action === 'update')
    ) {
      change.action = 'conflict'
      conflict(
        'Component preset or shared utility source requires an explicit migration',
        target.path,
      )
    }
    plan.changes.push(change)
    const entry: InstalledArtifact = {
      logicalPath: artifact.logicalPath,
      kind: artifact.kind,
      sha256: await sha256(target.content),
    }
    if (change.action !== 'conflict') lock.artifacts[target.path] = entry
    if (artifact.kind !== 'utility') owned[target.path] = entry
  }

  lock.componentPresets = {
    ...lock.componentPresets,
    [key]: { ...identity, artifacts: owned } satisfies InstalledComponentPreset,
  }
  const state = await fileChange(
    context.root,
    context.config.lockFile,
    canonicalize(lock) + '\n',
    'lock',
  )
  if (seen.has(state.path.replace(/^\.\//, '').toLowerCase()))
    throw new FoundationError(
      'FILE_CONFLICT',
      'Component preset collides with state destination',
      state.path,
    )
  plan.changes.push(state)

  const installed =
    context.manager === 'bun'
      ? (context.packageJson.dependencies ?? {})
      : {
          ...context.packageJson.devDependencies,
          ...context.packageJson.dependencies,
        }
  plan.dependencyPlan = result.dependencies.filter(
    (dependency) => installed[dependency.name] !== dependency.version,
  )
  return plan
}
