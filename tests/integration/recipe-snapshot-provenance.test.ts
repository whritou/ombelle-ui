import fs from 'node:fs/promises'
import path from 'node:path'
import { afterEach, expect, it } from 'vitest'
import { getCatalog } from '@ombelle/catalog'
import { canonicalize } from '@ombelle/compiler'
import { createProject } from '../helpers/projects.js'
import { snapshotTree } from '../helpers/tree.js'
import { runCli } from '../../packages/cli/src/main.js'
import { inspectProject } from '../../packages/cli/src/project/inspect.js'
import example from '../../examples/recipe.example.json'

const roots: string[] = []
afterEach(async () => { for (const root of roots.splice(0)) await fs.rm(root, { recursive: true, force: true }) })
async function run(root: string, args: string[]) {
  let output = ''
  const code = await runCli([...args, '--cwd', root, '--json', '--yes'], { stdout: text => { output += text }, stderr: text => { output += text } })
  expect(code, output).toBe(0)
  return JSON.parse(output)
}
async function setup() {
  const root = await createProject('vite'); roots.push(root)
  const pkgFile = path.join(root, 'package.json'), pkg = JSON.parse(await fs.readFile(pkgFile, 'utf8'))
  for (const template of Object.values(getCatalog('0.1.0').templates))
    for (const dep of template.dependencies) pkg.dependencies[dep.name] = dep.version
  await fs.writeFile(pkgFile, JSON.stringify(pkg))
  await run(root, ['init', '--preset', path.resolve('examples/preset.example.json')])
  await run(root, ['add', '--recipe', path.resolve('examples/recipe.example.json')])
  const lockFile = path.join(root, 'ui-library.lock.json'), lock = JSON.parse(await fs.readFile(lockFile, 'utf8'))
  const key = example.id + '@' + example.revision
  lock.recipeSources = { [key]: { origin: 'https://ombelle-ui.vercel.app', reference: 'rc_' + 'a'.repeat(32) + '@1', recipeHash: lock.recipes[key].recipe.hash } }
  await fs.writeFile(lockFile, canonicalize(lock) + '\n')
  return { root, lockFile, lock, key }
}
it.each([
  ['add', 'card'], ['init', '--preset', path.resolve('examples/preset.example.json')],
  ['theme', 'add', path.resolve('packages/catalog/src/presets/minimalist.json')],
  ['add', 'button', '--preset', path.resolve('examples/preset.example.json')],
  ['add', '--recipe', path.resolve('examples/recipe.example.json')],
])('retains recipe sources through unrelated lock writer %j', async (...args) => {
  const context = await setup()
  await run(context.root, args)
  const after = JSON.parse(await fs.readFile(context.lockFile, 'utf8'))
  expect(after.recipeSources).toEqual(context.lock.recipeSources)
})
it.each(['orphan', 'wrong-hash', 'extra-field', 'wrong-kind', 'invalid-map'])('rejects %s recipe sources before planning without mutations', async kind => {
  const { root, lockFile, lock, key } = await setup()
  if (kind === 'orphan') lock.recipeSources = { 'rc_missing@1': lock.recipeSources[key] }
  if (kind === 'wrong-hash') lock.recipeSources[key].recipeHash = 'f'.repeat(64)
  if (kind === 'extra-field') lock.recipeSources[key].extra = true
  if (kind === 'wrong-kind') lock.recipeSources[key].reference = 'ps_' + 'a'.repeat(32) + '@1'
  if (kind === 'invalid-map') lock.recipeSources = []
  await fs.writeFile(lockFile, JSON.stringify(lock))
  const before = await snapshotTree(root)
  await expect(inspectProject(root)).rejects.toMatchObject({ code: 'UNSUPPORTED_PROJECT', path: '/recipeSources' })
  expect(await snapshotTree(root)).toEqual(before)
})
