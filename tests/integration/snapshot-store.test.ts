import { afterEach, beforeAll, expect, it } from 'vitest'
import { mkdtemp, readFile, rm, stat } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { pathToFileURL } from 'node:url'
import { spawn } from 'node:child_process'
import { randomUUID } from 'node:crypto'
import { DatabaseSync } from 'node:sqlite'
import { normalizePublishedPreset } from '@ombelle/compiler'
import { parseSnapshotReference, type ResolvedPreset } from '@ombelle/contracts'
import {
  backupSnapshotStore, initializeSnapshotStore, openSnapshotStore, SqliteSnapshotStore,
} from '../../apps/www/src/snapshots/server/sqlite-store.js'
import type { SnapshotStore } from '../../apps/www/src/snapshots/server/store.js'

const roots: string[] = []
const stores: SnapshotStore[] = []
const connections: DatabaseSync[] = []
const now = Date.UTC(2026, 9, 27, 12)
let preset: ResolvedPreset
beforeAll(async () => {
  preset = await normalizePublishedPreset(JSON.parse(await readFile('examples/preset.example.json', 'utf8')))
})
afterEach(async () => {
  for (const db of connections.splice(0)) db.close()
  for (const store of stores.splice(0)) store.close()
  for (const root of roots.splice(0)) await rm(root, { recursive: true, force: true })
})
async function fixture() {
  const root = await mkdtemp(join(tmpdir(), 'ombelle-snapshot-store-'))
  roots.push(root)
  const path = join(root, 'snapshots.sqlite')
  initializeSnapshotStore(path)
  return path
}
function open(path: string) {
  const store = openSnapshotStore(path)
  stores.push(store)
  return store
}
function raw(path: string) {
  const db = new DatabaseSync(path)
  connections.push(db)
  return db
}
function publish(store: SnapshotStore, overrides: Partial<Parameters<SnapshotStore['publish']>[0]> = {}) {
  return store.publish({ preset, idempotencyKey: randomUUID(), clientKey: 'client-a', now, ...overrides })
}
function reference(snapshot: { id: string }) { return parseSnapshotReference(`${snapshot.id}@1`) }
function totals(db: DatabaseSync) {
  return {
    records: db.prepare('SELECT count(*) AS n FROM snapshots').get()!.n,
    keys: db.prepare('SELECT count(*) AS n FROM idempotency_keys').get()!.n,
    quotas: db.prepare('SELECT * FROM rate_buckets ORDER BY kind, client_key, window').all(),
    capacity: db.prepare('SELECT * FROM capacity').get(),
  }
}
function processPublication(path: string, key: string, executable = process.execPath) {
  const script = `
    import { openSnapshotStore } from ${JSON.stringify(pathToFileURL(resolve('apps/www/src/snapshots/server/sqlite-store.ts')).href)};
    const store = openSnapshotStore(process.argv[1]);
    console.log('ready');
    process.stdin.once('data', () => {
      try { console.log(JSON.stringify(store.publish(JSON.parse(process.argv[2])))); store.close(); process.exit(0) }
      catch (e) { console.error(e.code); store.close(); process.exit(1) }
    });`
  const child = spawn(executable, ['--import', 'tsx', '--input-type=module', '-e', script, path,
    JSON.stringify({ preset, idempotencyKey: key, clientKey: 'client-a', now })], { windowsHide: true })
  let output = '', error = ''
  let readyResolve: () => void, readyReject: (error: Error) => void, isReady = false
  const ready = new Promise<void>((resolve, reject) => { readyResolve = resolve; readyReject = reject })
  child.stdout.on('data', (data) => { output += data; if (output.includes('ready\n')) { isReady = true; readyResolve() } })
  child.stderr.on('data', (data) => { error += data })
  const result = new Promise<ReturnType<SnapshotStore['publish']>>((resolve, reject) => {
    child.on('error', (error) => { readyReject(error); reject(error) })
    child.on('exit', (code) => {
      if (!isReady) readyReject(new Error('Publication child exited before readiness: ' + error))
      if (code !== 0) reject(new Error(error))
      else resolve(JSON.parse(output.trim().split('\n').at(-1)!))
    })
  })
  return { ready, result, start: () => child.stdin.end('publish'), stop: () => child.kill() }
}

it.each(['early exit', 'spawn error'])('rejects child readiness on %s', async (kind) => {
  const path = await fixture()
  const child = processPublication(join(resolve(path, '..'), 'missing.sqlite'), randomUUID(), kind === 'spawn error' ? join(resolve(path, '..'), 'missing-node.exe') : process.execPath)
  try {
    await expect(Promise.race([
      child.ready,
      child.result.catch(() => 'exited before readiness'),
    ])).rejects.toThrow()
  } finally { child.stop(); await child.result.catch(() => {}) }
})

it('one intent commits once across independent connections and survives process restart', async () => {
  const path = await fixture(), key = randomUUID()
  const a = processPublication(path, key), b = processPublication(path, key)
  // Attach result rejection handlers while waiting for readiness too.
  const results = Promise.all([a.result, b.result])
  void results.catch(() => {})
  try {
    await Promise.all([a.ready, b.ready])
    a.start(); b.start()
    const [first, second] = await results
    expect(second.snapshot).toEqual(first.snapshot)
    expect([first.replayed, second.replayed].sort()).toEqual([false, true])
    expect(open(path).lookup(reference(first.snapshot))).toEqual(first.snapshot)
    expect(totals(raw(path))).toMatchObject({ records: 1, keys: 1 })
  } finally {
    a.stop(); b.stop()
    await Promise.allSettled([a.result, b.result])
  }
})

it('binds retry keys globally to content, expires at 24 hours, and preserves previous records', async () => {
  const path = await fixture(), store = open(path), key = randomUUID()
  const first = publish(store, { idempotencyKey: key })
  expect(publish(store, { idempotencyKey: key, clientKey: 'other', now: now + 86_399_999 })).toEqual({ ...first, replayed: true })
  const changed = await normalizePublishedPreset({ ...preset.data, name: 'Different' })
  expect(() => publish(store, { idempotencyKey: key, preset: changed })).toThrow(expect.objectContaining({ code: 'IDEMPOTENCY_CONFLICT', status: 409 }))
  const next = publish(store, { idempotencyKey: key, now: now + 86_400_000 })
  expect(next.replayed).toBe(false)
  expect(next.snapshot.id).not.toBe(first.snapshot.id)
  expect(store.lookup(reference(first.snapshot))).toEqual(first.snapshot)
})

it('recovers committed intent and rate state after a process is killed before sending its response', async () => {
  const path = await fixture(), key = randomUUID()
  const script = `
    import { openSnapshotStore } from ${JSON.stringify(pathToFileURL(resolve('apps/www/src/snapshots/server/sqlite-store.ts')).href)};
    const store = openSnapshotStore(process.argv[1]);
    const input = JSON.parse(process.argv[2]);
    for (let i = 0; i < 5; i++) store.consumeAttempt(input.clientKey, input.now);
    store.publish(input);
    process.kill(process.pid, 'SIGKILL');`
  const child = spawn(process.execPath, ['--import', 'tsx', '--input-type=module', '-e', script, path,
    JSON.stringify({ preset, idempotencyKey: key, clientKey: 'client-a', now })], { windowsHide: true })
  let output = ''
  child.stdout.on('data', (data) => { output += data })
  const exitCode = await new Promise((resolveExit, reject) => {
    child.on('error', reject)
    child.on('exit', resolveExit)
  })
  expect(exitCode).not.toBe(0)
  expect(output).toBe('')
  const reopened = open(path)
  const retry = publish(reopened, { idempotencyKey: key })
  expect(retry.replayed).toBe(true)
  expect(retry.snapshot.preset).toEqual(preset.data)
  expect(retry.snapshot.createdAt).toBe('2026-10-27T12:00:00.000Z')
  expect(() => reopened.consumeAttempt('client-a', now)).toThrow(expect.objectContaining({ status: 429 }))
  expect(totals(raw(path))).toMatchObject({ records: 1, keys: 1 })
})

it('fails closed when a retry mapping points to valid bytes for different content', async () => {
  const path = await fixture(), store = open(path), db = raw(path), key = randomUUID()
  publish(store, { idempotencyKey: key })
  const different = await normalizePublishedPreset({ ...preset.data, name: 'Different preset' })
  const other = publish(store, { preset: different })
  db.prepare('UPDATE idempotency_keys SET snapshot_id = ? WHERE key = ?').run(other.snapshot.id, key)
  expect(() => publish(store, { idempotencyKey: key })).toThrow(expect.objectContaining({ status: 503, code: 'SNAPSHOT_SERVICE_UNAVAILABLE' }))
})

it('persists five attempts per fixed minute across connections and returns boundary Retry-After', async () => {
  const path = await fixture()
  const first = open(path), second = open(path)
  for (let i = 0; i < 5; i++) (i % 2 ? first : second).consumeAttempt('client', now + 30_001)
  expect(() => open(path).consumeAttempt('client', now + 30_001)).toThrow(expect.objectContaining({ status: 429, code: 'RATE_LIMITED', retryAfter: 30 }))
  expect(() => second.consumeAttempt('client', now + 59_999)).toThrow(expect.objectContaining({ status: 429, retryAfter: 1 }))
  expect(() => first.consumeAttempt('other', now + 30_001)).not.toThrow()
  expect(() => second.consumeAttempt('client', now + 60_000)).not.toThrow()
})

it('limits new client publications to twenty per UTC day while replay remains available', async () => {
  const store = open(await fixture()), key = randomUUID()
  const first = publish(store, { idempotencyKey: key })
  for (let i = 1; i < 20; i++) publish(store)
  expect(() => publish(store)).toThrow(expect.objectContaining({ status: 429, retryAfter: 43_200 }))
  expect(() => publish(store, { now: now + 43_199_999 })).toThrow(expect.objectContaining({ status: 429, retryAfter: 1 }))
  expect(publish(store, { idempotencyKey: key }).snapshot).toEqual(first.snapshot)
  expect(() => publish(store, { clientKey: 'other' })).not.toThrow()
  expect(() => publish(store, { now: now + 43_200_000 })).not.toThrow()
})

it('limits global publications to one thousand even after a client identity changes', async () => {
  const path = await fixture(), store = open(path), db = raw(path)
  db.prepare('INSERT INTO rate_buckets(kind, client_key, window, count) VALUES (?, ?, ?, ?)')
    .run('global', '', Math.floor(now / 86_400_000), 999)
  publish(store)
  expect(() => publish(store, { clientKey: 'other' })).toThrow(expect.objectContaining({ status: 429, retryAfter: 43_200 }))
  expect(() => publish(store, { now: now + 43_200_000 })).not.toThrow()
})

it.each(['records', 'bytes'])('refuses %s capacity with unchanged counters and permits existing reads/replay', async (dimension) => {
  const path = await fixture(), store = open(path), db = raw(path), key = randomUUID()
  const first = publish(store, { idempotencyKey: key })
  db.exec(dimension === 'records'
    ? 'UPDATE capacity SET records = 99999'
    : 'UPDATE capacity SET bytes = 536870912 - (SELECT bytes FROM snapshots LIMIT 1)')
  publish(store)
  const before = totals(db)
  expect(() => publish(store)).toThrow(expect.objectContaining({ status: 503, code: 'SNAPSHOT_CAPACITY_REACHED' }))
  expect(totals(db)).toEqual(before)
  expect(store.lookup(reference(first.snapshot))).toEqual(first.snapshot)
  expect(publish(store, { idempotencyKey: key }).replayed).toBe(true)
})

it('retries an ID collision at most three times and rolls back all rejected publication state', async () => {
  const path = await fixture(), db = raw(path), a = 'ps_' + 'a'.repeat(32), b = 'ps_' + 'b'.repeat(32)
  const ids = [a, a, b]
  const store = new SqliteSnapshotStore(path, { randomId: () => ids.shift()! })
  stores.push(store)
  publish(store)
  expect(publish(store).snapshot.id).toBe(b)
  let calls = 0
  const colliding = new SqliteSnapshotStore(path, { randomId: () => { calls++; return a } })
  stores.push(colliding)
  const before = totals(db)
  expect(() => publish(colliding)).toThrow(expect.objectContaining({ code: 'SNAPSHOT_SERVICE_UNAVAILABLE' }))
  expect(calls).toBe(3)
  expect(totals(db)).toEqual(before)
})

it('rolls back the record, mapping and quota together when retry mapping insertion fails', async () => {
  const path = await fixture(), store = open(path), db = raw(path)
  db.exec("CREATE TRIGGER fail_mapping BEFORE INSERT ON idempotency_keys BEGIN SELECT RAISE(ABORT, 'fixture failure'); END")
  const before = totals(db)
  expect(() => publish(store)).toThrow(expect.objectContaining({ code: 'SNAPSHOT_SERVICE_UNAVAILABLE' }))
  expect(totals(db)).toEqual(before)
  db.exec('DROP TRIGGER fail_mapping')
  expect(() => publish(store)).not.toThrow()
})

it('bounds lock waiting and exposes no SQLite details on contention', async () => {
  const path = await fixture(), store = open(path), db = raw(path)
  db.exec('BEGIN IMMEDIATE')
  const start = performance.now()
  try {
    expect(() => publish(store)).toThrow(expect.objectContaining({ status: 503, code: 'SNAPSHOT_SERVICE_UNAVAILABLE' }))
    expect(performance.now() - start).toBeGreaterThanOrEqual(200)
    expect(performance.now() - start).toBeLessThan(2_000)
  } finally { db.exec('ROLLBACK') }
  expect(totals(db).records).toBe(0)
})

it('opens only explicitly initialized schemas and rejects unknown/future schema versions', async () => {
  const path = await fixture(), missing = join(resolve(path, '..'), 'missing.sqlite')
  expect(() => openSnapshotStore(missing)).toThrow(expect.objectContaining({ code: 'SNAPSHOT_SERVICE_UNAVAILABLE' }))
  await expect(stat(missing)).rejects.toMatchObject({ code: 'ENOENT' })
  const empty = join(resolve(path, '..'), 'empty.sqlite')
  raw(empty)
  expect(() => openSnapshotStore(empty)).toThrow(expect.objectContaining({ code: 'SNAPSHOT_SERVICE_UNAVAILABLE' }))
  const db = raw(path)
  db.exec('PRAGMA user_version = 2')
  expect(() => openSnapshotStore(path)).toThrow(expect.objectContaining({ code: 'SNAPSHOT_SERVICE_UNAVAILABLE' }))
  expect(() => initializeSnapshotStore(path)).toThrow(expect.objectContaining({ code: 'SNAPSHOT_SERVICE_UNAVAILABLE' }))
  expect(db.prepare('PRAGMA user_version').get()!.user_version).toBe(2)
})

it('rejects SQL UPDATE, DELETE, and replacement of immutable records', async () => {
  const path = await fixture(), store = open(path), db = raw(path), first = publish(store)
  expect(() => db.exec("UPDATE snapshots SET response = '{}'")).toThrow()
  expect(() => db.exec('DELETE FROM snapshots')).toThrow()
  expect(() => db.exec('INSERT OR REPLACE INTO snapshots SELECT * FROM snapshots')).toThrow()
  expect(store.lookup(reference(first.snapshot))).toEqual(first.snapshot)
})

it('withdraws fresh reads and replays without mutating bytes and restores availability explicitly', async () => {
  const path = await fixture(), store = open(path), db = raw(path), key = randomUUID()
  const first = publish(store, { idempotencyKey: key }), ref = reference(first.snapshot)
  const bytes = db.prepare('SELECT response FROM snapshots').get()!.response
  store.withdraw(ref, 'security', now)
  expect(() => open(path).lookup(ref)).toThrow(expect.objectContaining({ status: 410, code: 'SNAPSHOT_WITHDRAWN' }))
  expect(() => publish(store, { idempotencyKey: key })).toThrow(expect.objectContaining({ status: 410 }))
  expect(db.prepare('SELECT response FROM snapshots').get()!.response).toBe(bytes)
  store.unwithdraw(ref)
  expect(store.lookup(ref)).toEqual(first.snapshot)
  expect(publish(store, { idempotencyKey: key }).replayed).toBe(true)
  const unknown = parseSnapshotReference('ps_' + '0'.repeat(32) + '@1')
  expect(() => store.withdraw(unknown, 'abuse', now)).toThrow(expect.objectContaining({ status: 404 }))
  expect(() => store.unwithdraw(unknown)).toThrow(expect.objectContaining({ status: 404 }))
  expect(() => store.lookup(unknown)).toThrow(expect.objectContaining({ status: 404 }))
})

it.each(['bytes', 'canonical bytes', 'hash', 'presetHash', 'preset content hash', 'identity', 'schema'])('fails closed on corrupt stored %s', async (kind) => {
  const path = await fixture(), store = open(path), db = raw(path), first = publish(store), ref = reference(first.snapshot)
  db.exec('DROP TRIGGER snapshots_no_update')
  if (kind === 'bytes') {
    db.exec('PRAGMA ignore_check_constraints = ON; UPDATE snapshots SET bytes = bytes + 1')
  }
  else if (kind === 'hash') db.exec("UPDATE snapshots SET response_hash = '" + '0'.repeat(64) + "'")
  else if (kind === 'presetHash') db.exec("UPDATE snapshots SET preset_hash = '" + '0'.repeat(64) + "'")
  else {
    const value = {
      ...first.snapshot,
      ...(kind === 'identity' ? { id: 'ps_' + 'f'.repeat(32) }
        : kind === 'preset content hash' ? { presetHash: '0'.repeat(64) }
          : kind === 'schema' ? { extra: true } : {}),
    }
    const { canonicalize } = await import('@ombelle/compiler')
    const { createHash } = await import('node:crypto')
    const response = canonicalize(value) + (kind === 'canonical bytes' ? ' ' : '')
    db.prepare('UPDATE snapshots SET response = ?, response_hash = ?, bytes = ?, preset_hash = ?')
      .run(response, createHash('sha256').update(response).digest('hex'), Buffer.byteLength(response), value.presetHash)
  }
  expect(() => store.lookup(ref)).toThrow(expect.objectContaining({ status: 503, code: 'SNAPSHOT_SERVICE_UNAVAILABLE' }))
})

it('backs up committed WAL data and restores records, keys, quotas and withdrawals consistently', async () => {
  const path = await fixture(), store = open(path), db = raw(path), key = randomUUID()
  db.exec('PRAGMA wal_autocheckpoint = 0')
  const first = publish(store, { idempotencyKey: key }), second = publish(store)
  store.consumeAttempt('client-a', now)
  store.withdraw(reference(second.snapshot), 'operator-request', now)
  expect((await stat(path + '-wal')).size).toBeGreaterThan(0)
  expect((await stat(path + '-shm')).size).toBeGreaterThan(0)
  const destination = join(resolve(path, '..'), 'backup.sqlite')
  await backupSnapshotStore(path, destination)
  const restored = open(destination)
  expect(restored.lookup(reference(first.snapshot))).toEqual(first.snapshot)
  expect(publish(restored, { idempotencyKey: key }).replayed).toBe(true)
  expect(() => restored.lookup(reference(second.snapshot))).toThrow(expect.objectContaining({ status: 410 }))
  expect(totals(raw(destination))).toEqual(totals(db))
  await expect(backupSnapshotStore(path, destination)).rejects.toThrow()
  expect(restored.lookup(reference(first.snapshot))).toEqual(first.snapshot)
})

it('cleans expired retry and quota rows in bounded batches without expiring snapshots', async () => {
  const path = await fixture(), store = open(path), db = raw(path)
  const first = publish(store)
  const key = db.prepare('INSERT INTO idempotency_keys(key, preset_hash, snapshot_id, expires_at) VALUES (?, ?, ?, ?)')
  const bucket = db.prepare('INSERT INTO rate_buckets(kind, client_key, window, count) VALUES (?, ?, ?, ?)')
  db.exec('BEGIN')
  for (let i = 0; i < 400; i++) {
    key.run(randomUUID(), preset.hash, first.snapshot.id, 0)
    bucket.run('attempt', `expired-${i}`, 0, 1)
  }
  db.exec('COMMIT')
  publish(store)
  const remaining = db.prepare('SELECT count(*) AS n FROM idempotency_keys WHERE expires_at = 0').get()!.n as number
  expect(remaining).toBeGreaterThan(0)
  expect(remaining).toBeLessThan(400)
  const remainingBuckets = db.prepare('SELECT count(*) AS n FROM rate_buckets WHERE window = 0').get()!.n as number
  expect(remainingBuckets).toBeGreaterThan(0)
  expect(remainingBuckets).toBeLessThan(400)
  expect(store.lookup(reference(first.snapshot))).toEqual(first.snapshot)
})
