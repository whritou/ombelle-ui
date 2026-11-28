import fs from 'node:fs/promises'
import path from 'node:path'
import postcss from 'postcss'
import {
  FoundationError,
  type CatalogId,
  type ProjectContext,
} from '@ombelle/contracts'
import { resolvePreset } from '@ombelle/compiler'
import { blockManifest, getCatalog } from '@ombelle/catalog'
import { inspectProject, readText } from './project/inspect.js'
import { installedBlockIds, installedComponentIds, ownerLabel, projectStatus, type FileState, type ManagedFile } from './project/status.js'
import { portable } from './project/paths.js'
import { operationLockName } from './apply/recovery.js'
import { checkInstallRuntime } from './apply/manager.js'
import { supportedNodeVersion, runtimeNotice, runtimeRequirement } from './apply/executable.js'
import { assertKnownCatalogIds, splitCatalogIds } from './component-ids.js'
import { unifiedDiff } from './diff.js'
import { outputVersion } from './format.js'
import { noticeCode, type NoticeCode } from './notices.js'
import { supportMatrix } from './support.js'
import type { ParsedArgs } from './args.js'
import { cliVersion } from './version.js'

type IO = { stdout(text: string): void; stderr(text: string): void }
const states: FileState[] = ['current', 'update-available', 'edited', 'edited-update-available', 'missing', 'not-generated']

/** `preset show`, `info`, `doctor` and `diff`: read the project, write nothing, never resolve remotely. */
export async function runReport(request: ParsedArgs, io: IO, json: boolean): Promise<number> {
  const { command, operands, flags } = request
  if (command !== 'diff' && operands.length) throw new FoundationError('INVALID_DATA', command + ' takes no operands')
  if (command === 'diff') assertKnownCatalogIds(operands)
  const root = path.resolve(flags['--cwd'] ?? process.cwd())
  const manager = flags['--package-manager'] as ProjectContext['manager'] | undefined
  if (command === 'doctor') return doctor(root, manager, io, json)
  const context = await inspectProject(root)
  const print = (record: Record<string, unknown>, text: string) =>
    io.stdout(json ? JSON.stringify({ outputVersion, command, status: 'success', projectRoot: context.root, ...record }) : text)
  if (command === 'preset show') {
    const { preset, lock, config } = context
    if (!preset || !lock || !config)
      throw new FoundationError('UNSUPPORTED_PROJECT', 'No saved project preset', context.root, 'Run init --preset <file|code>.')
    const resolved = await resolvePreset(preset, getCatalog(lock.catalogRelease))
    const record = {
      presetFile: config.presetFile,
      preset,
      presetHash: resolved.hash,
      matchesLock: resolved.hash === lock.presetHash,
      catalogRelease: lock.catalogRelease,
      compilerVersion: lock.compilerVersion,
      ...(lock.presetSource ? { source: lock.presetSource } : {}),
      componentPresets: Object.entries(lock.componentPresets ?? {}).map(([key, row]) => ({
        key, presetHash: row.preset.hash,
        ...(lock.componentPresetSources?.[key] ? { source: lock.componentPresetSources[key] } : {}),
      })),
      recipes: Object.entries(lock.recipes ?? {}).map(([key, row]) => ({
        key, recipeHash: row.recipe.hash, presetHash: row.preset.hash,
        ...(lock.recipeSources?.[key] ? { source: lock.recipeSources[key] } : {}),
      })),
    }
    print(record, [
      'Preset: ' + preset.id + '@' + preset.revision + ' (' + preset.styleFamily + ')',
      'File: ' + config.presetFile,
      'Preset hash: ' + resolved.hash + (record.matchesLock ? '' : ' (does not match the lock: ' + lock.presetHash + ')'),
      'Catalog release: ' + lock.catalogRelease,
      'Compiler version: ' + lock.compilerVersion,
      'Source: ' + (lock.presetSource ? lock.presetSource.reference + ' at ' + lock.presetSource.origin : 'local file'),
      ...record.componentPresets.map((row) => 'Component preset: ' + row.key + (row.source ? ' from ' + row.source.reference : '')),
      ...record.recipes.map((row) => 'Recipe: ' + row.key + (row.source ? ' from ' + row.source.reference : '')),
    ].join('\n'))
    return 0
  }
  if (command === 'info') {
    const status = await projectStatus(context)
    const summary = Object.fromEntries(states.map((state) => [state, status.files.filter((file) => file.state === state).length]))
    const components = status.components.map((id) => ({
      id,
      placement: context.lock?.placements?.[id] ?? 'default',
      state: componentState(status.files.filter((file) => file.owner.type === 'component' && file.owner.id === id)),
    }))
    const record = {
      cliVersion,
      initialized: Boolean(context.lock && context.preset),
      framework: context.framework,
      packageManager: context.manager,
      edition: context.edition,
      ...(context.upstream?.style ? { shadcnStyle: context.upstream.style, shadcnStyleSupported: context.upstreamStyleSupported } : {}),
      cssEntry: context.cssEntry,
      componentsDirectory: context.componentsDir,
      styleFile: context.styleFile,
      ...(context.preset ? { preset: { id: context.preset.id, revision: context.preset.revision, styleFamily: context.preset.styleFamily } } : {}),
      components,
      recipes: Object.keys(context.lock?.recipes ?? {}),
      componentPresets: Object.keys(context.lock?.componentPresets ?? {}),
      files: status.files.map((file) => ({ path: file.path, kind: file.kind, owner: ownerLabel(file.owner), state: file.state })),
      summary,
    }
    print(record, [
      'Ombelle CLI ' + cliVersion,
      'Project: ' + context.root + ' (' + context.framework + ', ' + context.manager + ', ' + context.edition + ' edition)',
      context.preset ? 'Preset: ' + context.preset.id + '@' + context.preset.revision + ' (' + context.preset.styleFamily + ')' : 'Not initialized: run init --preset <file|code>',
      'Components: ' + (components.length ? components.map((c) => c.id + (c.placement === 'beside' ? ' (beside)' : '') + (c.state === 'current' ? '' : ' [' + c.state + ']')).join(', ') : 'none'),
      ...(record.recipes.length ? ['Recipes: ' + record.recipes.join(', ')] : []),
      ...(record.componentPresets.length ? ['Component presets: ' + record.componentPresets.join(', ')] : []),
      'Files: ' + states.filter((state) => summary[state]).map((state) => summary[state] + ' ' + state).join(', ') || 'Files: none',
      ...(summary['update-available'] ? ['Next: run update to refresh files the catalog changed'] : []),
    ].join('\n'))
    return 0
  }
  // diff
  if (!context.lock || !context.preset)
    throw new FoundationError('UNSUPPORTED_PROJECT', 'No managed files to compare', context.root, 'Run init --preset <file|code>.')
  const { components: ids, blocks } = splitCatalogIds(operands as CatalogId[])
  const installed = installedComponentIds(context)
  const installedBlocks = installedBlockIds(context)
  const missing = [...ids.filter((id) => !installed.includes(id)), ...blocks.filter((id) => !installedBlocks.includes(id))]
  if (missing.length)
    throw new FoundationError('INVALID_DATA', 'Not installed: ' + missing.join(', '), '/componentIds', 'Install them with add ' + missing.join(' ') + '.')
  const status = await projectStatus(context, operands.length ? { ids, blocks, scoped: false } : {})
  const changed = status.files.filter((file) => file.state !== 'current' && file.state !== 'not-generated')
  const files = changed.map((file) => ({
    path: file.path,
    owner: ownerLabel(file.owner),
    state: file.state,
    diff: unifiedDiff(file.current ?? '', file.expected ?? '', 'a/' + file.path + ' (project)', 'b/' + file.path + ' (catalog)'),
  }))
  print({ files }, files.length
    ? files.map((file) => '# ' + file.path + ' [' + file.state + ', ' + file.owner + ']\n' + file.diff).join('\n')
    : 'No differences: every managed file matches the catalog')
  return 0
}

function componentState(files: ManagedFile[]): FileState {
  for (const state of ['edited-update-available', 'missing', 'edited', 'update-available'] as const)
    if (files.some((file) => file.state === state)) return state
  return 'current'
}

type Check = { id: string; status: 'pass' | 'warn' | 'fail'; code?: NoticeCode; message: string; path?: string; nextAction?: string }
/**
 * `doctor`: runtime, project support, preset and lock agreement, managed files, the stylesheet import,
 * declared dependencies and leftover operations. Exits 0 when no check fails, 3 when one does.
 */
async function doctor(root: string, manager: ProjectContext['manager'] | undefined, io: IO, json: boolean): Promise<number> {
  const checks: Check[] = []
  const add = (check: Check) => checks.push(check)
  const newerNode = runtimeNotice('node', process.version)
  add(supportedNodeVersion(process.version)
    ? newerNode
      ? { id: 'cli-runtime', status: 'warn', message: newerNode }
      : { id: 'cli-runtime', status: 'pass', message: 'Node ' + process.version }
    : (process.versions as Record<string, string | undefined>).bun
      ? { id: 'cli-runtime', status: 'pass', message: 'Bun ' + process.versions.bun }
      : { id: 'cli-runtime', status: 'warn', message: 'Node ' + process.version + ' is outside the supported ' + runtimeRequirement('node'), nextAction: 'Run the CLI with ' + runtimeRequirement('node') + '.' })
  let context: ProjectContext | undefined
  try {
    context = await inspectProject(root, manager)
    add({ id: 'project', status: 'pass', message: context.framework + ' with Tailwind v4, ' + context.manager + ', React ' + context.packageJson.dependencies?.react + ' (React ' + supportMatrix.react.minimum + ' or newer; tested below ' + supportMatrix.react.below + ')' })
    for (const notice of context.supportNotices ?? []) add({ id: 'react', status: 'warn', message: notice })
  } catch (error) {
    if (!(error instanceof FoundationError)) throw error
    add({ id: 'project', status: 'fail', message: error.code + ': ' + error.message, ...(error.path ? { path: error.path } : {}), ...(error.nextAction ? { nextAction: error.nextAction } : {}) })
  }
  if (context) {
    try {
      const runtimeNotices = await checkInstallRuntime(context.manager, context.root)
      add({ id: 'install-runtime', status: 'pass', message: 'Dependency installs can run ' + context.manager })
      for (const notice of runtimeNotices) add({ id: 'install-runtime', status: 'warn', message: notice })
    } catch (error) {
      if (!(error instanceof FoundationError)) throw error
      add({ id: 'install-runtime', status: 'fail', message: error.message, ...(error.nextAction ? { nextAction: error.nextAction } : {}) })
    }
    const { lock, preset, config } = context
    if (!lock || !preset || !config)
      add({ id: 'initialized', status: 'warn', message: 'No saved project preset', nextAction: 'Run init --preset <file|code>, or theme add <file|code> for an existing shadcn project.' })
    else {
      const resolved = await resolvePreset(preset, getCatalog(lock.catalogRelease)).catch(() => undefined)
      add(resolved?.hash === lock.presetHash
        ? { id: 'preset', status: 'pass', message: preset.id + '@' + preset.revision + ' matches the lock' }
        : { id: 'preset', status: 'fail', message: 'The saved preset does not match its lock provenance', path: config.presetFile, nextAction: 'Restore the committed preset and lock, or run theme add <file|code>.' })
      const status = await projectStatus(context)
      const fileChecks: Partial<Record<FileState, [Check['status'], string, string]>> = {
        'update-available': ['warn', 'catalog changed it; unedited', 'Run update to refresh it.'],
        edited: ['warn', 'edited after install; the catalog did not change it', 'Keep it (add and update report it as a conflict), or run update --overwrite <path> to restore the catalog source.'],
        'edited-update-available': ['warn', 'edited after install, and the catalog changed it', 'Run diff, then keep it or run update --overwrite <path>.'],
        missing: ['warn', 'recorded in the lock but missing', 'Run update to create it again.'],
        'not-generated': ['warn', 'no longer generated by the catalog', 'Keep or delete it.'],
      }
      for (const file of status.files) {
        const found = fileChecks[file.state]
        if (found) add({ id: 'file', status: found[0], message: file.path + ' (' + ownerLabel(file.owner) + '): ' + found[1], path: file.path, nextAction: found[2] })
      }
      if (!status.files.some((file) => fileChecks[file.state]))
        add({ id: 'files', status: 'pass', message: status.files.length + ' managed files match the catalog' })
      // Each installed block's components are installed (blocks spec, CLI): a missing one is a warning.
      const components = installedComponentIds(context)
      let missingComponents = 0
      for (const block of status.blocks)
        for (const id of blockManifest[block].components.filter((component) => !components.includes(component))) {
          missingComponents++
          const message = block + ' needs ' + id + '; run ombelle add ' + block
          add({ id: 'blocks', status: 'warn', code: noticeCode(message), message, nextAction: 'Run ombelle add ' + block + ' or ombelle update ' + block + '.' })
        }
      if (status.blocks.length && !missingComponents)
        add({ id: 'blocks', status: 'pass', message: 'Installed blocks have their components: ' + status.blocks.join(', ') })
      if (context.upstreamStyleSupported && lock.artifacts[context.styleFile]) {
        const css = await readText(context.root, context.cssEntry)
        const relative = portable(path.relative(path.dirname(context.cssEntry), context.styleFile))
        const importPath = relative.startsWith('.') ? relative : './' + relative
        let imported = false
        try {
          imported = postcss.parse(css ?? '').nodes.some((node) =>
            node.type === 'atrule' && node.name === 'import' && node.params.replace(/^['"]|['"]$/g, '') === importPath)
        } catch { imported = false }
        add(imported
          ? { id: 'style-import', status: 'pass', message: context.cssEntry + ' imports ' + importPath }
          : { id: 'style-import', status: 'warn', message: context.cssEntry + ' does not import ' + importPath, path: context.cssEntry, nextAction: 'Add @import "' + importPath + '"; or run theme add <file|code>.' })
      }
      const declared = { ...context.packageJson.devDependencies, ...context.packageJson.dependencies }
      const absent = [...new Map(status.dependencies.map((d) => [d.name, d])).values()].filter((d) => declared[d.name] === undefined)
      add(absent.length
        ? { id: 'dependencies', status: 'fail', message: 'Installed components need undeclared packages: ' + absent.map((d) => d.name + '@' + d.version).join(', '), nextAction: 'Run update to install them.' }
        : { id: 'dependencies', status: 'pass', message: 'Installed components\' packages are declared' })
    }
    if (await fs.access(path.join(context.root, operationLockName)).then(() => true, () => false))
      add({ id: 'operation-lock', status: 'warn', message: 'An interrupted operation left ' + operationLockName, nextAction: 'Run any applying command; it restores the interrupted files first.' })
  }
  const failed = checks.some((check) => check.status === 'fail')
  io.stdout(json
    ? JSON.stringify({ outputVersion, command: 'doctor', status: failed ? 'failed' : 'success', projectRoot: context?.root ?? root, checks })
    : checks.map((check) => check.status + ' ' + check.id + ': ' + check.message + (check.nextAction && check.status !== 'pass' ? '\n  Next: ' + check.nextAction : '')).join('\n'))
  return failed ? 3 : 0
}
