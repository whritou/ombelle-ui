import {
  FoundationError,
  type ProjectContext,
  type InstallableRecipeCompileResult,
  type InstallPlan,
  type InstalledArtifact,
  type InstalledRecipe,
} from '@ombelle/contracts'
import { canonicalize, resolvePreset, sha256 } from '@ombelle/compiler'
import { assertEdition } from '../project/edition.js'
import { getCatalog } from '@ombelle/catalog'
import { fileChange } from './components.js'
import { transformRecipeArtifact } from '../project/recipe-transform.js'
export async function planRecipe(
  context: ProjectContext,
  result: InstallableRecipeCompileResult,
): Promise<InstallPlan> {
  if (!context.config || !context.preset || !context.lock)
    throw new FoundationError(
      'UNSUPPORTED_PROJECT',
      'Initialize a saved project preset first',
      context.root,
      'Run init --preset <local.json>.',
    )
  if (context.config.paths.recipeOutput !== undefined)
    throw new FoundationError(
      'UNSUPPORTED_PROJECT',
      'Custom recipe output roots are not supported',
      '/paths/recipeOutput',
      'Remove paths.recipeOutput to use the supported UI alias layout.',
    )
  assertEdition(context, 'recipes')
  const preset = await resolvePreset(
    context.preset,
    getCatalog(context.lock.catalogRelease),
  )
  if (
    preset.hash !== context.lock.presetHash ||
    context.lock.compilerVersion !== preset.data.compilerVersion
  )
    throw new FoundationError(
      'FILE_CONFLICT',
      'Saved global preset does not match its lock provenance',
    )
  const { artifacts: unused, dependencies: ignored, ...identity } = result
  const data = result.recipe.data
  const { id, revision, component } = data
  const key = id + '@' + revision
  const entryPath = `recipes/${id}/r${revision}/${component}.tsx`
  const usagePath = `examples/recipes/${id}/r${revision}.tsx`
  const entries = result.artifacts.filter(artifact => artifact.kind === 'component' && artifact.logicalPath === entryPath)
  const usages = result.artifacts.filter(artifact => artifact.kind === 'usage' && artifact.logicalPath === usagePath)
  if (entries.length !== 1 || usages.length !== 1)
    throw new FoundationError('INVALID_DATA', 'Recipe must contain one entry module and usage artifact')
  const importPath = context.uiAlias + '/' + entries[0].logicalPath.slice(0, -4)
  const examplePath = (await transformRecipeArtifact(context, usages[0], data)).path
  const plan: InstallPlan = {
    packageManager: context.manager,
    ...(context.bunLockfile ? { bunLockfile: context.bunLockfile } : {}),
    preconditions: { ...context.preconditions },
    projectRoot: context.root,
    preset,
    provenance: {
      catalogRelease: context.lock.catalogRelease,
      compilerVersion: context.lock.compilerVersion,
    },
    changes: [],
    managedDeclarations: structuredClone(context.lock.managedDeclarations),
    dependencyPlan: [],
    diagnostics: [],
    notices: [],
    networkAccess: false,
    recipe: { ...identity, importPath, examplePath },
  }
  const lock = structuredClone(context.lock),
    previous = lock.recipes?.[key]
  const conflict = (message: string, file?: string) =>
    plan.diagnostics.push({ code: 'FILE_CONFLICT', message, path: file })
  if (previous) {
    const { artifacts: priorFiles, ...priorIdentity } = previous
    if (canonicalize(priorIdentity) !== canonicalize(identity))
      conflict(
        'Recipe identity/revision or dark context changed; install a new revision or migrate explicitly',
        key,
      )
  }
  const owned: Record<string, InstalledArtifact> = {},
    seen = new Set<string>()
  for (const artifact of result.artifacts) {
    const target = await transformRecipeArtifact(context, artifact, data),
      normalized = target.path.replace(/^\.\//, '').toLowerCase()
    if (seen.has(normalized))
      throw new FoundationError(
        'FILE_CONFLICT',
        'Duplicate recipe destination',
        target.path,
      )
    seen.add(normalized)
    const change = await fileChange(
        context.root,
        target.path,
        target.content,
        artifact.kind,
      ),
      record = lock.artifacts[target.path]
    if (
      change.beforeHash !== null &&
      (!record ||
        record.sha256 !== change.beforeHash ||
        change.action === 'update')
    ) {
      change.action = 'conflict'
      conflict(
        'Recipe or shared utility source requires an explicit migration',
        target.path,
      )
    }
    plan.changes.push(change)
    const entry = {
      logicalPath: artifact.logicalPath,
      kind: artifact.kind,
      sha256: await sha256(target.content),
    }
    if (change.action !== 'conflict') lock.artifacts[target.path] = entry
    if (artifact.kind !== 'utility') owned[target.path] = entry
  }
  lock.recipes = {
    ...lock.recipes,
    [key]: { ...identity, artifacts: owned } satisfies InstalledRecipe,
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
      'Recipe collides with state destination',
      state.path,
    )
  plan.changes.push(state)
  // Preserve the adapters' production-group rules, especially Bun's explicit group promotion requirement.
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
  return plan
}
