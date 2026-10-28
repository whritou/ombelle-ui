import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { randomUUID } from 'node:crypto'
import { spawn } from 'node:child_process'
import { afterEach, expect, it } from 'vitest'
import { getCatalog } from '@ombelle/catalog'
import type { Preset, PresetSnapshot } from '@ombelle/contracts'
import { startSnapshotService } from '../helpers/snapshot-service.js'
import { createProject } from '../helpers/projects.js'
import { snapshotTree } from '../helpers/tree.js'
import { readSnapshotCache } from '../../packages/cli/src/snapshots/cache.js'

const cleanup: (() => Promise<unknown>)[] = []
const local = path.resolve('examples/preset.example.json')
const cli = path.resolve('packages/cli/dist/main.js')
afterEach(async () => { for (const close of cleanup.splice(0).reverse()) await close() })
async function setup(manager: 'pnpm' | 'npm' | 'yarn' | 'bun' = 'pnpm') {
  const service = await startSnapshotService()
  const closeService = service.close
  let closed = false
  service.close = async () => { if (!closed) { closed = true; await closeService() } }
  cleanup.push(service.close)
  const root = await createProject('vite')
  const cacheParent = await fs.mkdtemp(path.join(os.tmpdir(), 'ombelle-provenance-'))
  cleanup.push(() => fs.rm(root, { recursive: true, force: true }), () => fs.rm(cacheParent, { recursive: true, force: true }))
  const cacheRoot = path.join(cacheParent, 'cache')
  const pkgFile = path.join(root, 'package.json')
  const pkg = JSON.parse(await fs.readFile(pkgFile, 'utf8'))
  const catalog = getCatalog('0.1.0')
  for (const template of Object.values(catalog.templates)) for (const dep of template.dependencies) pkg.dependencies[dep.name] = dep.version
  pkg.packageManager = { pnpm: 'pnpm@11.25.0', npm: 'npm@11.6.0', yarn: 'yarn@4.9.2', bun: 'bun@1.4.3' }[manager]
  await fs.writeFile(pkgFile, JSON.stringify(pkg))
  if (manager !== 'pnpm') {
    await fs.rm(path.join(root, 'pnpm-lock.yaml'))
    await fs.writeFile(path.join(root, { npm: 'package-lock.json', yarn: 'yarn.lock', bun: 'bun.lock' }[manager]), manager === 'npm' ? '{}' : '')
  }
  const publish = async (preset: Preset = catalog.presets.flat) => {
    const response = await fetch(service.origin + '/api/v1/presets', { method: 'POST', headers: { Origin: service.origin, 'Content-Type': 'application/json', 'Idempotency-Key': randomUUID() }, body: JSON.stringify({ preset }) })
    expect(response.status).toBe(201)
    return await response.json() as PresetSnapshot
  }
  const snapshot = await publish()
  const source = (s = snapshot) => ({ origin: service.origin, reference: s.id + '@1', presetHash: s.presetHash })
  const remote = (s = snapshot) => [s.id + '@1', '--snapshot-origin', service.origin, '--preset-hash', s.presetHash]
  const run = (args: string[], cache = cacheRoot, env: NodeJS.ProcessEnv = {}) => new Promise<{ code: number | null; output: string; stderr: string; data: any }>((resolve, reject) => {
    const child = spawn(process.execPath, [cli, ...args, '--cwd', root, '--json'], { windowsHide: true, env: { ...process.env, OMBELLE_SNAPSHOT_CACHE_DIR: cache, ...env } })
    let output = '', stderr = ''
    child.stdout.on('data', bytes => { output += bytes }); child.stderr.on('data', bytes => { stderr += bytes })
    child.on('error', reject); child.on('close', code => { try { resolve({ code, output, stderr, data: JSON.parse(output) }) } catch (error) { reject(error) } })
  })
  const lockFile = path.join(root, 'ui-library.lock.json')
  const lock = async () => JSON.parse(await fs.readFile(lockFile, 'utf8'))
  return { root, cacheParent, cacheRoot, service, snapshot, publish, source, remote, run, lock, lockFile }
}
it.each(['pnpm', 'npm', 'yarn', 'bun'] as const)('retains remote global source through fresh-process adds and recipes with %s metadata', async manager => {
  const { root, source, remote, run, lock, cacheRoot, snapshot, service } = await setup(manager)
  let result = await run(['init', '--preset', ...remote(), '--yes'])
  expect(result.code, result.output + result.stderr).toBe(0)
  const initialized = await lock()
  expect(initialized.presetSource).toEqual(source())
  expect(await readSnapshotCache(cacheRoot, source())).toEqual(snapshot)
  await service.close()
  result = await run(['add', 'card', '--yes'])
  expect(result.code, result.output + result.stderr).toBe(0)
  expect((await lock()).presetSource).toEqual(initialized.presetSource)
  const recipe = path.resolve('examples/recipe.example.json')
  result = await run(['add', '--recipe', recipe, '--yes'])
  expect(result.code, result.output + result.stderr).toBe(0)
  expect((await lock()).presetSource).toEqual(initialized.presetSource)
  expect(await fs.readFile(path.join(root, 'ui-preset.json'), 'utf8')).toContain(snapshot.preset.id)
})
it('two codes with one embedded identity do not bypass scoped conflict', async () => {
  const { root, publish, snapshot, remote, run, lock, cacheRoot, source } = await setup()
  const second = await publish({ ...snapshot.preset, name: 'Different bytes, same identity' })
  expect(second.preset.id).toBe(snapshot.preset.id)
  expect(second.preset.revision).toBe(snapshot.preset.revision)
  expect(second.presetHash).not.toBe(snapshot.presetHash)
  expect((await run(['init', '--preset', local, '--yes'])).code).toBe(0)
  const first = await run(['add', 'button', '--preset', ...remote(), '--yes'])
  expect(first.code, first.output + first.stderr).toBe(0)
  const beforeConflictingInstall = await snapshotTree(root)
  const secondInstall = await run(['add', 'button', '--preset', ...remote(second), '--yes'])
  expect(secondInstall.code, secondInstall.output).toBe(4)
  expect(await snapshotTree(root)).toEqual(beforeConflictingInstall)
  expect((await lock()).componentPresetSources[`${snapshot.preset.id}@${snapshot.preset.revision}`]).toEqual(source())
  expect(await readSnapshotCache(cacheRoot, source(second))).toBeNull()
})
it('matching local or another remote code preserves scoped source, while global theme operations preserve its map', async () => {
  const { root, snapshot, publish, remote, run, lock, source, cacheRoot } = await setup()
  const duplicate = await publish(snapshot.preset)
  expect((await run(['init', '--preset', ...remote(), '--yes'])).code).toBe(0)
  expect((await run(['add', '--recipe', path.resolve('examples/recipe.example.json'), '--yes'])).code).toBe(0)
  expect((await run(['add', 'button', '--preset', ...remote(), '--yes'])).code).toBe(0)
  const before = await lock()
  const presetFile = path.join(root, 'scoped.json')
  await fs.writeFile(presetFile, JSON.stringify(snapshot.preset))
  const tree = await snapshotTree(root)
  for (const input of [[presetFile], remote(duplicate)]) {
    const result = await run(['add', 'button', '--preset', ...input, '--yes'])
    expect(result.code, result.output + result.stderr).toBe(0)
    expect(result.data.changes.every((change: { action: string }) => change.action === 'noop')).toBe(true)
    expect(await snapshotTree(root)).toEqual(tree)
    expect((await lock()).componentPresetSources).toEqual(before.componentPresetSources)
  }
  expect(await readSnapshotCache(cacheRoot, source(duplicate))).toEqual(duplicate)
  const explicitGlobal = await run(['theme', 'add', ...remote(duplicate), '--yes'])
  expect(explicitGlobal.code, explicitGlobal.output + explicitGlobal.stderr).toBe(0)
  expect((await lock()).presetSource).toEqual(source(duplicate))
  expect((await lock()).componentPresetSources).toEqual(before.componentPresetSources)
  expect((await run(['theme', 'add', local, '--yes'])).code).toBe(0)
  const after = await lock()
  expect(after).not.toHaveProperty('presetSource')
  expect(after.componentPresetSources).toEqual(before.componentPresetSources)
  expect(after.componentPresets).toEqual(before.componentPresets)
  expect(after.recipes).toEqual(before.recipes)
})
it('attaches missing scoped provenance by changing only the lock', async () => {
  const { root, remote, snapshot, run, lock, source } = await setup()
  const file = path.join(root, 'input.json')
  await fs.writeFile(file, JSON.stringify(snapshot.preset))
  expect((await run(['init', '--preset', local, '--yes'])).code).toBe(0)
  expect((await run(['add', 'button', '--preset', file, '--yes'])).code).toBe(0)
  const before = await snapshotTree(root)
  const result = await run(['add', 'button', '--preset', ...remote(), '--yes'])
  expect(result.code, result.output + result.stderr).toBe(0)
  expect(result.data.changes.filter((change: { action: string }) => change.action !== 'noop').map((change: { kind: string }) => change.kind)).toEqual(['lock'])
  const after = await snapshotTree(root)
  delete before['ui-library.lock.json']; delete after['ui-library.lock.json']
  expect(after).toEqual(before)
  expect((await lock()).componentPresetSources[`${snapshot.preset.id}@${snapshot.preset.revision}`]).toEqual(source())
})
it('leaves cache absent after a rejected noninteractive application and failed operation-lock acquisition', async () => {
  const { root, run, remote, cacheParent } = await setup()
  const before = await snapshotTree(root)
  const rejected = await run(['init', '--preset', ...remote()])
  expect(rejected.code, rejected.output).toBe(2)
  expect(await snapshotTree(root)).toEqual(before)
  expect(await fs.readdir(cacheParent)).toEqual([])
  await fs.writeFile(path.join(root, '.ombelle-operation.lock'), 'another process')
  const failed = await run(['init', '--preset', ...remote(), '--yes'])
  expect(failed.code, failed.output).toBe(4)
  expect(await fs.readdir(cacheParent)).toEqual([])
})
it.each(['configuration', 'write'] as const)('warns after successful apply when cache %s fails', async failure => {
  const { run, remote, lock, source, cacheRoot } = await setup()
  if (failure === 'write') await fs.writeFile(cacheRoot, 'occupied path')
  const result = await run(['init', '--preset', ...remote(), '--yes'], failure === 'configuration' ? 'relative-cache' : cacheRoot)
  expect(result.code, result.output + result.stderr).toBe(0)
  expect(result.data.status).toBe('success')
  expect(result.stderr).toMatch(/warning.*snapshot.*cache/i)
  expect((await lock()).presetSource).toEqual(source())
})
it('rolls back source and leaves cache absent after dependency failure', async () => {
  const { root, run, remote, cacheParent, cacheRoot } = await setup('yarn')
  expect((await run(['init', '--preset', local, '--yes'])).code).toBe(0)
  const file = path.join(root, 'package.json')
  const pkg = JSON.parse(await fs.readFile(file, 'utf8'))
  delete pkg.dependencies.clsx
  await fs.writeFile(file, JSON.stringify(pkg))
  const manager = path.join(root, 'yarn.cjs')
  await fs.writeFile(manager, "if(process.argv.includes('--version')) console.log('4.9.2'); else { console.error('fixture dependency failure'); process.exitCode=1 }")
  const before = await snapshotTree(root)
  const result = await run(['add', 'button', '--preset', ...remote(), '--yes'], cacheRoot, { OMBELLE_YARN_ENTRY: manager })
  expect(result.code, result.output + result.stderr).toBe(6)
  expect(result.data.error).toMatchObject({ code: 'DEPENDENCY_FAILURE', recovery: { sourceRestored: true, packageStateMayHaveChanged: true } })
  const after = await snapshotTree(root)
  for (const file of Object.keys(after)) if (file.startsWith('.ombelle-transactions/')) delete after[file]
  expect(after).toEqual(before)
  expect(await fs.readdir(cacheParent)).toEqual([])
})
