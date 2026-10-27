import { afterEach, expect, it } from 'vitest'
import { mkdtemp, readFile, rm, stat } from 'node:fs/promises'
import { join, resolve } from 'node:path'
import { tmpdir } from 'node:os'
import { spawn } from 'node:child_process'
import { randomUUID } from 'node:crypto'
import { DatabaseSync } from 'node:sqlite'
import { normalizePublishedPreset } from '@ombelle/compiler'
import { parseSnapshotReference } from '@ombelle/contracts'
import { openSnapshotStore } from '../../apps/www/src/snapshots/server/sqlite-store.js'

const roots: string[] = []
afterEach(async () => {
  for (const root of roots.splice(0)) await rm(root, { recursive: true, force: true })
})
async function fixture() {
  const root = await mkdtemp(join(tmpdir(), 'ombelle-snapshot-command-'))
  roots.push(root)
  return { path: join(root, 'snapshots.sqlite'), backup: join(root, 'backup.sqlite') }
}
function command(args: string[], path?: string): Promise<{ code: number | null; out: string; err: string }> {
  return new Promise((resolveResult, reject) => {
    const child = spawn(process.execPath, ['--import', 'tsx', resolve('scripts/snapshot-store.ts'), ...args], {
      windowsHide: true, env: { ...process.env, OMBELLE_SNAPSHOT_DB_PATH: path },
    })
    let out = '', err = ''
    child.stdout.on('data', (data) => { out += data })
    child.stderr.on('data', (data) => { err += data })
    child.on('error', reject)
    child.on('exit', (code) => resolveResult({ code, out, err }))
  })
}
it('runs explicit init/withdraw/unwithdraw/backup commands without printing preset data or keys', async () => {
  const { path, backup } = await fixture()
  expect((await command(['init'], path)).code).toBe(0)
  expect((await command(['init'], path)).code).toBe(0)
  const store = openSnapshotStore(path), key = randomUUID()
  const preset = await normalizePublishedPreset(JSON.parse(await readFile('examples/preset.example.json', 'utf8')))
  let snapshot
  try { snapshot = store.publish({ preset, clientKey: 'private-client', idempotencyKey: key, now: Date.now() }).snapshot }
  finally { store.close() }
  const reference = `${snapshot.id}@1`
  const withdrawn = await command(['withdraw', reference, '--reason', 'abuse'], path)
  expect(withdrawn.code).toBe(0)
  const reopened = openSnapshotStore(path)
  try { expect(() => reopened.lookup(parseSnapshotReference(reference))).toThrow(expect.objectContaining({ status: 410 })) }
  finally { reopened.close() }
  expect((await command(['backup', backup], path)).code).toBe(0)
  const recovered = await command(['unwithdraw', reference], backup)
  expect(recovered.code).toBe(0)
  const restored = openSnapshotStore(backup)
  try { expect(restored.lookup(parseSnapshotReference(reference))).toEqual(snapshot) }
  finally { restored.close() }
  for (const result of [withdrawn, recovered]) {
    expect(result.out + result.err).not.toContain(key)
    expect(result.out + result.err).not.toContain(preset.data.name)
    expect(result.out + result.err).not.toContain('private-client')
  }
  const before = await readFile(backup)
  expect((await command(['backup', backup], path)).code).not.toBe(0)
  expect(await readFile(backup)).toEqual(before)
})

it('refuses invalid arguments, missing initialization and future schemas without creating databases', async () => {
  const { path, backup } = await fixture()
  for (const args of [[], ['unknown'], ['withdraw', 'bad', '--reason', 'abuse'], ['withdraw', 'ps_' + '0'.repeat(32) + '@1', '--reason', 'private-reason'], ['backup', backup, '--extra']]) {
    const result = await command(args, path)
    expect(result.code).not.toBe(0)
    expect(result.err).not.toContain(path)
    expect(result.err).not.toContain('private-reason')
  }
  expect((await command(['backup', backup], path)).code).not.toBe(0)
  await expect(stat(path)).rejects.toMatchObject({ code: 'ENOENT' })
  await expect(stat(backup)).rejects.toMatchObject({ code: 'ENOENT' })
  expect((await command(['init'])).code).not.toBe(0)
  expect((await command(['init'], 'relative.sqlite')).code).not.toBe(0)
  const db = new DatabaseSync(path)
  db.exec('PRAGMA user_version = 999')
  db.close()
  expect((await command(['init'], path)).code).not.toBe(0)
  expect((await command(['backup', backup], path)).code).not.toBe(0)
  await expect(stat(backup)).rejects.toMatchObject({ code: 'ENOENT' })
})
