#!/usr/bin/env node
import fs from 'node:fs/promises'
import { realpathSync } from 'node:fs'
import path from 'node:path'
import { pathToFileURL } from 'node:url'
import { createInterface } from 'node:readline/promises'
import {
  FoundationError,
  componentsWithStyleSupport,
  familyAccessibilityCaveat,
  type ComponentId,
  type Preset,
  type Recipe,
  type InstallPlan,
} from '@ombelle/contracts'
import { compile, compileButtonPreset, compileInstallableRecipe, glassContrastWarning } from '@ombelle/compiler'
import { cliVersion } from './version.js'
import { resolveRecipeInput, type ResolvedRecipeInput } from './snapshots/recipe-input.js'
import { applyRecipeSourceToPlan } from './snapshots/recipe-source.js'
import { writeRecipeSnapshotCache } from './snapshots/recipe-cache.js'
import { resolvePresetInput, type ResolvedPresetInput } from './snapshots/input.js'
import { snapshotCacheDirectory, writeSnapshotCache } from './snapshots/cache.js'
import { applyPresetSourceToPlan } from './snapshots/source.js'
import { planRecipe } from './plan/recipe.js'
import { planComponentPreset } from './plan/component-preset.js'
import { inspectProject } from './project/inspect.js'
import { besideComponents, resolutionKey, type Resolution } from './project/beside.js'
import { installedComponentIds } from './project/status.js'
import { planAdd } from './plan/components.js'
import { planTheme } from './plan/theme.js'
import { planPresetApply, planUpdate } from './plan/update.js'
import { applyPlan } from './apply/transaction.js'
import { operationLockName } from './apply/recovery.js'
import { checkInstallRuntime, dependencyTimeoutMs } from './apply/manager.js'
import { formatPlan, outputVersion, planOutput } from './format.js'
import { assertKnownComponentIds } from './component-ids.js'
import { parseArgs, usage, type ParsedArgs } from './args.js'
import { runReport } from './report.js'
import { asNewerDocument } from './compat.js'

/** Exit code per diagnostic code; docs/05-cli-specification.md lists the same table (PUB-07). */
export const exitCodes: Record<string, number> = {
  INVALID_DATA: 2,
  INVALID_REFERENCE: 2,
  STYLE_UNAVAILABLE: 2,
  UNKNOWN_COMPONENT: 2,
  UNSUPPORTED_RELEASE: 3,
  UNSUPPORTED_PROJECT: 3,
  FILE_CONFLICT: 4,
  RESOLUTION_FAILURE: 5,
  DEPENDENCY_FAILURE: 6,
  INTERNAL_ERROR: 1,
}

function glassNotices(
  preset: Preset,
  ids: readonly ComponentId[] | undefined,
  installsFilter = false,
  overrides?: Recipe['overrides'],
): string[] {
  const caveat = familyAccessibilityCaveat(preset.styleFamily)
  if (preset.styleFamily !== 'liquid-glass' || caveat === null) return []
  const available = componentsWithStyleSupport('liquid-glass', ['stable', 'experimental'])
  const listed = ids ? available.filter((id) => ids.includes(id)) : available
  if (!listed.length) return []
  const notices = [caveat + ' See docs/components/liquid-glass.md.']
  // Only commands that write components write the filter component; the others have none to mount.
  if (installsFilter)
    notices.push('mount <LiquidGlassFilter /> from components/ui/liquid-glass-filter once in your root layout for refraction in Chromium browsers')
  const contrast = glassContrastWarning(preset, overrides)
  if (contrast) notices.push(contrast)
  return notices
}
type IO = {
  stdout(text: string): void
  stderr(text: string): void
  /** Answers prompts; when absent, prompts read a TTY stdin. */
  question?(text: string): Promise<string>
}
export async function runCli(args: string[], io: IO): Promise<number> {
  const json = args.includes('--json')
  let command = ''
  try {
    const request = parseArgs(args)
    if (request.kind === 'help') {
      io.stdout(usage())
      return 0
    }
    if (request.kind === 'version') {
      io.stdout(json ? JSON.stringify({ outputVersion, command: 'version', status: 'success', version: cliVersion }) : cliVersion)
      return 0
    }
    command = request.command
    if (['preset show', 'info', 'doctor', 'diff'].includes(request.command))
      return await runReport(request, io, json)
    return await runPlan(request, io, json)
  } catch (cause) {
    // A flag the command does not take is found once the command is known; report that command.
    if (!command && typeof (cause as { command?: unknown }).command === 'string') command = (cause as { command: string }).command
    const e =
      cause instanceof FoundationError
        ? cause
        : new FoundationError('INTERNAL_ERROR', cause instanceof Error ? cause.message : 'Unexpected failure')
    const record = {
      outputVersion,
      command,
      status: 'error',
      error: {
        code: e.code,
        message: e.message,
        path: e.path,
        nextAction: e.nextAction,
        ...(e.recovery ? { recovery: e.recovery } : {}),
      },
    }
    if (json) io.stdout(JSON.stringify(record))
    // Every error with a next action prints it, not only some codes (INS-02).
    else io.stderr(e.code + ': ' + e.message + (e.path ? ' (' + e.path + ')' : '') + (e.nextAction ? '\nNext: ' + e.nextAction : ''))
    return exitCodes[e.code] ?? 1
  }
}

/** Checks the request's operands and flag combinations before any input is resolved or file read. */
function validateRequest(request: ParsedArgs): void {
  const { command, operands, flags, resolutions } = request
  const bad = (message: string, where?: string) => new FoundationError('INVALID_DATA', message, where)
  if (command === 'init') {
    if (operands.length) throw bad('init takes no operands; choose the preset with --preset <file|code>')
    if (!flags['--preset']) throw bad('Choose a local preset JSON file or exact snapshot reference with --preset <file|code>', '--preset')
  }
  if (command === 'theme add' || command === 'preset apply') {
    // A second preset through --preset would be ignored silently; refuse it (PUB-16).
    if (operands.length !== 1) throw bad('Choose one local preset JSON file or exact snapshot reference: ' + command + ' <file|code>')
    if (flags['--only'] !== undefined && flags['--only'] !== 'theme') throw bad('--only takes theme', '--only')
    if (flags['--only'] === 'theme' && resolutions.length) throw bad('--overwrite has no file to replace with --only theme', '--overwrite')
  }
  if (command === 'add') {
    if (flags['--recipe'] && (operands.length || flags['--preset']))
      throw bad('Use add --recipe <file|code> without component arguments or --preset')
    if (flags['--preset'] && (operands.length !== 1 || operands[0] !== 'button'))
      throw bad('Use add button --preset <file|code> to select a component-only preset')
    if (resolutions.length && (flags['--recipe'] || flags['--preset']))
      throw bad('Use --overwrite and --beside only with add <components>')
    if (!flags['--recipe'] && !operands.length) throw bad('Choose at least one component')
  }
  const presetInput = command === 'theme add' || command === 'preset apply' ? operands[0] : flags['--preset']
  const remoteFlags = flags['--snapshot-origin'] !== undefined || flags['--preset-hash'] !== undefined ||
    flags['--recipe-hash'] !== undefined || flags['--offline']
  if ((remoteFlags && !flags['--recipe'] && presetInput === undefined) ||
    (flags['--recipe-hash'] !== undefined && !flags['--recipe']) ||
    (flags['--preset-hash'] !== undefined && flags['--recipe']))
    throw bad('Remote snapshot flags require an explicit preset or recipe code; use --preset-hash for presets and --recipe-hash for recipes')
  const manager = flags['--package-manager']
  if (manager !== undefined && !['npm', 'pnpm', 'yarn', 'bun'].includes(manager))
    throw bad('Choose npm, pnpm, yarn, or bun for --package-manager', '--package-manager')
  // Component ids are checked against the catalog before any preset, project, or style-support work.
  if (command === 'add' || command === 'update') assertKnownComponentIds(operands)
  // Environment settings are read before planning, not after the first file is written (PUB-08).
  dependencyTimeoutMs(process.env)
}

async function runPlan(request: ParsedArgs, io: IO, json: boolean): Promise<number> {
  validateRequest(request)
  const { command, operands, flags } = request
  let presetInput: ResolvedPresetInput | undefined
  let recipeInput: ResolvedRecipeInput | undefined
  // Cache configuration is read only once input validation selected a snapshot (a getter, never spread);
  // local files never read it.
  const remote = (expectedHash: string | undefined) => ({
    origin: flags['--snapshot-origin'],
    expectedHash,
    offline: flags['--offline'] === true,
    get cacheRoot() { return snapshotCacheDirectory(process.env) },
  })
  if (flags['--recipe'] !== undefined)
    recipeInput = await resolveRecipeInput(flags['--recipe'], remote(flags['--recipe-hash'])).catch((error) => { throw asNewerDocument(error, 'recipe') })
  const presetValue = command === 'theme add' || command === 'preset apply' ? operands[0] : flags['--preset']
  if (presetValue !== undefined)
    presetInput = await resolvePresetInput(presetValue, remote(flags['--preset-hash'])).catch((error) => { throw asNewerDocument(error, 'preset') })
  const context = await inspectProject(
    path.resolve(flags['--cwd'] ?? process.cwd()),
    flags['--package-manager'] as 'npm' | 'pnpm' | 'yarn' | 'bun' | undefined,
  )
  const resolutions: Record<string, Resolution> = {}
  for (const [resolution, given] of request.resolutions) {
    const file = path.isAbsolute(given) ? path.relative(context.root, given) : given
    if (Object.keys(resolutions).some((other) => resolutionKey(other) === resolutionKey(file)))
      throw new FoundationError('INVALID_DATA', 'Choose one resolution for ' + given, given)
    resolutions[file] = resolution
  }
  const interactive = io.question !== undefined || process.stdin.isTTY === true
  const ask = async (text: string) => {
    if (io.question) return io.question(text)
    const prompt = createInterface({ input: process.stdin, output: process.stderr })
    try {
      return await prompt.question(text)
    } finally {
      prompt.close()
    }
  }
  const requireProject = () => {
    if (!context.preset || !context.config || !context.lock)
      throw new FoundationError('UNSUPPORTED_PROJECT', 'Initialize a saved project preset first', context.root, 'Run init --preset <file|code>.')
  }
  let plan: InstallPlan
  if (recipeInput) {
    requireProject()
    const recipe = recipeInput.recipe
    // A recipe code compiles against the preset its snapshot stored, not today's built-in (decision 0009).
    const compiled = await compileInstallableRecipe({ recipe, darkSelector: context.darkSelector, preset: recipeInput.snapshot?.preset })
    plan = await planRecipe(context, compiled)
    const data = compiled.recipe.data
    plan.notices.push(...glassNotices(compiled.preset.data, [data.component], false, data.schemaVersion === '1.0' ? data.overrides : undefined))
  } else if (command === 'add' && flags['--preset']) {
    const compiled = await compileButtonPreset({ preset: presetInput!.preset, darkSelector: context.darkSelector, glassContrast: 'report' })
    plan = await planComponentPreset(context, compiled)
    plan.notices.push(...glassNotices(compiled.preset.data, ['button']))
  } else {
    if (command === 'add' || command === 'update') requireProject()
    const preset: Preset = command === 'add' || command === 'update' ? context.preset! : presetInput!.preset
    const ids = operands as ComponentId[]
    const full = command === 'preset apply' && flags['--only'] !== 'theme'
    const compileFor = (componentIds: readonly ComponentId[], chosen: Record<string, Resolution>) =>
      compile({
        preset,
        componentIds,
        catalogRelease: preset.catalogRelease,
        compilerVersion: preset.compilerVersion,
        glassContrast: 'report',
        edition: context.edition,
        prefixedComponents: besideComponents(context, chosen),
      })
    const planWith = async (chosen: Record<string, Resolution>) => {
      let planned: InstallPlan
      if (command === 'add') planned = await planAdd(context, await compileFor(ids, chosen), chosen)
      else if (command === 'update') planned = await planUpdate(context, ids, chosen)
      else if (full)
        planned = await planPresetApply(context, await compileFor([], chosen), await compileFor(installedComponentIds(context), chosen), chosen)
      else planned = await planTheme(context, await compileFor([], chosen))
      const writesComponents = command === 'add' || command === 'update' || (full && installedComponentIds(context).length > 0)
      planned.notices.push(...glassNotices(
        planned.preset.data,
        command === 'add' ? ids : command === 'update' || full ? installedComponentIds(context) : undefined,
        writesComponents && command !== 'update',
      ))
      planned.notices = [...new Set(planned.notices)]
      return planned
    }
    plan = await planWith(resolutions)
    // Interactively choose how to resolve files that need an explicit choice, then re-plan with those
    // choices before the usual apply prompt.
    const choosable = plan.diagnostics.filter((d) => d.resolutions && d.path)
    if (
      ['add', 'update', 'preset apply'].includes(command) && interactive && !json && !flags['--yes'] &&
      !flags['--dry-run'] && choosable.length && choosable.length === plan.diagnostics.length
    ) {
      const chosen = { ...resolutions }
      for (const d of choosable) {
        const choices = d.resolutions!
        const edited = context.lock?.artifacts[d.path!] !== undefined
        const answer = (
          await ask(
            d.path + (edited ? ' was edited after install and the catalog changed it: ' : ' exists and is not managed by Ombelle: ') +
              choices.map((c) => '[' + c[0] + ']' + c.slice(1)).join(', ') + ', [c]ancel ',
          )
        ).trim().toLowerCase()
        const picked = choices.find((c) => answer === c[0] || answer === c)
        if (!picked) {
          io.stdout(formatPlan(command, 'cancelled', plan))
          return 0
        }
        chosen[d.path!] = picked
      }
      plan = await planWith(chosen)
    }
  }
  if (presetInput)
    await applyPresetSourceToPlan(plan, context, presetInput, command === 'add' ? 'component' : 'global')
  if (presetInput?.source && presetInput.resolution !== 'local') {
    plan.presetResolution = { source: presetInput.source, via: presetInput.resolution }
    plan.networkAccess = presetInput.networkAccess
  }
  if (recipeInput) await applyRecipeSourceToPlan(plan, context, recipeInput)
  if (recipeInput?.source && recipeInput.resolution !== 'local') {
    plan.recipeResolution = { source: recipeInput.source, via: recipeInput.resolution }
    plan.networkAccess = recipeInput.networkAccess
  }
  if (await pathExists(path.join(context.root, operationLockName)))
    plan.notices.push('An interrupted operation left ' + operationLockName + '; the next apply restores its files and then asks you to run the command again')
  const emit = (status: string) =>
    io.stdout(json ? JSON.stringify(planOutput(command, status, plan)) : formatPlan(command, status, plan))
  if (plan.diagnostics.length > 0 || plan.changes.some((c) => c.action === 'conflict')) {
    emit('conflict')
    return 4
  }
  if (flags['--dry-run']) {
    // A dry run reports a dependency install that would fail to start (INS-02); an apply checks the
    // same before its first write and stops with the error.
    if (plan.dependencyPlan.length)
      try {
        await checkInstallRuntime(context.manager)
      } catch (error) {
        if (!(error instanceof FoundationError)) throw error
        plan.notices.push('Dependency install unavailable: ' + error.message + (error.nextAction ? '. ' + error.nextAction : ''))
      }
    emit('planned')
    return 0
  }
  if (!flags['--yes']) {
    if (!interactive)
      throw new FoundationError('INVALID_DATA', 'Noninteractive writes require --yes after reviewing --dry-run', undefined, 'Review the plan with --dry-run, then rerun with --yes.')
    io.stderr(formatPlan(command, 'planned', plan))
    const answer = await ask('Apply these changes? [y/N] ')
    if (!/^y(?:es)?$/i.test(answer.trim())) {
      emit('cancelled')
      return 0
    }
  }
  await applyPlan(plan)
  if (recipeInput?.source && recipeInput.snapshot) {
    try {
      await writeRecipeSnapshotCache(snapshotCacheDirectory(process.env), recipeInput.source, recipeInput.snapshot)
    } catch (error) {
      io.stderr('Warning: recipe snapshot cache was not saved after successful apply: ' + (error instanceof Error ? error.message : 'cache write failed'))
    }
  }
  if (presetInput?.source && presetInput.snapshot) {
    try {
      await writeSnapshotCache(snapshotCacheDirectory(process.env), presetInput.source, presetInput.snapshot)
    } catch (error) {
      io.stderr('Warning: snapshot cache was not saved after successful apply: ' + (error instanceof Error ? error.message : 'cache write failed'))
    }
  }
  emit('success')
  return 0
}

// POSIX package managers expose bins as symlinks; Node resolves the module URL
// but keeps argv[1] as invoked, so compare against the resolved entry path.
function invokedAsEntry(): boolean {
  if (!process.argv[1]) return false
  try { return import.meta.url === pathToFileURL(realpathSync(process.argv[1])).href } catch { return false }
}
if (invokedAsEntry())
  process.exitCode = await runCli(process.argv.slice(2), {
    stdout: (text) => process.stdout.write(text + '\n'),
    stderr: (text) => process.stderr.write(text + '\n'),
  })

async function pathExists(file: string): Promise<boolean> {
  return fs.access(file).then(() => true, () => false)
}
