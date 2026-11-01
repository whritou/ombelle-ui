import fs from 'node:fs/promises'
import path from 'node:path'
import os from 'node:os'
import { randomBytes, randomUUID } from 'node:crypto'
import { pathToFileURL } from 'node:url'
import { spawn } from 'node:child_process'
import { afterAll, expect, it } from 'vitest'
import { getCatalog } from '@ombelle/catalog'
import type { PresetSnapshot, RecipeSnapshot } from '@ombelle/contracts'
import recipe from '../../examples/recipe.example.json'
import { startPublicationHttpBridge } from '../helpers/snapshot-service.js'
import { createProject } from '../helpers/projects.js'
import { openPostgresSnapshotStore, closePostgresPools } from '../../apps/www/src/snapshots/server/postgres-store.js'
import { initializePostgresSnapshotStore } from '../../apps/www/src/snapshots/server/postgres-migrations.js'
import { createPostgresPool } from '../../apps/www/src/snapshots/server/postgres-pool.js'
import { managerEntry } from '../../packages/cli/src/apply/manager.js'

const connection = process.env.OMBELLE_POSTGRES_TEST_DATABASE_URL
const direct = process.env.OMBELLE_POSTGRES_TEST_DIRECT_URL
const host = process.env.OMBELLE_POSTGRES_TEST_EXPECTED_HOST
if (process.env.OMBELLE_POSTGRES_TEST_BRANCH !== 'dev-hosted-install-codes' || !connection || !direct || !host || new URL(connection).hostname !== host || new URL(direct).hostname !== host.replace('-pooler.', '.'))
  throw new Error('Hosted journey requires the explicitly isolated dev-hosted-install-codes branch; production is not a test target.')
const schema = 'ombelle_test_' + randomBytes(8).toString('hex')
let bridge: Awaited<ReturnType<typeof startPublicationHttpBridge>> | undefined, root: string | undefined, packageRoot: string | undefined
afterAll(async () => {
  await bridge?.close(); await closePostgresPools()
  if (!/^ombelle_test_[a-f0-9]{16}$/.test(schema)) throw new Error('Unsafe test cleanup schema')
  const pool = createPostgresPool(direct!)
  try { await pool.query(`DROP SCHEMA IF EXISTS "${schema}" CASCADE`) } finally { await pool.end() }
  for (const owned of [root, packageRoot].filter((value): value is string => !!value)) {
    if (path.dirname(path.resolve(owned)) !== path.resolve(os.tmpdir()) || !path.basename(owned).startsWith('ombelle-')) throw new Error('Unsafe fixture cleanup root')
    await fs.rm(owned, { recursive: true, force: true })
  }
})
it('publishes both codes on real Neon, installs the independent package, persists after restart, withdraws, and adds offline from saved defaults', async () => {
  await initializePostgresSnapshotStore(direct!, schema)
  let store = await openPostgresSnapshotStore(connection!, { schema })
  bridge = await startPublicationHttpBridge(store, { backend: 'postgres', databaseUrl: connection! })
  const publish = async (kind: 'preset' | 'recipe', value: unknown) => {
    const response = await fetch(`${bridge!.origin}/api/v1/${kind}s`, { method: 'POST', headers: { Origin: bridge!.origin, 'Content-Type': 'application/json', 'Idempotency-Key': randomUUID() }, body: JSON.stringify({ [kind]: value }) })
    expect(response.status).toBe(201); return response.json()
  }
  const preset = await publish('preset', getCatalog('0.1.0').presets.flat) as PresetSnapshot
  const snapshot = await publish('recipe', recipe) as RecipeSnapshot
  root = await createProject('vite')
  const pkgFile = path.join(root, 'package.json'), pkg = JSON.parse(await fs.readFile(pkgFile, 'utf8'))
  for (const template of Object.values(getCatalog('0.1.0').templates)) for (const dependency of template.dependencies) pkg.dependencies[dependency.name] = dependency.version
  await fs.writeFile(pkgFile, JSON.stringify(pkg))
  packageRoot = await fs.mkdtemp(path.join(os.tmpdir(), 'ombelle-hosted-package-'))
  await fs.writeFile(path.join(packageRoot, 'package.json'), JSON.stringify({ name: 'independent-hosted-installer', private: true, type: 'module' }))
  const npm = await managerEntry('npm')
  const release = JSON.parse(await fs.readFile('.artifacts/cli-release/release.json', 'utf8'))
  expect(release).toMatchObject({ packageName: '@ombelle-ui/cli', version: '0.1.0' })
  const installation = await new Promise<{ code: number | null; text: string }>((resolve, reject) => {
    const child = spawn(process.execPath, [npm, 'install', release.tarball, '--offline', '--ignore-scripts', '--no-audit', '--no-fund'], { cwd: packageRoot, windowsHide: true, env: { ...process.env, NODE_OPTIONS: '', NODE_PATH: '' } })
    let text = ''; child.stdout.on('data', value => { text += value }); child.stderr.on('data', value => { text += value }); child.on('error', reject); child.on('close', code => resolve({ code, text }))
  })
  expect(installation.code, installation.text).toBe(0)
  const cli = path.join(packageRoot, 'node_modules', release.packageName, 'dist/main.js')
  await fs.access(cli)
  const run = (args: string[]) => new Promise<{ code: number | null; stdout: string; stderr: string }>((resolve, reject) => {
    const child = spawn(process.execPath, ['--import', pathToFileURL(path.resolve('tests/helpers/official-snapshot-transport.mjs')).href, cli, ...args, '--cwd', root!, '--yes', '--json'], { cwd: packageRoot, windowsHide: true, env: { ...process.env, NODE_PATH: '', NODE_OPTIONS: '', OMBELLE_TEST_SNAPSHOT_ORIGIN: bridge!.origin, OMBELLE_SNAPSHOT_CACHE_DIR: 'unused-relative-cache' } })
    let stdout = '', stderr = ''; child.stdout.on('data', value => { stdout += value }); child.stderr.on('data', value => { stderr += value }); child.on('error', reject); child.on('close', code => resolve({ code, stdout, stderr }))
  })
  const init = await run(['init', '--preset', preset.id + '@1']); expect(init.code, init.stdout + init.stderr).toBe(0)
  const defaults = await fs.readFile(path.join(root, 'ui-preset.json'), 'utf8')
  const installed = await run(['add', '--recipe', snapshot.id + '@1']); expect(installed.code, installed.stdout + installed.stderr).toBe(0)
  const firstLock = JSON.parse(await fs.readFile(path.join(root, 'ui-library.lock.json'), 'utf8'))
  expect(firstLock.recipeSources[recipe.id + '@' + recipe.revision]).toMatchObject({ reference: snapshot.id + '@1', recipeHash: snapshot.recipeHash })
  await bridge.close(); bridge = undefined
  await closePostgresPools()
  store = await openPostgresSnapshotStore(connection!, { schema })
  bridge = await startPublicationHttpBridge(store, { backend: 'postgres', databaseUrl: connection! })
  for (const [kind, value] of [['presets', preset], ['recipes', snapshot]] as const) {
    const response = await fetch(`${bridge.origin}/api/v1/${kind}/${value.id}/1`)
    expect(response.status).toBe(200); expect(await response.json()).toEqual(value)
  }
  await store.withdrawRecipe({ id: snapshot.id, revision: 1 }, 'operator-request', Date.now())
  expect((await fetch(`${bridge.origin}/api/v1/recipes/${snapshot.id}/1`)).status).toBe(410)
  const withdrawn = await run(['add', '--recipe', snapshot.id + '@1']); expect(withdrawn.code).toBe(5)
  await bridge.close()
  const added = await run(['add', 'input']); expect(added.code, added.stdout + added.stderr).toBe(0)
  expect(JSON.parse(added.stdout).networkAccess).toBe(false)
  expect(await fs.readFile(path.join(root, 'ui-preset.json'), 'utf8')).toBe(defaults)
  const finalLock = JSON.parse(await fs.readFile(path.join(root, 'ui-library.lock.json'), 'utf8'))
  expect(finalLock.recipeSources).toEqual(firstLock.recipeSources)
  bridge = undefined
}, 60_000)
