import { afterEach, expect, it } from 'vitest'
import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { getCatalog } from '@ombelle/catalog'
import { createProject } from '../helpers/projects.js'
import {
  jsonRecord,
  runBuiltCli,
  runtimeIdentity,
} from '../helpers/cli-runtime.js'
import { runNative } from '../helpers/bun-command.js'
import { snapshotTree } from '../helpers/tree.js'

const roots: string[] = []
const preset = getCatalog('0.1.0').presets.flat

afterEach(async () => {
  for (const root of roots.splice(0))
    await fs.rm(root, { recursive: true, force: true })
})

async function setup() {
  const caller = await fs.mkdtemp(path.join(os.tmpdir(), 'ombelle-caller-'))
  const root = await createProject('vite')
  roots.push(caller, root)
  const file = path.join(caller, 'local-preset.json')
  await fs.writeFile(file, JSON.stringify(preset))
  const initialized = await runBuiltCli(
    'node',
    [
      'init',
      '--preset',
      path.resolve('examples/preset.example.json'),
      '--cwd',
      root,
      '--yes',
      '--json',
    ],
    caller,
  )
  expect(initialized.code, initialized.output).toBe(0)
  return { caller, root, presetFile: './local-preset.json', initialized }
}

async function runHumanPlan(
  runtime: 'node' | 'bun',
  args: string[],
  caller: string,
) {
  const identity = await runtimeIdentity(runtime)
  return runNative(
    identity.executable,
    [path.resolve('packages/cli/dist/main.js'), ...args],
    caller,
  )
}

it('installs one local Button preset without changing global defaults or ordinary components under Node and Bun', async () => {
  for (const runtime of ['node', 'bun'] as const) {
    const { caller, root, presetFile, initialized } = await setup()
    const initData = jsonRecord(initialized.data)
    const defaultsBefore = await fs.readFile(
      path.join(root, 'ui-preset.json'),
      'utf8',
    )
    const initialButton = await runBuiltCli(
      'node',
      ['add', 'button', '--cwd', root, '--yes', '--json'],
      caller,
    )
    expect(initialButton.code, initialButton.output).toBe(0)
    const ordinaryButton = await fs.readFile(
      path.join(root, 'src/components/ui/button.tsx'),
      'utf8',
    )
    const before = await snapshotTree(root)
    const args = [
      'add',
      'button',
      '--preset',
      presetFile,
      '--cwd',
      root,
      '--json',
    ]

    const dry = await runBuiltCli(runtime, [...args, '--dry-run'], caller)
    const dryData = jsonRecord(dry.data)
    const componentPreset = dryData.componentPreset as Record<
      string,
      unknown
    >
    expect(dry.code, dry.output).toBe(0)
    expect(dryData.componentPreset).toMatchObject({
      scopeType: 'component-only',
      preset: { data: { id: 'builtin-flat', revision: 1 } },
      importPath: '@/components/ui/presets/builtin-flat/r1/button',
      examplePath: 'src/ombelle-examples/presets/builtin-flat/r1.tsx',
    })
    expect(componentPreset.scope).toMatch(/^[a-f0-9]{64}$/)
    expect(await snapshotTree(root)).toEqual(before)

    if (runtime === 'node') {
      const human = await runHumanPlan(
        runtime,
        [
          'add',
          'button',
          '--preset',
          presetFile,
          '--cwd',
          root,
          '--dry-run',
        ],
        caller,
      )
      expect(human.code, human.output).toBe(0)
      expect(human.output).toContain(
        'Component preset builtin-flat@1 (component only)',
      )
      expect(human.output).toContain('Scope: ' + componentPreset.scope)
      expect(human.output).toContain(
        'Import: @/components/ui/presets/builtin-flat/r1/button',
      )
      expect(human.output).toContain(
        'Usage: src/ombelle-examples/presets/builtin-flat/r1.tsx',
      )
      expect(await snapshotTree(root)).toEqual(before)
    }

    const installed = await runBuiltCli(runtime, [...args, '--yes'], caller)
    const installedData = jsonRecord(installed.data)
    expect(installed.code, installed.output).toBe(0)
    expect(
      (installedData.componentPreset as Record<string, unknown>).scope,
    ).toBe(componentPreset.scope)
    const repeat = await runBuiltCli(runtime, [...args, '--yes'], caller)
    expect(repeat.code, repeat.output).toBe(0)
    expect(
      (jsonRecord(repeat.data).changes as { action: string }[]).every(
        (change) => change.action === 'noop',
      ),
    ).toBe(true)
    expect(await fs.readFile(path.join(root, 'ui-preset.json'), 'utf8')).toBe(
      defaultsBefore,
    )
    expect(
      await fs.readFile(
        path.join(root, 'src/components/ui/button.tsx'),
        'utf8',
      ),
    ).toBe(ordinaryButton)

    const next = await runBuiltCli(
      runtime,
      ['add', 'input', '--cwd', root, '--yes', '--json'],
      caller,
    )
    expect(next.code, next.output).toBe(0)
    expect(jsonRecord(next.data).presetHash).toBe(initData.presetHash)
    const lock = JSON.parse(
      await fs.readFile(path.join(root, 'ui-library.lock.json'), 'utf8'),
    )
    expect(lock.presetHash).toBe(initData.presetHash)
    expect(lock.componentPresets['builtin-flat@1'].scope).toBe(
      componentPreset.scope,
    )
  }
}, 180000)

it.each([
  ['add', 'button', '--preset'],
  ['add', 'button', '--preset', 'builtin-flat@1'],
  ['add', 'input', '--preset', './local-preset.json'],
  ['add', 'button', 'input', '--preset', './local-preset.json'],
  [
    'add',
    'button',
    '--preset',
    './local-preset.json',
    '--preset',
    './local-preset.json',
  ],
  [
    'add',
    'button',
    '--preset',
    './local-preset.json',
    '--recipe',
    './button.recipe.json',
  ],
])('rejects invalid local Button preset grammar %j without mutation', async (...args) => {
  const { caller, root } = await setup()
  const before = await snapshotTree(root)

  const result = await runBuiltCli(
    'node',
    [...args, '--cwd', root, '--yes', '--json'],
    caller,
  )

  expect(result.code, result.output).toBe(2)
  expect(jsonRecord(result.data).status).toBe('error')
  expect(await snapshotTree(root)).toEqual(before)
})

it('rejects an invalid preset file before mutating the initialized project', async () => {
  const { caller, root } = await setup()
  await fs.writeFile(
    path.join(caller, 'invalid.json'),
    JSON.stringify({ platform: 'react-web' }),
  )
  const before = await snapshotTree(root)

  const result = await runBuiltCli(
    'node',
    [
      'add',
      'button',
      '--preset',
      './invalid.json',
      '--cwd',
      root,
      '--yes',
      '--json',
    ],
    caller,
  )

  expect(result.code).toBe(2)
  expect(await snapshotTree(root)).toEqual(before)
})

it('conflicts instead of overwriting an edited scoped Button artifact', async () => {
  const { caller, root, presetFile } = await setup()
  const args = [
    'add',
    'button',
    '--preset',
    presetFile,
    '--cwd',
    root,
    '--yes',
    '--json',
  ]
  const installed = await runBuiltCli('node', args, caller)
  expect(installed.code, installed.output).toBe(0)
  const source = path.join(
    root,
    'src/components/ui/presets/builtin-flat/r1/button.tsx',
  )
  await fs.appendFile(source, '\n// local edit\n')
  const before = await snapshotTree(root)

  const conflict = await runBuiltCli('node', args, caller)

  expect(conflict.code).toBe(4)
  expect(await snapshotTree(root)).toEqual(before)
}, 120000)
