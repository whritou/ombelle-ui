import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { afterEach, beforeAll, expect, it, vi } from 'vitest'
import { getCatalog } from '@ombelle/catalog'
import { normalizePublishedPreset } from '@ombelle/compiler'
import type { PresetSnapshot, SnapshotSource } from '@ombelle/contracts'
import { assertCacheDirectoryPolicy, readSnapshotCache, snapshotCacheDirectory, writeSnapshotCache } from '../src/snapshots/cache.js'

const temporary: string[] = []
let snapshot: PresetSnapshot
let key: SnapshotSource
beforeAll(async () => {
  const resolved = await normalizePublishedPreset(getCatalog('0.1.0').presets.flat)
  snapshot = { snapshotVersion: '1.0', id: 'ps_0123456789abcdef0123456789abcdef', revision: 1, preset: resolved.data, presetHash: resolved.hash, catalogRelease: '0.1.0', compilerVersion: '0.1.0', createdAt: '2026-10-27T12:34:56.000Z', validationStatus: 'draft' }
  key = { origin: 'https://example.com', reference: snapshot.id + '@1', presetHash: resolved.hash }
})
afterEach(async () => { vi.restoreAllMocks(); for (const dir of temporary.splice(0)) await fs.rm(dir, { recursive: true, force: true }) })
async function root() {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'ombelle-cache-unit-'))
  temporary.push(dir)
  return path.join(dir, 'cache')
}
async function entry(directory: string) { return path.join(directory, (await fs.readdir(directory)).find(name => name.endsWith('.json'))!) }

it.each([0o1777, 0o1555, 0o755])('rejects foreign POSIX ancestor ownership even with mode %o', mode => {
  expect(() => assertCacheDirectoryPolicy({ platform: 'posix', uid: 2000, currentUid: 1000, mode, root: false })).toThrow(/private owned/)
})
it.each([{ uid: 0, mode: 0o1777 }, { uid: 0, mode: 0o755 }, { uid: 1000, mode: 0o700 }])('allows trusted POSIX ancestor %#', ({ uid, mode }) => {
  expect(() => assertCacheDirectoryPolicy({ platform: 'posix', uid, currentUid: 1000, mode, root: false })).not.toThrow()
})
it('rejects a foreign Windows ancestor owner without needing an explicit dangerous ACE', () => {
  expect(() => assertCacheDirectoryPolicy({ platform: 'win32', owner: 'S-1-5-21-9999', currentUser: 'S-1-5-21-1000', root: false, withinUserProfile: false, rules: [] })).toThrow(/private owned/)
})
it('rejects Windows ancestor DELETE authority independently of delete-child authority', () => {
  expect(() => assertCacheDirectoryPolicy({ platform: 'win32', owner: 'S-1-5-18', currentUser: 'S-1-5-21-1000', root: false, withinUserProfile: false, rules: [{ sid: 'S-1-1-0', rights: 65536, allow: true, inheritOnly: false }] })).toThrow(/private owned/)
})
it.each(['S-1-5-18', 'S-1-5-32-544', 'S-1-5-80-956008885-3418522649-1831038044-1853292631-2271478464', 'S-1-5-21-1000'])('allows trusted Windows ancestor owner %s', owner => {
  expect(() => assertCacheDirectoryPolicy({ platform: 'win32', owner, currentUser: 'S-1-5-21-1000', root: false, withinUserProfile: false, rules: [] })).not.toThrow()
})

it('read miss leaves cache root absent', async () => {
  const directory = await root()
  expect(await readSnapshotCache(directory, key)).toBeNull()
  await expect(fs.lstat(directory)).rejects.toMatchObject({ code: 'ENOENT' })
})
it('requires an absolute override and selects the platform cache location', () => {
  expect(() => snapshotCacheDirectory({ OMBELLE_SNAPSHOT_CACHE_DIR: 'relative/cache' })).toThrow(/absolute/i)
  const absolute = path.resolve('cache-test')
  expect(snapshotCacheDirectory({ OMBELLE_SNAPSHOT_CACHE_DIR: absolute })).toBe(absolute)
  const env = { LOCALAPPDATA: path.resolve('local-app-data'), HOME: path.resolve('home'), XDG_CACHE_HOME: path.resolve('xdg') }
  expect(snapshotCacheDirectory(env)).toBe(process.platform === 'win32' ? path.join(env.LOCALAPPDATA, 'ombelle/cache/snapshots') : process.platform === 'darwin' ? path.join(env.HOME, 'Library/Caches/ombelle/snapshots') : path.join(env.XDG_CACHE_HOME, 'ombelle/snapshots'))
})
it('round trips verified envelopes and isolates origin, reference and hash', async () => {
  const directory = await root()
  await writeSnapshotCache(directory, key, snapshot)
  expect(await readSnapshotCache(directory, key)).toEqual(snapshot)
  expect(await readSnapshotCache(directory, { ...key, origin: 'https://other.example' })).toBeNull()
  expect(await readSnapshotCache(directory, { ...key, reference: 'ps_ffffffffffffffffffffffffffffffff@1' })).toBeNull()
  expect(await readSnapshotCache(directory, { ...key, presetHash: 'f'.repeat(64) })).toBeNull()
  expect(await fs.readdir(directory)).toHaveLength(1)
})
it.each(['json', 'oversized', 'hash', 'reference', 'non-regular'])('treats %s entries as unusable without modifying them', async kind => {
  const directory = await root()
  await writeSnapshotCache(directory, key, snapshot)
  const file = await entry(directory)
  if (kind === 'non-regular') { await fs.unlink(file); await fs.mkdir(file) }
  else await fs.writeFile(file, kind === 'json' ? '{' : kind === 'oversized' ? ' '.repeat(131_073) : JSON.stringify({ ...snapshot, ...(kind === 'hash' ? { presetHash: 'f'.repeat(64) } : { id: 'ps_ffffffffffffffffffffffffffffffff' }) }))
  const before = await fs.lstat(file)
  expect(await readSnapshotCache(directory, key)).toBeNull()
  expect((await fs.lstat(file)).mtimeMs).toBe(before.mtimeMs)
})
it('refuses invalid snapshots before creating directories', async () => {
  const directory = await root()
  await expect(writeSnapshotCache(directory, key, { ...snapshot, presetHash: 'f'.repeat(64) })).rejects.toThrow()
  await expect(fs.lstat(directory)).rejects.toMatchObject({ code: 'ENOENT' })
})
it('concurrent identical writes publish one immutable entry and leave no temporary files', async () => {
  const directory = await root()
  await Promise.all(Array.from({ length: 12 }, () => writeSnapshotCache(directory, key, snapshot)))
  expect(await readSnapshotCache(directory, key)).toEqual(snapshot)
  expect(await fs.readdir(directory)).toHaveLength(1)
})
it('refuses a differing valid envelope for the same key without replacing its bytes', async () => {
  const directory = await root()
  await writeSnapshotCache(directory, key, snapshot)
  const original = await fs.readFile(await entry(directory))
  await expect(writeSnapshotCache(directory, key, { ...snapshot, createdAt: '2026-10-28T00:00:00.000Z' })).rejects.toThrow(/different|immutable/i)
  expect(await fs.readFile(await entry(directory))).toEqual(original)
})
it('ignores interrupted temporary writes and never evicts unrelated files', async () => {
  const directory = await root()
  await fs.mkdir(directory, { mode: 0o700 })
  await fs.writeFile(path.join(directory, '.interrupted.tmp'), '{')
  await fs.writeFile(path.join(directory, 'user-data'), 'keep')
  await writeSnapshotCache(directory, key, snapshot)
  expect(await readSnapshotCache(directory, key)).toEqual(snapshot)
  expect(await fs.readFile(path.join(directory, '.interrupted.tmp'), 'utf8')).toBe('{')
  expect(await fs.readFile(path.join(directory, 'user-data'), 'utf8')).toBe('keep')
})
it('cleans up its temporary bytes and fails without a rename fallback when hard links are unavailable', async () => {
  const directory = await root()
  vi.spyOn(fs, 'link').mockRejectedValueOnce(Object.assign(new Error('unsupported filesystem'), { code: 'ENOTSUP' }))
  await expect(writeSnapshotCache(directory, key, snapshot)).rejects.toMatchObject({ code: 'ENOTSUP' })
  expect(await readSnapshotCache(directory, key)).toBeNull()
  expect(await fs.readdir(directory)).toEqual([])
})
it('bounds valid entries to 100 and 16 MiB during writes', async () => {
  const directory = await root()
  for (let i = 0; i < 103; i++) {
    const id = 'ps_' + i.toString(16).padStart(32, '0')
    await writeSnapshotCache(directory, { ...key, reference: id + '@1' }, { ...snapshot, id })
  }
  const files = await fs.readdir(directory)
  expect(files).toHaveLength(100)
  const stats = await Promise.all(files.map(file => fs.stat(path.join(directory, file))))
  expect(stats.reduce((sum, stat) => sum + stat.size, 0)).toBeLessThanOrEqual(16 * 1024 * 1024)
  expect(await readSnapshotCache(directory, { ...key, reference: 'ps_00000000000000000000000000000066@1' })).not.toBeNull()
})
it('refuses repeated new admissions when unknown names exceed bounded capacity accounting', async () => {
  const directory = await root()
  await fs.mkdir(directory, { mode: 0o700 })
  for (let i = 0; i < 401; i++) await fs.writeFile(path.join(directory, `unknown-${i}`), 'unknown sentinel')
  const before = (await fs.readdir(directory)).sort()
  for (let i = 0; i < 3; i++) {
    const id = 'ps_' + i.toString(16).padStart(32, '0')
    await expect(writeSnapshotCache(directory, { ...key, reference: id + '@1' }, { ...snapshot, id })).rejects.toThrow(/capacity/i)
  }
  expect((await fs.readdir(directory)).sort()).toEqual(before)
  expect(await fs.readFile(path.join(directory, 'unknown-400'), 'utf8')).toBe('unknown sentinel')
})
