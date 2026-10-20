import path from 'node:path'
import postcss, { type Container, type Rule, type AtRule } from 'postcss'
import {
  FoundationError,
  type ProjectContext,
  type CompileResult,
  type InstallPlan,
  type ManagedDeclaration,
} from '@ombelle/contracts'
import { sha256 } from '@ombelle/compiler'
import { readText } from '../project/inspect.js'
import { portable } from '../project/paths.js'
import { appendState, baseLock, fileChange } from './components.js'
export async function planTheme(
  context: ProjectContext,
  result: CompileResult,
): Promise<InstallPlan> {
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
    preconditions: context.preconditions,
    projectRoot: context.root,
    preset: result.preset,
    provenance: result.provenance,
    changes: [],
    managedDeclarations: [],
    dependencyPlan: [],
    diagnostics: [],
    networkAccess: false,
  }
  const lock = baseLock(context, result),
    records: ManagedDeclaration[] = []
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
          existing.value !== previous.value ||
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
        if (existing.value !== values[property])
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
  const fullStyle =
    !context.upstream ||
    ['radix-nova', 'new-york'].includes(context.upstream.style)
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
