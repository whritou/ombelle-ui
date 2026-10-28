import { createHash, randomBytes } from 'node:crypto'
import { closeSync, openSync, unlinkSync } from 'node:fs'
import { isAbsolute } from 'node:path'
import { pathToFileURL } from 'node:url'
import { backup, DatabaseSync } from 'node:sqlite'
import {
  parseSnapshotReference, validatePreset, validatePresetSnapshot,
  type PresetSnapshot, type SnapshotReference,
} from '@ombelle/contracts'
import { canonicalize } from '@ombelle/compiler'
import { SnapshotServiceError } from './errors'
import type { PublishSnapshotInput, SnapshotStore, WithdrawalReason } from './store'

const schemaVersion = 1
const minuteMs = 60_000
const dayMs = 86_400_000
const maxRecords = 100_000
const maxBytes = 512 * 1024 * 1024
const maxResponseBytes = 128 * 1024
const cleanupBatch = 100
const reasons: readonly WithdrawalReason[] = ['abuse', 'security', 'operator-request']

function unavailable(): SnapshotServiceError {
  return new SnapshotServiceError({ status: 503, code: 'SNAPSHOT_SERVICE_UNAVAILABLE' })
}
function storageError(error: unknown): never {
  throw error instanceof SnapshotServiceError ? error : unavailable()
}
function sha256(value: string): string {
  return createHash('sha256').update(value, 'utf8').digest('hex')
}
function fileUri(path: string, mode: 'rw' | 'ro'): string {
  if (!isAbsolute(path) || path.includes('\0')) throw unavailable()
  const uri = pathToFileURL(path)
  uri.searchParams.set('mode', mode)
  return uri.href
}
function version(db: DatabaseSync): number {
  return db.prepare('PRAGMA user_version').get()!.user_version as number
}
function verifySchema(db: DatabaseSync): void {
  if (version(db) !== schemaVersion) throw unavailable()
  // Opening a request connection verifies the known schema; it never runs DDL.
  for (const table of ['snapshots', 'idempotency_keys', 'rate_buckets', 'withdrawals', 'capacity'])
    if (!db.prepare("SELECT 1 FROM sqlite_schema WHERE type = 'table' AND name = ?").get(table))
      throw unavailable()
  for (const trigger of ['snapshots_no_update', 'snapshots_no_delete', 'snapshots_no_replace', 'snapshots_capacity'])
    if (!db.prepare("SELECT 1 FROM sqlite_schema WHERE type = 'trigger' AND name = ?").get(trigger))
      throw unavailable()
  if (db.prepare('PRAGMA journal_mode').get()!.journal_mode !== 'wal') throw unavailable()
}
function connect(path: string, readOnly = false): DatabaseSync {
  let db: DatabaseSync | undefined
  try {
    // URI mode=rw is deliberate: the default SQLite open would create a file.
    db = new DatabaseSync(fileUri(path, readOnly ? 'ro' : 'rw'), { readOnly, timeout: 250 })
    verifySchema(db)
    db.exec('PRAGMA foreign_keys = ON; PRAGMA synchronous = FULL; PRAGMA recursive_triggers = ON')
    return db
  } catch (error) {
    db?.close()
    return storageError(error)
  }
}

const schema = `
  CREATE TABLE snapshots (
    id TEXT PRIMARY KEY CHECK(length(id) = 35 AND substr(id, 1, 3) = 'ps_' AND substr(id, 4) NOT GLOB '*[^0-9a-f]*'),
    revision INTEGER NOT NULL CHECK(revision = 1),
    response TEXT NOT NULL,
    response_hash TEXT NOT NULL CHECK(length(response_hash) = 64 AND response_hash NOT GLOB '*[^0-9a-f]*'),
    preset_hash TEXT NOT NULL CHECK(length(preset_hash) = 64 AND preset_hash NOT GLOB '*[^0-9a-f]*'),
    bytes INTEGER NOT NULL CHECK(bytes > 0 AND bytes <= 131072 AND bytes = length(CAST(response AS BLOB)))
  ) STRICT;
  CREATE TABLE capacity (
    singleton INTEGER PRIMARY KEY CHECK(singleton = 1),
    records INTEGER NOT NULL CHECK(records >= 0 AND records <= 100000),
    bytes INTEGER NOT NULL CHECK(bytes >= 0 AND bytes <= 536870912)
  ) STRICT;
  INSERT INTO capacity VALUES (1, 0, 0);
  CREATE TRIGGER snapshots_no_update BEFORE UPDATE ON snapshots
    BEGIN SELECT RAISE(ABORT, 'immutable snapshot'); END;
  CREATE TRIGGER snapshots_no_delete BEFORE DELETE ON snapshots
    BEGIN SELECT RAISE(ABORT, 'immutable snapshot'); END;
  CREATE TRIGGER snapshots_no_replace BEFORE INSERT ON snapshots
    WHEN EXISTS (SELECT 1 FROM snapshots WHERE id = NEW.id)
    BEGIN SELECT RAISE(ABORT, 'immutable snapshot'); END;
  CREATE TRIGGER snapshots_capacity AFTER INSERT ON snapshots
    BEGIN UPDATE capacity SET records = records + 1, bytes = bytes + NEW.bytes WHERE singleton = 1; END;
  CREATE TABLE idempotency_keys (
    key TEXT PRIMARY KEY,
    preset_hash TEXT NOT NULL,
    snapshot_id TEXT NOT NULL REFERENCES snapshots(id),
    expires_at INTEGER NOT NULL
  ) STRICT;
  CREATE INDEX idempotency_expiry ON idempotency_keys(expires_at);
  CREATE TABLE rate_buckets (
    kind TEXT NOT NULL CHECK(kind IN ('attempt', 'client', 'global')),
    client_key TEXT NOT NULL,
    window INTEGER NOT NULL,
    count INTEGER NOT NULL CHECK(count >= 0),
    PRIMARY KEY(kind, client_key, window)
  ) STRICT;
  CREATE INDEX rate_bucket_expiry ON rate_buckets(kind, window);
  CREATE TABLE withdrawals (
    snapshot_id TEXT PRIMARY KEY REFERENCES snapshots(id),
    reason TEXT NOT NULL CHECK(reason IN ('abuse', 'security', 'operator-request')),
    withdrawn_at INTEGER NOT NULL
  ) STRICT;
  PRAGMA user_version = 1;
`

export function initializeSnapshotStore(path: string): void {
  let db: DatabaseSync | undefined
  try {
    // Only this explicit operator entry point permits creation and migrations.
    fileUri(path, 'rw')
    db = new DatabaseSync(path, { timeout: 250 })
    if (![0, schemaVersion].includes(version(db))) throw unavailable()
    db.exec('PRAGMA journal_mode = WAL; PRAGMA synchronous = FULL; PRAGMA foreign_keys = ON')
    db.exec('BEGIN IMMEDIATE')
    try {
      const current = version(db)
      if (current === 0) {
        if (db.prepare("SELECT 1 FROM sqlite_schema WHERE name NOT LIKE 'sqlite_%' LIMIT 1").get())
          throw unavailable()
        db.exec(schema)
      } else if (current !== schemaVersion) throw unavailable()
      verifySchema(db)
      db.exec('COMMIT')
    } catch (error) {
      db.exec('ROLLBACK')
      throw error
    }
  } catch (error) { storageError(error) }
  finally { db?.close() }
}

export function openSnapshotStore(path: string): SnapshotStore {
  return new SqliteSnapshotStore(path)
}

// Options are constructor-only for deterministic collision tests; publication
// input can never select an ID or override the service clock.
export class SqliteSnapshotStore implements SnapshotStore {
  private readonly db: DatabaseSync
  private readonly randomId: () => string
  constructor(path: string, options: { randomId?: () => string } = {}) {
    this.db = connect(path)
    this.randomId = options.randomId ?? (() => 'ps_' + randomBytes(16).toString('hex'))
  }

  private transaction<T>(operation: () => T): T {
    try {
      this.db.exec('BEGIN IMMEDIATE')
      try {
        const result = operation()
        this.db.exec('COMMIT')
        return result
      } catch (error) {
        this.db.exec('ROLLBACK')
        throw error
      }
    } catch (error) { return storageError(error) }
  }

  private cleanup(now: number): void {
    this.db.prepare(`DELETE FROM idempotency_keys WHERE rowid IN
      (SELECT rowid FROM idempotency_keys WHERE expires_at <= ? ORDER BY expires_at LIMIT ?)`)
      .run(now, cleanupBatch)
    this.db.prepare(`DELETE FROM rate_buckets WHERE rowid IN
      (SELECT rowid FROM rate_buckets WHERE (kind = 'attempt' AND window < ?)
      OR (kind IN ('client', 'global') AND window < ?) LIMIT ?)`)
      .run(Math.floor(now / minuteMs), Math.floor(now / dayMs), cleanupBatch)
  }

  private assertQuota(kind: string, client: string, now: number, duration: number, limit: number): void {
    const window = Math.floor(now / duration)
    const bucket = this.db.prepare('SELECT count FROM rate_buckets WHERE kind = ? AND client_key = ? AND window = ?')
      .get(kind, client, window)
    if (bucket && (bucket.count as number) >= limit)
      throw new SnapshotServiceError({
        status: 429, code: 'RATE_LIMITED', retryAfter: Math.ceil(((window + 1) * duration - now) / 1000),
      })
  }
  private increment(kind: string, client: string, now: number, duration: number): void {
    this.db.prepare(`INSERT INTO rate_buckets(kind, client_key, window, count) VALUES (?, ?, ?, 1)
      ON CONFLICT(kind, client_key, window) DO UPDATE SET count = count + 1`)
      .run(kind, client, Math.floor(now / duration))
  }

  consumeAttempt(clientKey: string, now: number): void {
    this.transaction(() => {
      this.cleanup(now)
      this.assertQuota('attempt', clientKey, now, minuteMs, 5)
      this.increment('attempt', clientKey, now, minuteMs)
    })
  }

  publish(input: PublishSnapshotInput): { snapshot: PresetSnapshot; replayed: boolean } {
    // The service resolves sparse presets before calling this synchronous port.
    // Validate and hash outside the write transaction as a defense at the port.
    let presetText: string
    try {
      validatePreset(input.preset.data)
      presetText = canonicalize(input.preset.data)
      if (Buffer.byteLength(presetText) > 65_536)
        throw new SnapshotServiceError({ status: 413, code: 'PAYLOAD_TOO_LARGE' })
      if (sha256(presetText) !== input.preset.hash) throw unavailable()
    } catch (error) { return storageError(error) }
    const createdAt = new Date(input.now).toISOString()
    return this.transaction(() => {
      const prior = this.db.prepare('SELECT preset_hash, snapshot_id FROM idempotency_keys WHERE key = ? AND expires_at > ?')
        .get(input.idempotencyKey, input.now)
      if (prior) {
        if (prior.preset_hash !== input.preset.hash)
          throw new SnapshotServiceError({ status: 409, code: 'IDEMPOTENCY_CONFLICT' })
        const snapshot = this.lookup({ id: prior.snapshot_id as string, revision: 1 })
        if (snapshot.presetHash !== input.preset.hash) throw unavailable()
        return { snapshot, replayed: true }
      }
      this.cleanup(input.now)
      this.assertQuota('client', input.clientKey, input.now, dayMs, 20)
      this.assertQuota('global', '', input.now, dayMs, 1000)
      for (let attempt = 0; attempt < 3; attempt++) {
        const id = this.randomId()
        if (this.db.prepare('SELECT 1 FROM snapshots WHERE id = ?').get(id)) continue
        const snapshot = validatePresetSnapshot({
          snapshotVersion: '1.0', id, revision: 1, preset: input.preset.data, presetHash: input.preset.hash,
          catalogRelease: '0.1.0', compilerVersion: '0.1.0', createdAt, validationStatus: 'draft',
        })
        const response = canonicalize(snapshot), bytes = Buffer.byteLength(response)
        const capacity = this.db.prepare('SELECT records, bytes FROM capacity WHERE singleton = 1').get()
        if (!capacity) throw unavailable()
        if ((capacity.records as number) >= maxRecords || (capacity.bytes as number) + bytes > maxBytes)
          throw new SnapshotServiceError({ status: 503, code: 'SNAPSHOT_CAPACITY_REACHED' })
        if (bytes > maxResponseBytes) throw unavailable()
        this.db.prepare('INSERT INTO snapshots(id, revision, response, response_hash, preset_hash, bytes) VALUES (?, 1, ?, ?, ?, ?)')
          .run(id, response, sha256(response), input.preset.hash, bytes)
        this.db.prepare('DELETE FROM idempotency_keys WHERE key = ? AND expires_at <= ?')
          .run(input.idempotencyKey, input.now)
        this.db.prepare('INSERT INTO idempotency_keys(key, preset_hash, snapshot_id, expires_at) VALUES (?, ?, ?, ?)')
          .run(input.idempotencyKey, input.preset.hash, id, input.now + dayMs)
        this.increment('client', input.clientKey, input.now, dayMs)
        this.increment('global', '', input.now, dayMs)
        return { snapshot, replayed: false }
      }
      throw unavailable()
    })
  }

  lookup(ref: SnapshotReference): PresetSnapshot {
    try {
      parseSnapshotReference(`${ref.id}@${ref.revision}`)
      const row = this.db.prepare(`SELECT snapshots.*, withdrawals.snapshot_id AS withdrawn
        FROM snapshots LEFT JOIN withdrawals ON withdrawals.snapshot_id = snapshots.id
        WHERE snapshots.id = ? AND snapshots.revision = ?`).get(ref.id, ref.revision)
      if (!row) throw new SnapshotServiceError({ status: 404, code: 'SNAPSHOT_NOT_FOUND' })
      if (row.withdrawn !== null) throw new SnapshotServiceError({ status: 410, code: 'SNAPSHOT_WITHDRAWN' })
      if (typeof row.response !== 'string' || Buffer.byteLength(row.response) !== row.bytes || (row.bytes as number) > maxResponseBytes)
        throw unavailable()
      const snapshot = validatePresetSnapshot(JSON.parse(row.response))
      if (
        snapshot.id !== ref.id || snapshot.revision !== ref.revision ||
        snapshot.presetHash !== row.preset_hash || canonicalize(snapshot) !== row.response ||
        sha256(row.response) !== row.response_hash || sha256(canonicalize(snapshot.preset)) !== snapshot.presetHash
      ) throw unavailable()
      return snapshot
    } catch (error) { return storageError(error) }
  }

  withdraw(ref: SnapshotReference, reason: WithdrawalReason, now: number): void {
    if (!reasons.includes(reason)) throw unavailable()
    this.transaction(() => {
      this.assertExists(ref)
      this.db.prepare(`INSERT INTO withdrawals(snapshot_id, reason, withdrawn_at) VALUES (?, ?, ?)
        ON CONFLICT(snapshot_id) DO UPDATE SET reason = excluded.reason, withdrawn_at = excluded.withdrawn_at`)
        .run(ref.id, reason, now)
    })
  }
  unwithdraw(ref: SnapshotReference): void {
    this.transaction(() => {
      this.assertExists(ref)
      this.db.prepare('DELETE FROM withdrawals WHERE snapshot_id = ?').run(ref.id)
    })
  }
  private assertExists(ref: SnapshotReference): void {
    parseSnapshotReference(`${ref.id}@${ref.revision}`)
    if (!this.db.prepare('SELECT 1 FROM snapshots WHERE id = ? AND revision = ?').get(ref.id, ref.revision))
      throw new SnapshotServiceError({ status: 404, code: 'SNAPSHOT_NOT_FOUND' })
  }
  close(): void { this.db.close() }
}

export async function backupSnapshotStore(source: string, destination: string): Promise<void> {
  let db: DatabaseSync | undefined
  let ownsDestination = false
  try {
    fileUri(destination, 'rw')
    db = connect(source, true)
    // Exclusive creation refuses existing files, symlinks, and the source itself.
    closeSync(openSync(destination, 'wx', 0o600))
    ownsDestination = true
    await backup(db, destination)
  } catch (error) {
    if (ownsDestination) {
      try { unlinkSync(destination) } catch { /* Preserve the original safe failure. */ }
    }
    storageError(error)
  } finally { db?.close() }
}
