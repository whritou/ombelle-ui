import { afterEach, expect, it } from 'vitest'
import fs from 'node:fs/promises'
import path from 'node:path'
import { getCatalog } from '@ombelle/catalog'
import { createProject } from '../helpers/projects.js'
import { runBuiltCli, jsonRecord } from '../helpers/cli-runtime.js'
import { snapshotTree } from '../helpers/tree.js'
import { runCli } from '../../packages/cli/src/main.js'
const roots: string[] = []
const localPreset = path.resolve('packages/catalog/src/presets/minimalist.json')
afterEach(async () => {
  for (const root of roots.splice(0))
    await fs.rm(root, { recursive: true, force: true })
})
async function setup() {
  const root = await createProject('vite')
  roots.push(root)
  const pkg = JSON.parse(
    await fs.readFile(path.join(root, 'package.json'), 'utf8'),
  )
  for (const id of ['button', 'input'] as const)
    for (const d of getCatalog('0.1.0').templates[id].dependencies)
      pkg.dependencies[d.name] = d.version
  await fs.writeFile(path.join(root, 'package.json'), JSON.stringify(pkg))
  const init = await runBuiltCli(
    'node',
    [
      'init',
      '--preset',
      path.resolve('examples/preset.example.json'),
      '--yes',
      '--json',
    ],
    root,
  )
  expect(init.code, init.output).toBe(0)
  return { root, init }
}
it.each(['node', 'bun'] as const)(
  'installs a component-only preset under %s and preserves global defaults',
  async (runtime) => {
    const { root, init } = await setup()
    const ordinary = await runBuiltCli(
      runtime,
      ['add', 'button', '--yes', '--json'],
      root,
    )
    expect(ordinary.code, ordinary.output).toBe(0)
    const args = ['add', 'button', '--preset', localPreset, '--json']
    const before = await snapshotTree(root)
    const dry = await runBuiltCli(runtime, [...args, '--dry-run'], root)
    expect(dry.code, dry.output).toBe(0)
    expect(await snapshotTree(root)).toEqual(before)
    const done = await runBuiltCli(runtime, [...args, '--yes'], root),
      data = jsonRecord(done.data)
    expect(done.code, done.output).toBe(0)
    const after = await snapshotTree(root)
    for (const [file, hash] of Object.entries(before))
      if (file !== 'ui-library.lock.json') expect(after[file], file).toBe(hash)
    expect(data.presetHash).toBe(jsonRecord(init.data).presetHash)
    expect(data.componentPreset).toMatchObject({
      scopeType: 'component',
      importPath: '@/components/ui/presets/builtin-minimalist/r1/button',
      examplePath: expect.stringContaining(
        'examples/presets/builtin-minimalist/r1.tsx',
      ),
      scope: expect.any(String),
      preset: { data: { id: 'builtin-minimalist', revision: 1 } },
    })
    const repeat = await runBuiltCli(runtime, [...args, '--yes'], root)
    expect(repeat.code, repeat.output).toBe(0)
    expect(
      (jsonRecord(repeat.data).changes as { action: string }[]).every(
        (c) => c.action === 'noop',
      ),
    ).toBe(true)
    const add = await runBuiltCli(
      runtime,
      ['add', 'input', '--yes', '--json'],
      root,
    )
    expect(add.code, add.output).toBe(0)
    expect(jsonRecord(add.data).presetHash).toBe(
      jsonRecord(init.data).presetHash,
    )
    const lock = JSON.parse(
      await fs.readFile(path.join(root, 'ui-library.lock.json'), 'utf8'),
    )
    expect(lock.componentPresets['builtin-minimalist@1']).toBeDefined()
    await fs.appendFile(
      path.join(
        root,
        'src/components/ui/presets/builtin-minimalist/r1/button.tsx',
      ),
      '\n// edited\n',
    )
    const edited = await snapshotTree(root)
    expect((await runBuiltCli(runtime, [...args, '--yes'], root)).code).toBe(4)
    expect(await snapshotTree(root)).toEqual(edited)
  },
)
it('resolves the preset from the invoking directory independently of --cwd', async () => {
  const { root } = await setup(),
    caller = await createProject('vite')
  roots.push(caller)
  await fs.copyFile(localPreset, path.join(caller, 'local.json'))
  const result = await runBuiltCli(
    'node',
    [
      'add',
      'button',
      '--preset',
      './local.json',
      '--cwd',
      root,
      '--json',
      '--dry-run',
    ],
    caller,
  )
  expect(result.code, result.output).toBe(0)
})
it('labels identity, scope, import and usage paths in human-readable plans', async () => {
  const { root } = await setup(),
    output: string[] = []
  expect(
    await runCli(
      ['add', 'button', '--preset', localPreset, '--cwd', root, '--dry-run'],
      {
        stdout: (text) => output.push(text),
        stderr: (text) => output.push(text),
      },
    ),
  ).toBe(0)
  expect(output.join('\n')).toContain(
    'Preset builtin-minimalist@1 (component only)',
  )
  expect(output.join('\n')).toContain(
    'Import: @/components/ui/presets/builtin-minimalist/r1/button',
  )
  expect(output.join('\n')).toContain(
    'Usage: src/ombelle-examples/presets/builtin-minimalist/r1.tsx',
  )
  expect(output.join('\n')).toMatch(/Scope: [a-f0-9]{64}/)
})
it('rejects invalid preset data before writes and requires initialization', async () => {
  const { root } = await setup(),
    file = path.join(root, 'bad.json')
  for (const content of ['{', '{}', ' '.repeat(262145)]) {
    await fs.writeFile(file, content)
    const before = await snapshotTree(root)
    expect(
      (
        await runBuiltCli(
          'node',
          ['add', 'button', '--preset', file, '--yes', '--json'],
          root,
        )
      ).code,
    ).toBe(2)
    expect(await snapshotTree(root)).toEqual(before)
  }
  const fresh = await createProject('vite')
  roots.push(fresh)
  const before = await snapshotTree(fresh)
  expect(
    (
      await runBuiltCli(
        'node',
        ['add', 'button', '--preset', localPreset, '--yes', '--json'],
        fresh,
      )
    ).code,
  ).toBe(3)
  expect(await snapshotTree(fresh)).toEqual(before)
})
it.each([
  ['add', 'button', '--preset'],
  ['add', 'button', '--preset', 'missing.json'],
  ['add', 'input', '--preset', localPreset],
  ['add', 'button', 'input', '--preset', localPreset],
  ['add', '--preset', localPreset],
  ['add', 'button', '--preset', 'https://example.com/preset.json'],
  ['add', 'button', '--preset', 'builtin-minimalist@1'],
  ['add', 'button', '--preset', localPreset, '--preset', localPreset],
  ['add', 'button', '--preset', localPreset, '--recipe', 'recipe.json'],
])('rejects invalid preset invocation %j without mutation', async (...args) => {
  const { root } = await setup(),
    before = await snapshotTree(root)
  expect(
    (await runBuiltCli('node', [...args, '--yes', '--json'], root)).code,
  ).toBe(2)
  expect(await snapshotTree(root)).toEqual(before)
})
