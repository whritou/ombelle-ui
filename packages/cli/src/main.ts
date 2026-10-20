#!/usr/bin/env node
import fs from 'node:fs/promises'
import path from 'node:path'
import { pathToFileURL } from 'node:url'
import { createInterface } from 'node:readline/promises'
import {
  FoundationError,
  validatePreset,
  type ComponentId,
  type Preset,
} from '@ombelle/contracts'
import { compile } from '@ombelle/compiler'
import { inspectProject } from './project/inspect.js'
import { planAdd } from './plan/components.js'
import { planTheme } from './plan/theme.js'
import { applyPlan } from './apply/transaction.js'
import { formatPlan, planOutput } from './format.js'
const exits: Record<string, number> = {
  INVALID_DATA: 2,
  UNSUPPORTED_RELEASE: 3,
  UNSUPPORTED_PROJECT: 3,
  FILE_CONFLICT: 4,
  RESOLUTION_FAILURE: 5,
  DEPENDENCY_FAILURE: 6,
  INTERNAL_ERROR: 1,
}
const usage =
  'Ombelle foundation: init --preset <local.json> | add <button|dialog|input> | theme add <local.json> [--cwd <app>] [--package-manager <npm|pnpm|yarn>] [--dry-run] [--json] [--yes]'
export async function runCli(
  args: string[],
  io: { stdout(text: string): void; stderr(text: string): void },
): Promise<number> {
  const json = args.includes('--json')
  let command = args[0] ?? ''
  try {
    if (args.includes('--help')) {
      io.stdout(usage)
      return 0
    }
    const flags: Record<string, string | boolean> = {},
      positional: string[] = []
    for (let i = 0; i < args.length; i++) {
      const a = args[i]
      if (a.startsWith('--')) {
        if (['--json', '--yes', '--dry-run'].includes(a)) flags[a] = true
        else if (['--cwd', '--preset', '--package-manager'].includes(a)) {
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
    if (command === 'add' && flags['--preset'])
      throw new FoundationError(
        'INVALID_DATA',
        'Use theme add to change project defaults',
      )
    const selected = flags['--package-manager']
    if (
      selected !== undefined &&
      !['npm', 'pnpm', 'yarn'].includes(String(selected))
    )
      throw new FoundationError(
        'INVALID_DATA',
        'Choose npm, pnpm, or yarn for --package-manager',
      )
    const context = await inspectProject(
      path.resolve(String(flags['--cwd'] ?? process.cwd())),
      selected as 'npm' | 'pnpm' | 'yarn' | undefined,
    )
    let preset: Preset | unknown = context.preset
    if (command !== 'add') {
      const file = command === 'init' ? flags['--preset'] : positional[2]
      if (
        typeof file !== 'string' ||
        (command === 'theme' && positional.length !== 3)
      )
        throw new FoundationError(
          'INVALID_DATA',
          'Choose a local preset JSON file',
        )
      const presetPath = path.resolve(file)
      try {
        const stat = await fs.stat(presetPath)
        if (stat.size > 262144) throw new Error('Preset exceeds 256 KiB')
        preset = JSON.parse(await fs.readFile(presetPath, 'utf8'))
      } catch (e) {
        throw new FoundationError(
          'INVALID_DATA',
          e instanceof Error ? e.message : 'Cannot read preset',
          presetPath,
        )
      }
    } else if (!preset || !context.config || !context.lock)
      throw new FoundationError(
        'UNSUPPORTED_PROJECT',
        'Initialize a saved project preset first',
        context.root,
        'Run init --preset <local.json>.',
      )
    const ids = command === 'add' ? positional.slice(1) : []
    if (command === 'add' && !ids.length)
      throw new FoundationError('INVALID_DATA', 'Choose at least one component')
    const p = validatePreset(preset)
    const result = await compile({
      preset: p,
      componentIds: ids as ComponentId[],
      catalogRelease: p.catalogRelease,
      compilerVersion: p.compilerVersion,
    })
    const plan =
      command === 'add'
        ? await planAdd(context, result)
        : await planTheme(context, result)
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
      if (!process.stdin.isTTY)
        throw new FoundationError(
          'INVALID_DATA',
          'Noninteractive writes require --yes after reviewing --dry-run',
        )
      io.stderr(formatPlan(command, 'planned', plan))
      const prompt = createInterface({
        input: process.stdin,
        output: process.stderr,
      })
      let answer: string
      try {
        answer = await prompt.question('Apply these changes? [y/N] ')
      } finally {
        prompt.close()
      }
      if (!/^y(?:es)?$/i.test(answer.trim())) {
        emit('cancelled')
        return 0
      }
    }
    await applyPlan(plan)
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
      io.stderr(e.code + ': ' + e.message + (e.path ? ' (' + e.path + ')' : ''))
    return exits[e.code] ?? 1
  }
}
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href)
  process.exitCode = await runCli(process.argv.slice(2), {
    stdout: (text) => process.stdout.write(text + '\n'),
    stderr: (text) => process.stderr.write(text + '\n'),
  })
