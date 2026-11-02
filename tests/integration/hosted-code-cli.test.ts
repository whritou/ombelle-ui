import { afterEach, expect, it } from 'vitest'
import { randomUUID } from 'node:crypto'
import { spawn } from 'node:child_process'
import { createServer } from 'node:http'
import { pathToFileURL } from 'node:url'
import fs from 'node:fs/promises'
import path from 'node:path'
import { tmpdir } from 'node:os'
import { getCatalog } from '@ombelle/catalog'
import type { RecipeSnapshot, PresetSnapshot } from '@ombelle/contracts'
import recipe from '../../examples/recipe.example.json'
import { startSnapshotService } from '../helpers/snapshot-service.js'
import { createProject } from '../helpers/projects.js'
import { snapshotTree } from '../helpers/tree.js'

const cleanups: Array<() => Promise<unknown>> = []
afterEach(async () => { for (const close of cleanups.splice(0).reverse()) await close() })
async function setup(manager: 'pnpm' | 'npm' | 'yarn' | 'bun' = 'pnpm') {
  const service = await startSnapshotService()
  const close = service.close; let closed = false
  service.close = async () => { if (!closed) { closed = true; await close() } }
  cleanups.push(service.close)
  const root = await createProject('vite'), cacheParent = await fs.mkdtemp(path.join(tmpdir(), 'ombelle-hosted-cli-'))
  cleanups.push(() => fs.rm(root, { recursive: true, force: true }), () => fs.rm(cacheParent, { recursive: true, force: true }))
  const pkgFile = path.join(root, 'package.json'), pkg = JSON.parse(await fs.readFile(pkgFile, 'utf8'))
  for (const template of Object.values(getCatalog('0.1.0').templates))
    for (const dependency of template.dependencies) pkg.dependencies[dependency.name] = dependency.version
  pkg.packageManager = { pnpm: 'pnpm@11.25.0', npm: 'npm@11.19.0', yarn: 'yarn@4.18.1', bun: 'bun@1.4.3' }[manager]
  await fs.writeFile(pkgFile, JSON.stringify(pkg))
  if (manager !== 'pnpm') {
    await fs.rm(path.join(root, 'pnpm-lock.yaml'))
    await fs.writeFile(path.join(root, { npm: 'package-lock.json', yarn: 'yarn.lock', bun: 'bun.lock' }[manager]), manager === 'npm' ? '{}' : '')
  }
  const publish = async (kind: 'preset' | 'recipe', value: unknown) => {
    const response = await fetch(service.origin + '/api/v1/' + (kind === 'preset' ? 'presets' : 'recipes'), { method: 'POST', body: JSON.stringify({ [kind]: value }), headers: { Origin: service.origin, 'Content-Type': 'application/json', 'Idempotency-Key': randomUUID() } })
    expect(response.status).toBe(201)
    return response.json()
  }
  const preset = await publish('preset', getCatalog('0.1.0').presets.flat) as PresetSnapshot
  const recipeSnapshot = await publish('recipe', recipe) as RecipeSnapshot
  const cacheRoot = path.join(cacheParent, 'cache')
  const run = (args: string[], cache = cacheRoot) => new Promise<{ code: number | null; output: string; stderr: string; data: any }>((resolveResult, reject) => {
    const child = spawn(process.execPath, ['--import', pathToFileURL(path.resolve('tests/helpers/official-snapshot-transport.mjs')).href, path.resolve('packages/cli/dist/main.js'), ...args, '--cwd', root, '--json'], { windowsHide: true, env: { ...process.env, OMBELLE_TEST_SNAPSHOT_ORIGIN: service.origin, OMBELLE_SNAPSHOT_CACHE_DIR: cache } })
    let output = '', stderr = ''
    child.stdout.on('data', data => { output += data }); child.stderr.on('data', data => { stderr += data })
    child.on('error', reject); child.on('close', code => { try { resolveResult({ code, output, stderr, data: JSON.parse(output) }) } catch (error) { reject(error) } })
  })
  const lockFile = path.join(root, 'ui-library.lock.json')
  return { root, service, preset, recipeSnapshot, publish, cacheRoot, cacheParent, run, lockFile, lock: async () => JSON.parse(await fs.readFile(lockFile, 'utf8')) }
}

it('plans official code-only preset and recipe installs without writing project or cache files', async () => {
  const context = await setup()
  const before = await snapshotTree(context.root)
  const dry = await context.run(['init', '--preset', context.preset.id + '@1', '--dry-run'])
  expect(dry.code, dry.output + dry.stderr).toBe(0)
  expect(dry.data.presetResolution.source).toEqual({ origin: 'https://ombelle-ui.vercel.app', reference: context.preset.id + '@1', presetHash: context.preset.presetHash })
  expect(await snapshotTree(context.root)).toEqual(before)
  expect(await fs.readdir(context.cacheParent)).toEqual([])
  expect((await context.run(['init', '--preset', path.resolve('examples/preset.example.json'), '--yes'])).code).toBe(0)
  const initialized = await snapshotTree(context.root)
  const recipeDry = await context.run(['add', '--recipe', context.recipeSnapshot.id + '@1', '--dry-run'])
  expect(recipeDry.code, recipeDry.output + recipeDry.stderr).toBe(0)
  expect(recipeDry.data.recipeResolution.source.recipeHash).toBe(context.recipeSnapshot.recipeHash)
  expect(await snapshotTree(context.root)).toEqual(initialized)
  expect(await fs.readdir(context.cacheParent)).toEqual([])
})
it.each(['pnpm', 'npm', 'yarn', 'bun'] as const)('preserves defaults and remote recipe provenance through later offline additions with %s metadata', async manager => {
  const context = await setup(manager)
  const initialized = await context.run(['init', '--preset', context.preset.id + '@1', '--yes'])
  expect(initialized.code, initialized.output + initialized.stderr).toBe(0)
  const before = await fs.readFile(path.join(context.root, 'ui-preset.json'), 'utf8')
  const installed = await context.run(['add', '--recipe', context.recipeSnapshot.id + '@1', '--yes'])
  expect(installed.code, installed.output + installed.stderr).toBe(0)
  const first = await context.lock(), key = recipe.id + '@' + recipe.revision
  expect(first.recipeSources[key]).toEqual({ origin: 'https://ombelle-ui.vercel.app', reference: context.recipeSnapshot.id + '@1', recipeHash: context.recipeSnapshot.recipeHash })
  expect(await fs.readFile(path.join(context.root, 'ui-preset.json'), 'utf8')).toBe(before)
  await context.service.close()
  const later = await context.run(['add', 'input', '--yes'])
  expect(later.code, later.output + later.stderr).toBe(0)
  expect((await context.lock()).recipeSources).toEqual(first.recipeSources)
  expect((await context.lock()).presetSource).toEqual(first.presetSource)
})
it('keeps first recipe provenance on matching local or other-code installs and through a theme merge', async () => {
  const context = await setup(), duplicate = await context.publish('recipe', recipe) as RecipeSnapshot
  expect((await context.run(['init', '--preset', context.preset.id + '@1', '--yes'])).code).toBe(0)
  expect((await context.run(['add', '--recipe', context.recipeSnapshot.id + '@1', '--yes'])).code).toBe(0)
  const before = await context.lock()
  for (const input of [path.resolve('examples/recipe.example.json'), duplicate.id + '@1']) {
    const result = await context.run(['add', '--recipe', input, '--yes'])
    expect(result.code, result.output + result.stderr).toBe(0)
    expect(result.data.changes.every((change: { action: string }) => change.action === 'noop')).toBe(true)
    expect((await context.lock()).recipeSources).toEqual(before.recipeSources)
  }
  expect((await context.run(['theme', 'add', path.resolve('packages/catalog/src/presets/minimalist.json'), '--yes'])).code).toBe(0)
  expect((await context.lock()).recipeSources).toEqual(before.recipeSources)
})
it('does not use a new publication code to bypass an existing recipe identity conflict', async () => {
  const context = await setup(), second = await context.publish('recipe', { ...recipe, content: 'Changed under the same embedded identity' }) as RecipeSnapshot
  expect((await context.run(['init', '--preset', path.resolve('examples/preset.example.json'), '--yes'])).code).toBe(0)
  expect((await context.run(['add', '--recipe', context.recipeSnapshot.id + '@1', '--yes'])).code).toBe(0)
  const before = await snapshotTree(context.root)
  const conflict = await context.run(['add', '--recipe', second.id + '@1', '--yes'])
  expect(conflict.code, conflict.output + conflict.stderr).toBe(4)
  expect(await snapshotTree(context.root)).toEqual(before)
})
it('rejects orphaned and wrong-hash recipe source maps before another plan is used', async () => {
  const context = await setup()
  expect((await context.run(['init', '--preset', path.resolve('examples/preset.example.json'), '--yes'])).code).toBe(0)
  expect((await context.run(['add', '--recipe', context.recipeSnapshot.id + '@1', '--yes'])).code).toBe(0)
  const lock = await context.lock(), key = recipe.id + '@' + recipe.revision
  for (const recipeSources of [{ orphan: lock.recipeSources[key] }, { [key]: { ...lock.recipeSources[key], recipeHash: 'f'.repeat(64) } }]) {
    await fs.writeFile(context.lockFile, JSON.stringify({ ...lock, recipeSources }))
    const result = await context.run(['add', 'input', '--dry-run'])
    expect(result.code, result.output + result.stderr).toBe(3)
    expect(result.data.error.code).toBe('UNSUPPORTED_PROJECT')
  }
})
it('applies the recipe fetched once and warns about cache failure after successful apply', async () => {
  const context = await setup()
  expect((await context.run(['init', '--preset', path.resolve('examples/preset.example.json'), '--yes'])).code).toBe(0)
  let requests = 0
  const server = createServer((_, response) => {
    requests++
    response.setHeader('Content-Type', 'application/json')
    if (requests > 1) { response.statusCode = 410; response.end(); return }
    response.end(JSON.stringify(context.recipeSnapshot))
  })
  await new Promise<void>(resolve => server.listen(0, '127.0.0.1', resolve))
  cleanups.push(async () => { server.closeAllConnections(); await new Promise<void>(resolve => server.close(() => resolve())) })
  const origin = 'http://127.0.0.1:' + (server.address() as { port: number }).port
  const result = await context.run(['add', '--recipe', context.recipeSnapshot.id + '@1', '--snapshot-origin', origin, '--recipe-hash', context.recipeSnapshot.recipeHash, '--yes'], 'invalid-relative-cache')
  expect(result.code, result.output + result.stderr).toBe(0)
  expect(result.data.status).toBe('success')
  expect(result.stderr).toMatch(/Warning: recipe snapshot cache.*successful apply/i)
  expect(requests).toBe(1)
  expect((await context.lock()).recipeSources[recipe.id + '@' + recipe.revision].origin).toBe(origin)
})
