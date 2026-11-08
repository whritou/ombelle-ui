import path from 'node:path'
import postcss, { type Container, type Rule, type AtRule } from 'postcss'
import { assertLockedEdition } from '../project/edition.js'
import {
  FoundationError,
  componentsWithStyleSupport,
  styleSupport,
  supportedComponentIds,
  type ComponentId,
  type ProjectContext,
  type CompileResult,
  type InstallPlan,
  type ManagedDeclaration,
} from '@ombelle/contracts'
import { sha256 } from '@ombelle/compiler'
import { getCatalog } from '@ombelle/catalog'
import { readText } from '../project/inspect.js'
import { portable } from '../project/paths.js'
import { appendState, baseLock, fileChange } from './components.js'
// Managed global components recorded in the lock, keyed by catalog id.
function installedComponents(context: ProjectContext): Map<ComponentId, string[]> {
  const installed = new Map<ComponentId, string[]>()
  for (const [file, record] of Object.entries(context.lock?.artifacts ?? {})) {
    const match = /^components\/ui\/([a-z-]+)\.(tsx|css)$/.exec(record.logicalPath)
    const id = match?.[1] as ComponentId | undefined
    if (!id || !supportedComponentIds.includes(id)) continue
    installed.set(id, [...(installed.get(id) ?? []), file])
  }
  return installed
}

// A family switch rewrites tokens and ui-style.css only, so it must not strand
// installed component source that the target family cannot style safely.
function assertFamilySwitch(context: ProjectContext, result: CompileResult): void {
  const installed = installedComponents(context)
  if (!installed.size) return
  const target = result.preset.data.styleFamily
  const ids = supportedComponentIds.filter((id) => installed.has(id))
  if (target === 'liquid-glass') {
    const blocked = ids.filter((id) => styleSupport(id, target) === 'unavailable')
    if (blocked.length)
      throw new FoundationError(
        'STYLE_UNAVAILABLE',
        'Installed components are unavailable for liquid-glass: ' + blocked.join(', ') +
          '. Experimental liquid-glass components: ' +
          componentsWithStyleSupport('liquid-glass', ['experimental']).join(', ') + '.',
        '/componentIds',
        'Keep a stable style family or remove ' + blocked.join(', ') + ' before switching to liquid-glass.',
      )
    return
  }
  if (context.preset?.styleFamily !== 'liquid-glass' || !context.lock) return
  const templates = getCatalog(context.lock.catalogRelease).templates
  const stranded = ids.filter((id) => templates[id].styles?.['liquid-glass'] !== undefined)
  if (!stranded.length) return
  const files = stranded.flatMap((id) =>
    (installed.get(id) ?? []).filter((file) => file.endsWith('.css')),
  )
  throw new FoundationError(
    'STYLE_UNAVAILABLE',
    'Installed components carry liquid-glass styles that ' + target +
      ' tokens do not bound: ' + stranded.join(', ') +
      (files.length ? ' (' + files.sort().join(', ') + ')' : '') + '.',
    '/styleFamily',
    'Remove ' + stranded.join(', ') + ', switch the theme, then add them again.',
  )
}
export async function planTheme(
  context: ProjectContext,
  result: CompileResult,
): Promise<InstallPlan> {
  assertFamilySwitch(context, result)
  const original = await readText(context.root, context.cssEntry)
  if (original === null)
    throw new FoundationError(
      'UNSUPPORTED_PROJECT',
      'Missing global CSS',
      context.cssEntry,
    )
  let css: postcss.Root
  try {
    css = postcss.parse(original)
  } catch {
    throw new FoundationError(
      'INVALID_DATA',
      'Cannot parse global CSS',
      context.cssEntry,
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
            context.packageJson.packageManager.split('@')[0] + '.',
        }
      : {}),
    preconditions: context.preconditions,
    projectRoot: context.root,
    preset: result.preset,
    provenance: result.provenance,
    changes: [],
    managedDeclarations: [],
    dependencyPlan: [],
    diagnostics: [],
    notices: [],
    networkAccess: false,
  }
  const lock = baseLock(context, result),
    records: ManagedDeclaration[] = []
  // An explicit global selection replaces its source independently of bytes.
  // Remote provenance is attached to the completed plan by the input boundary.
  delete lock.presetSource
  for (const [selector, values] of [
    [':root', result.theme.light],
    [context.darkSelector, result.theme.dark],
    ['@theme inline', result.theme.theme],
  ] as const) {
    const matches = css.nodes.filter((n) =>
      selector === '@theme inline'
        ? n.type === 'atrule' && n.name === 'theme' && n.params === 'inline'
        : n.type === 'rule' && n.selector === selector,
    ) as (Rule | AtRule)[]
    if (matches.length > 1)
      throw new FoundationError(
        'UNSUPPORTED_PROJECT',
        'Multiple managed selector blocks are ambiguous',
        selector,
      )
    let block: Container = matches[0]
    if (!block) {
      block =
        selector === '@theme inline'
          ? postcss.atRule({ name: 'theme', params: 'inline', nodes: [] })
          : postcss.rule({ selector, nodes: [] })
      block.raws.before = '\n'
      css.append(block)
    }
    for (const property of Object.keys(values).sort()) {
      const declarations = block.nodes?.filter(
        (n) => n.type === 'decl' && n.prop === property,
      ) as postcss.Declaration[]
      if (declarations.length > 1)
        throw new FoundationError(
          'UNSUPPORTED_PROJECT',
          'Duplicate managed declaration',
          selector + '/' + property,
        )
      const existing = declarations[0],
        previous = context.lock?.managedDeclarations.find(
          (r) => r.selector === selector && r.property === property,
        )
      if (
        previous &&
        (!existing ||
          existing.value.trimEnd() !== previous.value ||
          Boolean(existing.important) !== (previous.important ?? false))
      ) {
        plan.diagnostics.push({
          code: 'FILE_CONFLICT',
          message: 'Managed theme declaration was edited locally',
          path: selector + '/' + property,
        })
        continue
      }
      records.push({
        selector,
        property,
        value: values[property],
        important: Boolean(existing?.important),
        existedBefore: previous?.existedBefore ?? Boolean(existing),
      })
      if (existing) {
        // PostCSS retains trailing whitespace in custom properties without a
        // final semicolon. Leave those bytes intact when the token is unchanged.
        if (existing.value.trimEnd() !== values[property])
          existing.value = values[property]
      } else {
        const declaration = postcss.decl({
          prop: property,
          value: values[property],
        })
        declaration.raws.before = '\n  '
        declaration.raws.between = ': '
        block.append(declaration)
      }
    }
  }
  if (context.upstreamStyleSupported) assertLockedEdition(context, context.edition)
  const fullStyle = context.upstreamStyleSupported
  if (fullStyle) {
    const style = result.artifacts.find(
      (a) => a.logicalPath === 'styles/ui-style.css',
    )!
    const change = await fileChange(
      context.root,
      context.styleFile,
      style.content,
      'style',
    )
    const record = context.lock?.artifacts[context.styleFile]
    if (
      change.beforeHash !== null &&
      (!record || record.sha256 !== change.beforeHash)
    ) {
      change.action = 'conflict'
      plan.diagnostics.push({
        code: 'FILE_CONFLICT',
        message: 'Style rules were edited or have no provenance',
        path: change.path,
      })
    }
    plan.changes.push(change)
    if (change.action !== 'conflict')
      lock.artifacts[change.path] = {
        logicalPath: style.logicalPath,
        kind: 'style',
        sha256: await sha256(change.afterContent),
      }
    const relative = portable(
      path.relative(path.dirname(context.cssEntry), context.styleFile),
    )
    const importPath = relative.startsWith('.') ? relative : './' + relative
    const exists = css.nodes.some(
      (n) =>
        n.type === 'atrule' &&
        n.name === 'import' &&
        n.params.replace(/^['"]|['"]$/g, '') === importPath,
    )
    if (!exists)
      css.prepend(
        postcss.atRule({ name: 'import', params: JSON.stringify(importPath) }),
      )
  }
  const afterContent = css.toString()
  const change: InstallPlan['changes'][number] = {
    path: context.cssEntry,
    beforeHash: await sha256(original),
    afterContent,
    kind: 'theme',
    action: original === afterContent ? 'noop' : 'update',
  }
  if (plan.diagnostics.length) change.action = 'conflict'
  plan.changes.unshift(change)
  plan.managedDeclarations = records
  lock.managedDeclarations = records
  await appendState(plan, context, result, lock)
  return plan
}
