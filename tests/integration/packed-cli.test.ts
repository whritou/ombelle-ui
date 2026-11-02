import fs from 'node:fs/promises'
import path from 'node:path'
import os from 'node:os'
import { spawn } from 'node:child_process'
import { afterAll, beforeAll, expect, it } from 'vitest'
import { getCatalog } from '@ombelle/catalog'
import { createProject } from '../helpers/projects.js'
import { managerEntry } from '../../packages/cli/src/apply/manager.js'
import { resolveBunExecutable } from '../../packages/cli/src/apply/executable.js'
import { randomUUID } from 'node:crypto'
import { pathToFileURL } from 'node:url'
import { startSnapshotService } from '../helpers/snapshot-service.js'
import exampleRecipe from '../../examples/recipe.example.json'

const owned: string[] = []
function command(executable: string, args: string[], cwd = process.cwd(), env: NodeJS.ProcessEnv = {}) {
  return new Promise<{ code: number | null; stdout: string; stderr: string }>((resolve, reject) => {
    const child = spawn(executable, args, { cwd, windowsHide: true, timeout: 120_000, env: { ...process.env, ...env, NODE_PATH: '', NODE_OPTIONS: '', BUN_OPTIONS: '' } })
    let stdout = '', stderr = ''
    child.stdout.on('data', value => { stdout += value }); child.stderr.on('data', value => { stderr += value })
    child.on('error', reject); child.on('close', code => resolve({ code, stdout, stderr }))
  })
}
let release: { packageName: string; version: string; tarball: string; integrity: string }, install: string, binary: string
let service: Awaited<ReturnType<typeof startSnapshotService>>, presetCode: string, recipeCode: string
beforeAll(async () => {
  const packed = await command(process.execPath, ['scripts/pack-cli.mjs'])
  expect(packed.code, packed.stdout + packed.stderr).toBe(0)
  release = JSON.parse(await fs.readFile('.artifacts/cli-release/release.json', 'utf8'))
  install = await fs.mkdtemp(path.join(os.tmpdir(), 'ombelle-packed-install-')); owned.push(install)
  await fs.writeFile(path.join(install, 'package.json'), JSON.stringify({ name: 'independent-installer-consumer', private: true, type: 'module' }))
  const installed = await command(process.execPath, [await managerEntry('npm'), 'install', release.tarball, '--offline', '--ignore-scripts', '--no-audit', '--no-fund'], install)
  expect(installed.code, installed.stdout + installed.stderr).toBe(0)
  binary = path.join(install, 'node_modules', release.packageName, 'dist/main.js')
  service = await startSnapshotService()
  for (const [kind, value] of [['preset', getCatalog('0.1.0').presets.flat], ['recipe', exampleRecipe]] as const) {
    const response = await fetch(`${service.origin}/api/v1/${kind}s`, { method: 'POST', headers: { Origin: service.origin, 'Content-Type': 'application/json', 'Idempotency-Key': randomUUID() }, body: JSON.stringify({ [kind]: value }) })
    expect(response.status).toBe(201)
    const snapshot = await response.json() as { id: string }
    if (kind === 'preset') presetCode = snapshot.id + '@1'
    else recipeCode = snapshot.id + '@1'
  }
}, 120_000)
afterAll(async () => {
  await service?.close()
  for (const root of owned) {
    if (path.dirname(path.resolve(root)) !== path.resolve(os.tmpdir()) || !path.basename(root).startsWith('ombelle-')) throw new Error('Unexpected owned test directory')
    await fs.rm(root, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 })
  }
})
it('runs the installed npm bin through npm exec without registry resolution', async () => {
  const result = await command(process.execPath, [await managerEntry('npm'), 'exec', '--offline', '--', 'ombelle', '--help'], install)
  expect(result.code, result.stdout + result.stderr).toBe(0)
  expect(result.stdout).toContain('add --recipe')
})
it('packs only standalone installer files, complete license notices and no install scripts or workspace references', async () => {
  expect(release).toMatchObject({ packageName: '@ombelle-ui/cli', version: '0.2.0', integrity: expect.stringMatching(/^sha512-/) })
  const root = path.dirname(path.dirname(binary)), manifest = JSON.parse(await fs.readFile(path.join(root, 'package.json'), 'utf8'))
  expect(manifest.private).not.toBe(true)
  expect(manifest.dependencies ?? {}).toEqual({})
  expect(manifest.scripts ?? {}).toEqual({})
  expect(JSON.stringify(manifest)).not.toContain('workspace:')
  expect(await fs.readFile(path.join(root, 'LICENSE'), 'utf8')).toContain('MIT License')
  expect(await fs.readFile(path.join(root, 'THIRD_PARTY_NOTICES.txt'), 'utf8')).toMatch(/prettier|ajv/i)
  const files = await command('tar', ['-tzf', release.tarball])
  expect(files.code, files.stderr).toBe(0)
  expect(files.stdout).not.toMatch(/\.env|\.sqlite|\.map\b|node_modules|fixtures|\.superpowers/)
  const bytes = await fs.readFile(binary, 'utf8')
  expect(bytes).not.toContain(process.cwd())
  expect(bytes).not.toContain(process.cwd().replaceAll('\\', '/'))
  await expect(fs.access(path.join(install, 'node_modules/@ombelle/compiler'))).rejects.toMatchObject({ code: 'ENOENT' })
})
it.each(['node', 'bun'] as const)('runs the independent package under %s for local plan/apply and saved-default additions', async runtime => {
  const executable = runtime === 'node' ? process.execPath : await resolveBunExecutable()
  const help = await command(executable, [binary, '--help'], install)
  expect(help.code, help.stderr).toBe(0); expect(help.stdout).toContain('add --recipe')
  const root = await createProject('vite'); owned.push(root)
  const pkgFile = path.join(root, 'package.json'), pkg = JSON.parse(await fs.readFile(pkgFile, 'utf8'))
  for (const template of Object.values(getCatalog('0.1.0').templates))
    for (const dependency of template.dependencies) pkg.dependencies[dependency.name] = dependency.version
  await fs.writeFile(pkgFile, JSON.stringify(pkg))
  const args = ['init', '--preset', path.resolve('examples/preset.example.json'), '--cwd', root, '--json']
  for (const action of [[...args, '--dry-run'], [...args, '--yes'], ['add', '--recipe', path.resolve('examples/recipe.example.json'), '--cwd', root, '--yes', '--json'], ['add', 'input', '--cwd', root, '--yes', '--json']]) {
    const result = await command(executable, [binary, ...action], install)
    expect(result.code, result.stdout + result.stderr).toBe(0)
    expect(JSON.parse(result.stdout).status).toMatch(/planned|success/)
  }
})
it.each(['node', 'bun'] as const)('resolves official codes from the packed %s process, preserving defaults and recipe sources', async runtime => {
  const executable = runtime === 'node' ? process.execPath : await resolveBunExecutable()
  const root = await createProject('vite'); owned.push(root)
  const pkgFile = path.join(root, 'package.json'), pkg = JSON.parse(await fs.readFile(pkgFile, 'utf8'))
  for (const template of Object.values(getCatalog('0.1.0').templates))
    for (const dependency of template.dependencies) pkg.dependencies[dependency.name] = dependency.version
  await fs.writeFile(pkgFile, JSON.stringify(pkg))
  const preloadPath = path.resolve('tests/helpers/official-snapshot-transport.mjs')
  const preload = runtime === 'bun' ? preloadPath : pathToFileURL(preloadPath).href
  const run = (args: string[]) => command(executable, ['--import', preload, binary, ...args, '--cwd', root, '--yes', '--json'], install, { OMBELLE_TEST_SNAPSHOT_ORIGIN: service.origin, OMBELLE_SNAPSHOT_CACHE_DIR: path.join(install, 'cache') })
  const init = await run(['init', '--preset', presetCode])
  expect(init.code, init.stdout + init.stderr).toBe(0)
  const defaults = await fs.readFile(path.join(root, 'ui-preset.json'), 'utf8')
  const recipe = await run(['add', '--recipe', recipeCode])
  expect(recipe.code, recipe.stdout + recipe.stderr).toBe(0)
  const add = await command(executable, [binary, 'add', 'input', '--cwd', root, '--yes', '--json'], install)
  expect(add.code, add.stdout + add.stderr).toBe(0)
  expect(await fs.readFile(path.join(root, 'ui-preset.json'), 'utf8')).toBe(defaults)
  const lock = JSON.parse(await fs.readFile(path.join(root, 'ui-library.lock.json'), 'utf8'))
  expect(lock.recipeSources[exampleRecipe.id + '@' + exampleRecipe.revision]).toMatchObject({ origin: 'https://ombelle-ui.vercel.app', reference: recipeCode })
})

it.each(['pnpm', 'yarn-classic', 'yarn-modern', 'bun'] as const)('installs the exact tarball with scripts disabled and runs the %s bin', async manager => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'ombelle-packed-manager-')); owned.push(root)
  const version = manager === 'pnpm' ? 'pnpm@11.25.0' : manager === 'bun' ? 'bun@1.4.3' : manager === 'yarn-classic' ? 'yarn@1.22.22' : 'yarn@4.18.1'
  await fs.writeFile(path.join(root, 'package.json'), JSON.stringify({ name: 'packed-manager-consumer', private: true, packageManager: version }))
  let executable = process.execPath, prefix: string[]
  if (manager === 'bun') { executable = await resolveBunExecutable(); prefix = [] }
  else if (manager === 'pnpm') prefix = [process.env.OMBELLE_TEST_PNPM_ENTRY ?? await managerEntry('pnpm')]
  else {
    const candidates = [process.env.OMBELLE_TEST_COREPACK_ENTRY, ...(process.env.PATH ?? process.env.Path ?? '').split(path.delimiter).filter(Boolean).flatMap(directory => [path.join(directory, 'node_modules/corepack/dist/corepack.js'), path.join(directory, '../lib/node_modules/corepack/dist/corepack.js')])].filter((item): item is string => !!item)
    let entry: string | undefined
    for (const candidate of candidates) { try { if ((await fs.stat(candidate)).isFile()) { entry = candidate; break } } catch { /* try next installed tool */ } }
    if (!entry) throw new Error('Corepack is required for pinned Yarn release checks')
    prefix = [entry, version]
  }
  const env = { COREPACK_ENABLE_DOWNLOAD_PROMPT: '0', YARN_ENABLE_SCRIPTS: 'false' }
  if (manager === 'yarn-modern') await fs.copyFile(release.tarball, path.join(root, 'candidate.tgz'))
  const probe = await command(executable, [...prefix, '--version'], root, env)
  expect(probe.code, probe.stdout + probe.stderr).toBe(0)
  expect(probe.stdout.trim()).toBe(version.split('@')[1])
  const args = manager === 'pnpm' || manager === 'bun'
    ? ['add', '--offline', '--ignore-scripts', release.tarball]
    : manager === 'yarn-classic' ? ['add', '--offline', '--ignore-scripts', release.tarball] : ['add', '--mode=skip-build', `${release.packageName}@file:./candidate.tgz`]
  const installed = await command(executable, [...prefix, ...args], root, env)
  expect(installed.code, installed.stdout + installed.stderr).toBe(0)
  const help = await command(executable, [...prefix, manager === 'pnpm' ? 'exec' : 'run', 'ombelle', '--help'], root, env)
  expect(help.code, help.stdout + help.stderr).toBe(0)
  expect(help.stdout).toContain('add --recipe')
})
