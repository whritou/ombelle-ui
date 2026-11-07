#!/usr/bin/env node
import { realpathSync } from 'node:fs'
import path from 'node:path'
import { pathToFileURL } from 'node:url'
import { createInterface } from 'node:readline/promises'
import {
  FoundationError,
  supportedComponentIds,
  componentsWithStyleSupport,
  type ComponentId,
  type Preset,
  type Recipe,
  type InstallPlan,
} from '@ombelle/contracts'
import { compile, compileButtonPreset, compileInstallableRecipe, glassContrastWarning } from '@ombelle/compiler'
import { resolveRecipeInput, type ResolvedRecipeInput } from './snapshots/recipe-input.js'
import { applyRecipeSourceToPlan } from './snapshots/recipe-source.js'
import { writeRecipeSnapshotCache } from './snapshots/recipe-cache.js'
import { resolvePresetInput, type ResolvedPresetInput } from './snapshots/input.js'
import { snapshotCacheDirectory, writeSnapshotCache } from './snapshots/cache.js'
import { applyPresetSourceToPlan } from './snapshots/source.js'
import { planRecipe } from './plan/recipe.js'
import { planComponentPreset } from './plan/component-preset.js'
import { inspectProject } from './project/inspect.js'
import {
  besideComponents,
  resolutionKey,
  type Resolution,
} from './project/beside.js'
import { planAdd } from './plan/components.js'
import { planTheme } from './plan/theme.js'
import { applyPlan } from './apply/transaction.js'
import { formatPlan, planOutput } from './format.js'
import { assertKnownComponentIds } from './component-ids.js'
const exits: Record<string, number> = {
  INVALID_DATA: 2,
  STYLE_UNAVAILABLE: 2,
  UNKNOWN_COMPONENT: 2,
  UNSUPPORTED_RELEASE: 3,
  UNSUPPORTED_PROJECT: 3,
  FILE_CONFLICT: 4,
  RESOLUTION_FAILURE: 5,
  DEPENDENCY_FAILURE: 6,
  INTERNAL_ERROR: 1,
}
const usage =
  'Ombelle foundation: init --preset <local.json> | add <' +
  supportedComponentIds.join('|') +
  '> | add button --preset <local.json> | add --recipe <local.json> | theme add <local.json> [--cwd <app>] [--overwrite <path>] [--beside <path>] [--package-manager <npm|pnpm|yarn|bun>] [--dry-run] [--json] [--yes]\nPreset inputs also accept exact ps_<32 lowercase hex>@1; recipes accept rc_<32 lowercase hex>@1. Codes resolve at https://ombelle-ui.vercel.app. Custom services require --snapshot-origin <origin> and --preset-hash <64 lowercase hex> or --recipe-hash <64 lowercase hex>. Use --offline only with an explicit origin, hash and verified cache; offline cannot detect later withdrawals. HTTPS is required except literal loopback HTTP.'
function glassNotices(
  preset: Preset,
  ids: readonly ComponentId[] | undefined,
  installsFilter = false,
  overrides?: Recipe['overrides'],
): string[] {
  if (preset.styleFamily !== 'liquid-glass') return []
  const experimental = componentsWithStyleSupport('liquid-glass', ['experimental'])
  const listed = ids ? experimental.filter((id) => ids.includes(id)) : experimental
  if (!listed.length) return []
  const notices = ['liquid-glass is experimental for ' + listed.join(', ') +
    '; see docs/components/liquid-glass.md for limitations']
  // Only `add` writes the filter component; other commands have none to mount.
  if (installsFilter)
    notices.push('mount <LiquidGlassFilter /> from components/ui/liquid-glass-filter once in your root layout for refraction in Chromium browsers')
  const contrast = glassContrastWarning(preset, overrides)
  if (contrast) notices.push(contrast)
  return notices
}
export async function runCli(
  args: string[],
  io: {
    stdout(text: string): void
    stderr(text: string): void
    /** Answers prompts; when absent, prompts read a TTY stdin. */
    question?(text: string): Promise<string>
  },
): Promise<number> {
  const json = args.includes('--json')
  let command = args[0] ?? ''
  try {
    if (args.includes('--help')) {
      io.stdout(usage)
      return 0
    }
    const flags: Record<string, string | boolean> = {},
      positional: string[] = [],
      resolutionFlags: [Resolution, string][] = []
    for (let i = 0; i < args.length; i++) {
      const a = args[i]
      if (a === '--overwrite' || a === '--beside') {
        if (!args[i + 1] || args[i + 1].startsWith('--'))
          throw new FoundationError('INVALID_DATA', 'Missing flag value', a)
        resolutionFlags.push([a.slice(2) as Resolution, args[++i]])
      } else if (a.startsWith('--')) {
        if (Object.hasOwn(flags, a))
          throw new FoundationError('INVALID_DATA', 'Repeated flag', a)
        if (['--json', '--yes', '--dry-run', '--offline'].includes(a))
          flags[a] = true
        else if (
          [
            '--cwd', '--preset', '--package-manager', '--recipe',
            '--snapshot-origin', '--preset-hash', '--recipe-hash',
          ].includes(a)
        ) {
          if (!args[i + 1] || args[i + 1].startsWith('--'))
            throw new FoundationError('INVALID_DATA', 'Missing flag value', a)
          flags[a] = args[++i]
        } else throw new FoundationError('INVALID_DATA', 'Unknown flag', a)
      } else positional.push(a)
    }
    command = positional[0] ?? ''
    if (!['init', 'add', 'theme'].includes(command))
      throw new FoundationError('INVALID_DATA', usage)
    if (command === 'theme' && positional[1] !== 'add')
      throw new FoundationError('INVALID_DATA', usage)
    if (command === 'init' && positional.length !== 1)
      throw new FoundationError('INVALID_DATA', usage)
    if (
      flags['--recipe'] &&
      (command !== 'add' || positional.length !== 1 || flags['--preset'])
    )
      throw new FoundationError(
        'INVALID_DATA',
        'Use add --recipe <local.json> without component arguments or --preset',
      )
    if (
      command === 'add' &&
      flags['--preset'] &&
      (positional.length !== 2 || positional[1] !== 'button')
    )
      throw new FoundationError(
        'INVALID_DATA',
        'Use add button --preset <local.json> to select a component-only preset',
      )
    if (
      resolutionFlags.length &&
      (command !== 'add' || flags['--recipe'] || flags['--preset'])
    )
      throw new FoundationError(
        'INVALID_DATA',
        'Use --overwrite and --beside only with add <components>',
      )
    const presetValue = command === 'theme' ? positional[2] : flags['--preset']
    if (
      (command === 'init' || command === 'theme') &&
      (typeof presetValue !== 'string' ||
        (command === 'theme' && positional.length !== 3))
    )
      throw new FoundationError(
        'INVALID_DATA', 'Choose a local preset JSON file or exact snapshot reference',
      )
    const remoteFlags = flags['--snapshot-origin'] !== undefined ||
      flags['--preset-hash'] !== undefined || flags['--recipe-hash'] !== undefined || flags['--offline']
    if ((remoteFlags && !flags['--recipe'] && typeof presetValue !== 'string') ||
      (flags['--recipe-hash'] !== undefined && !flags['--recipe']) ||
      (flags['--preset-hash'] !== undefined && flags['--recipe']))
      throw new FoundationError(
        'INVALID_DATA',
        'Remote snapshot flags require an explicit preset or recipe code; use --preset-hash for presets and --recipe-hash for recipes',
      )
    const selected = flags['--package-manager']
    if (
      selected !== undefined &&
      !['npm', 'pnpm', 'yarn', 'bun'].includes(String(selected))
    )
      throw new FoundationError(
        'INVALID_DATA',
        'Choose npm, pnpm, yarn, or bun for --package-manager',
      )
    // Component ids are checked against the catalog before any preset,
    // project, or style-support work, in every family.
    if (command === 'add') assertKnownComponentIds(positional.slice(1))
    let presetInput: ResolvedPresetInput | undefined
    let recipeInput: ResolvedRecipeInput | undefined
    if (typeof flags['--recipe'] === 'string') {
      recipeInput = await resolveRecipeInput(flags['--recipe'], {
        origin: flags['--snapshot-origin'] as string | undefined,
        expectedHash: flags['--recipe-hash'] as string | undefined,
        offline: flags['--offline'] === true,
        get cacheRoot() { return snapshotCacheDirectory(process.env) },
      })
    }
    if (typeof presetValue === 'string') {
      presetInput = await resolvePresetInput(presetValue, {
        origin: flags['--snapshot-origin'] as string | undefined,
        expectedHash: flags['--preset-hash'] as string | undefined,
        offline: flags['--offline'] === true,
        // Resolve cache configuration only after input/flag validation selects
        // an offline snapshot. Local files never inspect cache settings.
        get cacheRoot() {
          return snapshotCacheDirectory(process.env)
        },
      })
    }
    const context = await inspectProject(
      path.resolve(String(flags['--cwd'] ?? process.cwd())),
      selected as 'npm' | 'pnpm' | 'yarn' | 'bun' | undefined,
    )
    const resolutions: Record<string, Resolution> = {}
    for (const [resolution, given] of resolutionFlags) {
      const file = path.isAbsolute(given)
        ? path.relative(context.root, given)
        : given
      const existing = Object.keys(resolutions).find(
        (other) => resolutionKey(other) === resolutionKey(file),
      )
      if (existing)
        throw new FoundationError(
          'INVALID_DATA',
          'Choose one resolution for ' + given,
          given,
        )
      resolutions[file] = resolution
    }
    const interactive = io.question !== undefined || process.stdin.isTTY === true
    const ask = async (text: string) => {
      if (io.question) return io.question(text)
      const prompt = createInterface({
        input: process.stdin,
        output: process.stderr,
      })
      try {
        return await prompt.question(text)
      } finally {
        prompt.close()
      }
    }
    let plan: InstallPlan
    if (flags['--recipe']) {
      if (!context.preset || !context.config || !context.lock)
        throw new FoundationError(
          'UNSUPPORTED_PROJECT',
          'Initialize a saved project preset first',
          context.root,
          'Run init --preset <local.json>.',
        )
      const recipe = recipeInput!.recipe
      const compiled = await compileInstallableRecipe({ recipe, darkSelector: context.darkSelector })
      plan = await planRecipe(context, compiled)
      const data = compiled.recipe.data
      plan.notices = glassNotices(compiled.preset.data, [data.component], false,
        data.schemaVersion === '1.0' ? data.overrides : undefined)
    } else if (command === 'add' && flags['--preset']) {
      const preset = presetInput!.preset
      const compiled = await compileButtonPreset({
        preset,
        darkSelector: context.darkSelector,
        glassContrast: 'report',
      })
      plan = await planComponentPreset(context, compiled)
      plan.notices = glassNotices(compiled.preset.data, ['button'])
    } else {
      let preset: Preset | undefined = context.preset
      if (command !== 'add') {
        preset = presetInput!.preset
      } else if (!preset || !context.config || !context.lock)
        throw new FoundationError(
          'UNSUPPORTED_PROJECT',
          'Initialize a saved project preset first',
          context.root,
          'Run init --preset <local.json>.',
        )
      const ids: ComponentId[] = command === 'add' ? positional.slice(1) as ComponentId[] : []
      if (command === 'add' && !ids.length)
        throw new FoundationError(
          'INVALID_DATA',
          'Choose at least one component',
        )
      const savedPreset = preset
      const planWith = async (chosen: Record<string, Resolution>) => {
        const result = await compile({
          preset: savedPreset,
          componentIds: ids as ComponentId[],
          catalogRelease: savedPreset.catalogRelease,
          compilerVersion: savedPreset.compilerVersion,
          glassContrast: 'report',
          edition: context.edition,
          prefixedComponents: besideComponents(context, chosen),
        })
        const planned =
          command === 'add'
            ? await planAdd(context, result, chosen)
            : await planTheme(context, result)
        planned.notices = [...planned.notices, ...glassNotices(
          result.preset.data,
          command === 'add' ? (ids as ComponentId[]) : undefined,
          command === 'add',
        )]
        return planned
      }
      plan = await planWith(resolutions)
      // Interactively choose how to resolve files Ombelle doesn't own, then
      // re-plan with those choices before the usual apply prompt.
      const unowned = plan.diagnostics.filter((d) => d.resolutions && d.path)
      if (
        command === 'add' &&
        interactive &&
        !json &&
        !flags['--yes'] &&
        !flags['--dry-run'] &&
        unowned.length &&
        unowned.length === plan.diagnostics.length
      ) {
        const chosen = { ...resolutions }
        for (const d of unowned) {
          const choices = d.resolutions!
          const answer = (
            await ask(
              d.path + ' exists and is not managed by Ombelle: ' +
                choices.map((c) => '[' + c[0] + ']' + c.slice(1)).join(', ') +
                ', [c]ancel ',
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
      await applyPresetSourceToPlan(
        plan, context, presetInput, command === 'add' ? 'component' : 'global',
      )
    if (presetInput?.source && presetInput.resolution !== 'local') {
      plan.presetResolution = {
        source: presetInput.source, via: presetInput.resolution,
      }
      plan.networkAccess = presetInput.networkAccess
    }
    if (recipeInput) await applyRecipeSourceToPlan(plan, context, recipeInput)
    if (recipeInput?.source && recipeInput.resolution !== 'local') {
      plan.recipeResolution = { source: recipeInput.source, via: recipeInput.resolution }
      plan.networkAccess = recipeInput.networkAccess
    }
    const hasConflicts =
      plan.diagnostics.length > 0 ||
      plan.changes.some((c) => c.action === 'conflict')
    const emit = (status: string) =>
      io.stdout(
        json
          ? JSON.stringify(planOutput(command, status, plan))
          : formatPlan(command, status, plan),
      )
    if (hasConflicts) {
      emit('conflict')
      return 4
    }
    if (flags['--dry-run']) {
      emit('planned')
      return 0
    }
    if (!flags['--yes']) {
      if (!interactive)
        throw new FoundationError(
          'INVALID_DATA',
          'Noninteractive writes require --yes after reviewing --dry-run',
        )
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
        io.stderr('Warning: recipe snapshot cache was not saved after successful apply: ' +
          (error instanceof Error ? error.message : 'cache write failed'))
      }
    }
    if (presetInput?.source && presetInput.snapshot) {
      try {
        await writeSnapshotCache(
          snapshotCacheDirectory(process.env), presetInput.source, presetInput.snapshot,
        )
      } catch (error) {
        io.stderr('Warning: snapshot cache was not saved after successful apply: ' +
          (error instanceof Error ? error.message : 'cache write failed'))
      }
    }
    emit('success')
    return 0
  } catch (cause) {
    const e =
      cause instanceof FoundationError
        ? cause
        : new FoundationError(
            'INTERNAL_ERROR',
            cause instanceof Error ? cause.message : 'Unexpected failure',
          )
    const record = {
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
    else
      io.stderr(
        e.code + ': ' + e.message + (e.path ? ' (' + e.path + ')' : '') +
        (e.code === 'RESOLUTION_FAILURE' || e.code === 'UNKNOWN_COMPONENT'
          ? '\nNext: ' + e.nextAction : ''),
      )
    return exits[e.code] ?? 1
  }
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
