import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { randomUUID } from 'node:crypto'
import { createServer } from 'node:http'
import { afterEach, expect, it } from 'vitest'
import { getCatalog } from '@ombelle/catalog'
import type { PresetSnapshot } from '@ombelle/contracts'
import { startSnapshotService } from '../helpers/snapshot-service.js'
import { createProject } from '../helpers/projects.js'
import { snapshotTree } from '../helpers/tree.js'
import { runBuiltCli, jsonRecord } from '../helpers/cli-runtime.js'
import { openSnapshotStore } from '../../apps/www/src/snapshots/server/sqlite-store.js'
import { writeSnapshotCache } from '../../packages/cli/src/snapshots/cache.js'

const cleanup: (() => Promise<unknown>)[] = []
afterEach(async () => { for (const close of cleanup.splice(0).reverse()) await close() })
async function setup() {
  const service = await startSnapshotService()
  cleanup.push(service.close)
  const root = await createProject('vite')
  const cacheParent = await fs.mkdtemp(path.join(os.tmpdir(), 'ombelle-cli-cache-'))
  cleanup.push(() => fs.rm(root, { recursive: true, force: true }), () => fs.rm(cacheParent, { recursive: true, force: true }))
  const response = await fetch(service.origin + '/api/v1/presets', {
    method: 'POST', headers: { Origin: service.origin, 'Content-Type': 'application/json', 'Idempotency-Key': randomUUID() },
    body: JSON.stringify({ preset: getCatalog('0.1.0').presets.flat }),
  })
  expect(response.status).toBe(201)
  const snapshot = await response.json() as PresetSnapshot
  const reference = snapshot.id + '@1'
  const cacheRoot = path.join(cacheParent, 'cache')
  const flags = ['--snapshot-origin', service.origin, '--preset-hash', snapshot.presetHash]
  const run = (args: string[]) => runBuiltCli('node', [...args, '--json'], root, { OMBELLE_SNAPSHOT_CACHE_DIR: cacheRoot })
  return { service, root, cacheParent, cacheRoot, snapshot, reference, flags, run }
}
it.each(['init', 'theme'] as const)('dry remote %s plan writes neither app nor cache', async command => {
  const { service, root, cacheParent, snapshot, reference, flags, run } = await setup()
  const projectBefore = await snapshotTree(root), cacheBefore = await snapshotTree(cacheParent)
  const args = command === 'init' ? ['init', '--preset', reference] : ['theme', 'add', reference]
  const dry = await run([...args, ...flags, '--dry-run'])
  expect(dry.code, dry.output).toBe(0)
  expect(jsonRecord(dry.data)).toMatchObject({ status: 'planned', presetHash: snapshot.presetHash, networkAccess: true, presetResolution: { source: { origin: service.origin, reference, presetHash: snapshot.presetHash }, via: 'network' } })
  expect(await snapshotTree(root)).toEqual(projectBefore)
  expect(await snapshotTree(cacheParent)).toEqual(cacheBefore)
  expect(await fs.readdir(cacheParent)).toEqual([])
})
it('scoped source reports the selected hash while preserving the global plan hash', async () => {
  const { root, cacheParent, service, snapshot, reference, flags, run } = await setup()
  const initialized = await run(['init', '--preset', path.resolve('examples/preset.example.json'), '--yes'])
  expect(initialized.code, initialized.output).toBe(0)
  const globalHash = jsonRecord(initialized.data).presetHash
  expect(globalHash).not.toBe(snapshot.presetHash)
  const before = await snapshotTree(root)
  const dry = await run(['add', 'button', '--preset', reference, ...flags, '--dry-run'])
  expect(dry.code, dry.output).toBe(0)
  expect(jsonRecord(dry.data)).toMatchObject({ presetHash: globalHash, componentPreset: { preset: { hash: snapshot.presetHash } }, presetResolution: { source: { origin: service.origin, reference, presetHash: snapshot.presetHash }, via: 'network' }, networkAccess: true })
  expect(await snapshotTree(root)).toEqual(before)
  expect(await fs.readdir(cacheParent)).toEqual([])
})
it('explicit offline hit can use reviewed bytes after withdrawal; fresh online 410 never uses the warm cache', async () => {
  const { service, cacheRoot, snapshot, reference, flags, run } = await setup()
  await writeSnapshotCache(cacheRoot, { origin: service.origin, reference, presetHash: snapshot.presetHash }, snapshot)
  const store = openSnapshotStore(service.dbPath)
  try { store.withdraw({ id: snapshot.id, revision: 1 }, 'operator-request', Date.now()) } finally { store.close() }
  const withdrawn = await run(['init', '--preset', reference, ...flags, '--dry-run'])
  expect(withdrawn.code, withdrawn.output).toBe(5)
  expect(jsonRecord(withdrawn.data).error).toMatchObject({ code: 'RESOLUTION_FAILURE', message: expect.stringContaining('410') })
  const offline = await run(['init', '--preset', reference, ...flags, '--offline', '--dry-run'])
  expect(offline.code, offline.output).toBe(0)
  expect(jsonRecord(offline.data)).toMatchObject({ presetHash: snapshot.presetHash, presetResolution: { via: 'cache' }, networkAccess: false })
})
it('built CLI rejects flag misuse and required hash omission as syntax errors', async () => {
  const { reference, run } = await setup()
  for (const args of [
    ['init', '--preset', reference],
    ['add', 'button', '--offline'],
    ['init', '--preset', path.resolve('examples/preset.example.json'), '--preset-hash', 'a'.repeat(64)],
    ['add', '--recipe', 'recipe.json', '--snapshot-origin', 'https://example.com'],
  ]) {
    const result = await run([...args, '--dry-run'])
    expect(result.code, result.output).toBe(2)
    expect(jsonRecord(result.data).error).toMatchObject({ code: 'INVALID_DATA' })
  }
})
it('keeps a ./ path to a code-named file local and ignores unused cache configuration', async () => {
  const { root, snapshot, reference } = await setup()
  await fs.writeFile(path.join(root, reference), JSON.stringify(snapshot.preset))
  const dry = await runBuiltCli('node', ['init', '--preset', './' + reference, '--dry-run', '--json'], root, { OMBELLE_SNAPSHOT_CACHE_DIR: 'unused-relative-path' })
  expect(dry.code, dry.output).toBe(0)
  expect(jsonRecord(dry.data).networkAccess).toBe(false)
  expect(jsonRecord(dry.data)).not.toHaveProperty('presetResolution')
})
it('remote --yes preserves ordinary modified-file conflicts', async () => {
  const { root, reference, flags, run, cacheParent } = await setup()
  expect((await run(['init', '--preset', path.resolve('examples/preset.example.json'), '--yes'])).code).toBe(0)
  const css = path.join(root, 'src/index.css')
  await fs.writeFile(css, (await fs.readFile(css, 'utf8')).replace(/(--primary:\s*)[^;]+/, '$1red'))
  const before = await snapshotTree(root)
  const conflict = await run(['theme', 'add', reference, ...flags, '--yes'])
  expect(conflict.code, conflict.output).toBe(4)
  expect(await snapshotTree(root)).toEqual(before)
  expect(await fs.readdir(cacheParent)).toEqual([])
})
it('applies the already resolved bytes without a second GET', async () => {
  const { root, snapshot, reference, run } = await setup()
  let requests = 0
  const server = createServer((_, response) => {
    requests++
    response.setHeader('Content-Type', 'application/json')
    if (requests > 1) { response.statusCode = 410; response.end(); return }
    response.end(JSON.stringify(snapshot))
  })
  await new Promise<void>(resolve => server.listen(0, '127.0.0.1', resolve))
  cleanup.push(async () => { server.closeAllConnections(); await new Promise<void>(resolve => server.close(() => resolve())) })
  const origin = `http://127.0.0.1:${(server.address() as { port: number }).port}`
  const result = await run(['init', '--preset', reference, '--snapshot-origin', origin, '--preset-hash', snapshot.presetHash, '--yes'])
  expect(result.code, result.output).toBe(0)
  expect(requests).toBe(1)
  expect(JSON.parse(await fs.readFile(path.join(root, 'ui-preset.json'), 'utf8'))).toEqual(snapshot.preset)
})
