import {
  FoundationError,
  type ComponentId,
  type CompileResult,
  type Dependency,
  type InstallPlan,
  type ProjectContext,
  type ProjectLock,
} from '@ombelle/contracts'
import { canonicalize, sha256 } from '@ombelle/compiler'
import { readText } from '../project/inspect.js'
import { resolutionKey, type Resolution } from '../project/beside.js'
import { installedComponentIds, projectStatus } from '../project/status.js'
import { planDependencies } from './dependencies.js'
import {
  editedConflict,
  fileChange,
  planAdd,
  refreshNotice,
} from './components.js'
import { planTheme } from './theme.js'

function dedupe(dependencies: readonly Dependency[]): Dependency[] {
  const byName = new Map<string, Dependency>()
  for (const dependency of dependencies) if (!byName.has(dependency.name)) byName.set(dependency.name, dependency)
  return [...byName.values()].sort((a, b) => (a.name < b.name ? -1 : 1))
}
/** Replaces the plan's lock change with `lock`, re-reading the file so the change stays exact. */
async function setLock(plan: InstallPlan, context: ProjectContext, lock: ProjectLock): Promise<void> {
  const index = plan.changes.findIndex((change) => change.kind === 'lock')
  const file = plan.changes[index]!.path
  plan.changes[index] = await fileChange(context.root, file, canonicalize(lock) + '\n', 'lock')
}

/**
 * `update [ids]` (PUB-01, INS-05): refresh managed source whose catalog bytes changed. Ordinary
 * components plan through planAdd, so they follow exactly the rules `add` follows; without ids, the
 * recipe and component-preset rows the lock records are refreshed by the same rule. `--overwrite`
 * replaces a managed file edited after install.
 */
export async function planUpdate(
  context: ProjectContext,
  ids: readonly ComponentId[],
  resolutions: Record<string, Resolution>,
): Promise<InstallPlan> {
  if (!context.preset || !context.config || !context.lock)
    throw new FoundationError('UNSUPPORTED_PROJECT', 'Initialize a saved project preset first', context.root, 'Run init --preset <file|code>.')
  const installed = installedComponentIds(context)
  const missing = ids.filter((id) => !installed.includes(id))
  if (missing.length)
    throw new FoundationError('INVALID_DATA', 'Not installed: ' + missing.join(', '), '/componentIds', 'Install them with add ' + missing.join(' ') + '.')
  const targets = ids.length ? [...ids] : installed
  const status = await projectStatus(context, { ids: targets, scoped: ids.length === 0 })
  const scopedFiles = status.files.filter((file) => file.owner.type === 'recipe' || file.owner.type === 'component-preset')
  const scopedKeys = new Set(scopedFiles.map((file) => resolutionKey(file.path)))
  const ordinaryResolutions = Object.fromEntries(Object.entries(resolutions).filter(([file]) => !scopedKeys.has(resolutionKey(file))))
  const plan = await planAdd(context, status.compiled as CompileResult, ordinaryResolutions)
  if (!scopedFiles.length) return plan

  // Recipe and component-preset rows: their files, then their records in the lock planAdd wrote.
  const lock = JSON.parse(plan.changes.find((change) => change.kind === 'lock')!.afterContent) as ProjectLock
  const planned = new Set(plan.changes.map((change) => resolutionKey(change.path)))
  const overwrite = new Set(Object.entries(resolutions).filter(([file, how]) => how === 'overwrite' && scopedKeys.has(resolutionKey(file))).map(([file]) => resolutionKey(file)))
  for (const file of scopedFiles) {
    if (planned.has(resolutionKey(file.path))) continue
    const record = lock.artifacts[file.path]!
    if (file.expected === undefined) {
      plan.notices.push('no longer generated: ' + file.path + ' stays as it is')
      continue
    }
    const change = await fileChange(context.root, file.path, file.expected, file.kind)
    const replace = overwrite.has(resolutionKey(file.path))
    if (replace && file.state !== 'edited' && file.state !== 'edited-update-available')
      throw new FoundationError('INVALID_DATA', '--overwrite ' + file.path + " doesn't name a managed file edited after install", file.path)
    let entry = record
    if (file.state === 'missing' || file.state === 'update-available' || replace) {
      if (file.state === 'update-available') plan.notices.push(refreshNotice(file.path))
      entry = { ...record, sha256: await sha256(file.expected) }
    } else if (file.state === 'edited' || file.state === 'edited-update-available') {
      change.action = 'conflict'
      plan.diagnostics.push(editedConflict(file.path))
    }
    plan.changes.splice(plan.changes.findIndex((c) => c.kind === 'preset' || c.kind === 'config' || c.kind === 'lock'), 0, change)
    if (change.action === 'conflict') continue
    lock.artifacts[file.path] = entry
    const rows = file.owner.type === 'recipe' ? lock.recipes : lock.componentPresets
    const row = rows?.[(file.owner as { key: string }).key]
    if (row && Object.hasOwn(row.artifacts, file.path)) row.artifacts[file.path] = entry
  }
  await setLock(plan, context, lock)
  const dependencies = planDependencies(context, dedupe(status.dependencies))
  plan.dependencyPlan = dependencies.plan
  plan.notices = [...new Set([...plan.notices, ...dependencies.notices])]
  return plan
}

/**
 * `preset apply <preset>` without `--only theme`: the theme merge of `theme add`, plus every installed
 * ordinary component recompiled with the new preset under the update rules, in one transaction. A family
 * switch therefore restyles installed components instead of stranding them; edited ones conflict.
 */
export async function planPresetApply(
  context: ProjectContext,
  theme: CompileResult,
  components: CompileResult,
  resolutions: Record<string, Resolution>,
): Promise<InstallPlan> {
  const themePlan = await planTheme(context, theme, { refreshComponents: true })
  const ids = installedComponentIds(context)
  if (!context.lock || !context.config || !ids.length) return themePlan
  const lock: ProjectLock = {
    ...structuredClone(context.lock),
    ...components.provenance,
    presetHash: components.preset.hash,
    managedDeclarations: themePlan.managedDeclarations,
  }
  delete lock.presetSource
  const next: ProjectContext = { ...context, preset: components.preset.data, lock }
  const componentPlan = await planAdd(next, components, resolutions)
  const styleFile = context.styleFile
  const themeChange = themePlan.changes.find((change) => change.kind === 'theme')!
  const themeDiagnostics = themePlan.diagnostics.filter((d) => d.path !== styleFile)
  if (themeChange.action === 'conflict' && !themeDiagnostics.length) {
    const original = await readText(context.root, themeChange.path)
    themeChange.action = original === themeChange.afterContent ? 'noop' : 'update'
  }
  const plan: InstallPlan = {
    ...componentPlan,
    changes: [themeChange, ...componentPlan.changes],
    managedDeclarations: themePlan.managedDeclarations,
    diagnostics: [...themeDiagnostics, ...componentPlan.diagnostics],
    notices: [...new Set([...themePlan.notices, ...componentPlan.notices])],
  }
  const fonts = theme.dependencies.filter((dependency) => dependency.name.startsWith('@fontsource'))
  const dependencies = planDependencies(context, dedupe([...fonts, ...components.dependencies]))
  plan.dependencyPlan = dependencies.plan
  plan.notices = [...new Set([...plan.notices, ...dependencies.notices])]
  return plan
}
