import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { execFile } from 'node:child_process'
import { promisify } from 'node:util'
import { afterEach, beforeAll, expect, it, vi } from 'vitest'
import { getCatalog } from '@ombelle/catalog'
import { normalizePublishedPreset } from '@ombelle/compiler'
import type { PresetSnapshot, SnapshotSource } from '@ombelle/contracts'
import { readSnapshotCache, writeSnapshotCache } from '../../packages/cli/src/snapshots/cache.js'

const temporary: string[] = []
let snapshot: PresetSnapshot
let key: SnapshotSource
beforeAll(async () => {
  const resolved = await normalizePublishedPreset(getCatalog('0.1.0').presets.flat)
  snapshot = { snapshotVersion: '1.0', id: 'ps_0123456789abcdef0123456789abcdef', revision: 1, preset: resolved.data, presetHash: resolved.hash, catalogRelease: '0.1.0', compilerVersion: '0.1.0', createdAt: '2026-10-27T12:34:56.000Z', validationStatus: 'draft' }
  key = { origin: 'https://example.com', reference: snapshot.id + '@1', presetHash: resolved.hash }
})
afterEach(async () => { vi.restoreAllMocks(); for (const dir of temporary.splice(0)) await fs.rm(dir, { recursive: true, force: true }) })
async function setup() {
  const base = await fs.mkdtemp(path.join(os.tmpdir(), 'ombelle-cache-fs-'))
  temporary.push(base)
  const outside = path.join(base, 'outside')
  await fs.mkdir(outside)
  await fs.writeFile(path.join(outside, 'sentinel'), 'external sentinel bytes')
  return { base, outside, root: path.join(base, 'cache') }
}
async function tree(root: string) {
  return Promise.all((await fs.readdir(root)).sort().map(async name => [name, await fs.readFile(path.join(root, name), 'utf8')]))
}
it.each(['root', 'ancestor', 'entry'])('cache substitution at %s cannot escape owned root', async boundary => {
  const { base, outside, root } = await setup()
  let directory = root
  if (boundary === 'entry') {
    await writeSnapshotCache(root, key, snapshot)
    const file = path.join(root, (await fs.readdir(root))[0]!)
    await fs.unlink(file)
    // Windows entry reparse points require no symlink privilege for junctions;
    // Unix runs the file-symlink variant against the external sentinel itself.
    await fs.symlink(process.platform === 'win32' ? outside : path.join(outside, 'sentinel'), file, process.platform === 'win32' ? 'junction' : 'file')
  } else if (boundary === 'ancestor') {
    const alias = path.join(base, 'alias')
    await fs.symlink(outside, alias, process.platform === 'win32' ? 'junction' : 'dir')
    directory = path.join(alias, 'cache')
  } else await fs.symlink(outside, root, process.platform === 'win32' ? 'junction' : 'dir')
  const before = await tree(outside)
  expect(await readSnapshotCache(directory, key)).toBeNull()
  await expect(writeSnapshotCache(directory, key, snapshot)).rejects.toThrow()
  expect(await tree(outside)).toEqual(before)
})
it('abandons temporary cleanup when the root identity changes after publication', async () => {
  const { base, root } = await setup()
  const moved = path.join(base, 'moved')
  const link = fs.link.bind(fs)
  let sentinelName = ''
  vi.spyOn(fs, 'link').mockImplementationOnce(async (from, to) => {
    await link(from, to)
    sentinelName = path.basename(String(from))
    await fs.rename(root, moved)
    await fs.mkdir(root, { mode: 0o700 })
    await fs.writeFile(path.join(root, sentinelName), 'replacement root sentinel')
  })
  await expect(writeSnapshotCache(root, key, snapshot)).rejects.toThrow(/private owned/)
  expect(await fs.readFile(path.join(root, sentinelName), 'utf8')).toBe('replacement root sentinel')
  expect(await fs.readdir(moved)).toHaveLength(2)
})
it('refuses cache locations writable by other users', async () => {
  const { root } = await setup()
  await fs.mkdir(root, { mode: 0o700 })
  if (process.platform === 'win32') {
    await promisify(execFile)(path.join(process.env.SystemRoot ?? 'C:\\Windows', 'System32/icacls.exe'), [root, '/grant', '*S-1-1-0:(OI)(CI)F'], { windowsHide: true, timeout: 10_000 })
  } else await fs.chmod(root, 0o777)
  expect(await readSnapshotCache(root, key)).toBeNull()
  await expect(writeSnapshotCache(root, key, snapshot)).rejects.toThrow()
  expect(await fs.readdir(root)).toEqual([])
})
it('refuses foreign DELETE authority on an ancestor before admitting cache bytes', async () => {
  const { base, root } = await setup()
  if (process.platform === 'win32') {
    await promisify(execFile)(path.join(process.env.SystemRoot ?? 'C:\\Windows', 'System32/icacls.exe'), [base, '/grant', '*S-1-1-0:(D)'], { windowsHide: true, timeout: 10_000 })
  } else await fs.chmod(base, 0o777)
  expect(await readSnapshotCache(root, key)).toBeNull()
  await expect(writeSnapshotCache(root, key, snapshot)).rejects.toThrow()
  // Creation of empty cache directories is allowed on writes; admission is not.
  const entries = await fs.readdir(root).catch((error: NodeJS.ErrnoException) => {
    if (error.code !== 'ENOENT') throw error
    return []
  })
  expect(entries).toEqual([])
})
it('rolls back its own new entry when bounded accounting becomes impossible during publication', async () => {
  const { root } = await setup()
  const link = fs.link.bind(fs)
  vi.spyOn(fs, 'link').mockImplementationOnce(async (from, to) => {
    await link(from, to)
    for (let i = 0; i < 401; i++) await fs.writeFile(path.join(root, `unknown-${i}`), 'untouched sentinel')
  })
  await expect(writeSnapshotCache(root, key, snapshot)).rejects.toThrow(/capacity/i)
  expect(await readSnapshotCache(root, key)).toBeNull()
  expect(await fs.readdir(root)).toHaveLength(401)
  expect(await fs.readFile(path.join(root, 'unknown-400'), 'utf8')).toBe('untouched sentinel')
})
it('hard linked entries cannot change or remove external files', async () => {
  const { outside, root } = await setup()
  await writeSnapshotCache(root, key, snapshot)
  const file = path.join(root, (await fs.readdir(root))[0]!)
  await fs.unlink(file)
  await fs.link(path.join(outside, 'sentinel'), file)
  const before = await tree(outside)
  expect(await readSnapshotCache(root, key)).toBeNull()
  await expect(writeSnapshotCache(root, key, snapshot)).rejects.toThrow()
  expect(await tree(outside)).toEqual(before)
})
it('eviction preserves outside sentinels and skips substituted and corrupt entries', async () => {
  const { outside, root } = await setup()
  await fs.mkdir(root, { mode: 0o700 })
  // Seed a previously populated private cache without making 101 separate writes.
  // Eviction validates each envelope independently of the caller's requested key.
  for (let i = 0; i < 101; i++) {
    await fs.writeFile(path.join(root, i.toString(16).padStart(64, '0') + '.json'), JSON.stringify({ ...snapshot, id: 'ps_' + i.toString(16).padStart(32, '0') }), { mode: 0o600 })
  }
  const alias = path.join(root, 'f'.repeat(64) + '.json')
  await fs.symlink(process.platform === 'win32' ? outside : path.join(outside, 'sentinel'), alias, process.platform === 'win32' ? 'junction' : 'file')
  const corrupt = path.join(root, 'e'.repeat(64) + '.json')
  await fs.writeFile(corrupt, '{')
  const before = await tree(outside)
  await writeSnapshotCache(root, key, snapshot)
  expect(await tree(outside)).toEqual(before)
  expect((await fs.lstat(alias)).isSymbolicLink()).toBe(true)
  expect(await fs.readFile(corrupt, 'utf8')).toBe('{')
  expect(await fs.readdir(root)).toHaveLength(102) // 100 validated + 2 untouched.
})
it('never overwrites an existing envelope on Windows rename semantics', async () => {
  const { root } = await setup()
  const writes = await Promise.allSettled([
    writeSnapshotCache(root, key, snapshot),
    writeSnapshotCache(root, key, { ...snapshot, createdAt: '2026-10-28T00:00:00.000Z' }),
  ])
  expect(writes.filter(result => result.status === 'fulfilled')).toHaveLength(1)
  expect(writes.filter(result => result.status === 'rejected')).toHaveLength(1)
  const cached = await readSnapshotCache(root, key)
  expect([snapshot.createdAt, '2026-10-28T00:00:00.000Z']).toContain(cached?.createdAt)
  expect(await fs.readdir(root)).toHaveLength(1)
})
