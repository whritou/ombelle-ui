import { afterEach, expect, it } from 'vitest'
import fs from 'node:fs/promises'
import path from 'node:path'
import { getCatalog } from '@ombelle/catalog'
import { createProject } from '../helpers/projects.js'
import { runBuiltCli, jsonRecord } from '../helpers/cli-runtime.js'
import { snapshotTree } from '../helpers/tree.js'
import example from '../../examples/recipe.example.json'
const roots: string[] = []
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
  for (const d of getCatalog('0.1.0').templates.button.dependencies)
    pkg.dependencies[d.name] = d.version
  await fs.writeFile(path.join(root, 'package.json'), JSON.stringify(pkg))
  const init = await runBuiltCli(
    'node',
    [
      'init',
      '--preset',
      path.resolve('packages/catalog/src/presets/minimalist.json'),
      '--yes',
      '--json',
    ],
    root,
  )
  expect(init.code, init.output).toBe(0)
  await fs.writeFile(
    path.join(root, 'button.recipe.json'),
    JSON.stringify(example),
  )
  return { root, init }
}
it('supports local recipe dry-run installation and no-op under Node and Bun', async () => {
  for (const runtime of ['node', 'bun'] as const) {
    const { root, init } = await setup(),
      args = [
        'add',
        '--recipe',
        './button.recipe.json',
        '--cwd',
        root,
        '--json',
      ],
      before = await snapshotTree(root)
    const dry = await runBuiltCli(runtime, [...args, '--dry-run'], root)
    expect(dry.code, dry.output).toBe(0)
    expect(await snapshotTree(root)).toEqual(before)
    const done = await runBuiltCli(runtime, [...args, '--yes'], root),
      data = jsonRecord(done.data)
    expect(done.code, done.output).toBe(0)
    expect(data.presetHash).toBe(jsonRecord(init.data).presetHash)
    expect(data.recipe).toMatchObject({
      scopeType: 'component',
      importPath: '@/components/ui/recipes/rc_primary-button/r2/button',
    })
    const repeat = await runBuiltCli(runtime, [...args, '--yes'], root)
    expect(repeat.code, repeat.output).toBe(0)
    expect(
      (jsonRecord(repeat.data).changes as { action: string }[]).every(
        (c) => c.action === 'noop',
      ),
    ).toBe(true)
    await fs.writeFile(
      path.join(root, 'button.recipe.json'),
      JSON.stringify({ ...example, content: 'changed' }),
    )
    expect((await runBuiltCli(runtime, [...args, '--yes'], root)).code).toBe(4)
  }
})
it.each([
  ['add', 'button', '--recipe', 'button.recipe.json'],
  ['add', '--recipe'],
  ['add', '--recipe', 'button.recipe.json', '--recipe', 'button.recipe.json'],
  ['add', '--recipe', 'button.recipe.json', '--preset', 'x'],
  ['init', '--recipe', 'button.recipe.json'],
])('rejects invalid recipe grammar %j', async (...args) => {
  const { root } = await setup(),
    before = await snapshotTree(root)
  expect((await runBuiltCli('node', [...args, '--json'], root)).code).toBe(2)
  expect(await snapshotTree(root)).toEqual(before)
})
it('rejects uninitialized projects and unresolved built-ins before writes', async () => {
  const root = await createProject('vite')
  roots.push(root)
  await fs.writeFile(path.join(root, 'recipe.json'), JSON.stringify(example))
  expect(
    (
      await runBuiltCli(
        'node',
        ['add', '--recipe', 'recipe.json', '--yes', '--json'],
        root,
      )
    ).code,
  ).toBe(3)
  const initialized = await setup()
  await fs.writeFile(
    path.join(initialized.root, 'button.recipe.json'),
    JSON.stringify({
      ...example,
      presetRef: { ...example.presetRef, revision: 2 },
    }),
  )
  expect(
    (
      await runBuiltCli(
        'node',
        ['add', '--recipe', 'button.recipe.json', '--yes', '--json'],
        initialized.root,
      )
    ).code,
  ).toBe(5)
})
