import { afterEach, beforeAll, expect, it } from 'vitest'
import { mkdtemp, readFile, rm } from 'node:fs/promises'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { randomUUID, createHash } from 'node:crypto'
import { DatabaseSync } from 'node:sqlite'
import { canonicalize, normalizePublishedPreset, normalizePublishedRecipe } from '@ombelle/compiler'
import example from '../../examples/recipe.example.json'
import presetExample from '../../examples/preset.example.json'
import { initializeSnapshotStore, openSnapshotStore, SqliteSnapshotStore } from '../../apps/www/src/snapshots/server/sqlite-store.js'
import { publicationNow, publicationStoreContract } from '../helpers/publication-store-contract.js'

const roots: string[] = []
afterEach(async () => { for (const root of roots.splice(0)) await rm(root, { recursive: true, force: true }) })
async function database() {
  const root = await mkdtemp(join(tmpdir(), 'ombelle-recipe-store-'))
  roots.push(root)
  const path = join(root, 'snapshot.sqlite')
  initializeSnapshotStore(path)
  return path
}
publicationStoreContract('SQLite publication contract', async () => {
  const path = await database(), stores = [openSnapshotStore(path)]
  return { store: stores[0], reopen: async () => { const store = openSnapshotStore(path); stores.push(store); return store }, close: async () => { for (const store of stores) store.close() } }
})
it('enforces the combined 256 MiB capacity before changing either publication kind', async () => {
  const path = await database(), store = openSnapshotStore(path), raw = new DatabaseSync(path)
  try {
    const compiled = await normalizePublishedRecipe(example)
    raw.exec('UPDATE capacity SET bytes = 268435456')
    expect(() => store.publishRecipe({ compiled, idempotencyKey: randomUUID(), clientKey: 'client', now: publicationNow })).toThrow(expect.objectContaining({ code: 'SNAPSHOT_CAPACITY_REACHED' }))
    expect(raw.prepare('SELECT * FROM capacity').get()).toMatchObject({ records: 0, bytes: 268435456 })
  } finally { raw.close(); store.close() }
})
it('protects recipe rows against update, delete and replacement', async () => {
  const path = await database(), store = openSnapshotStore(path), raw = new DatabaseSync(path)
  try {
    store.publishRecipe({ compiled: await normalizePublishedRecipe(example), idempotencyKey: randomUUID(), clientKey: 'client', now: publicationNow })
    for (const sql of ["UPDATE recipe_snapshots SET response = '{}'", 'DELETE FROM recipe_snapshots', 'INSERT OR REPLACE INTO recipe_snapshots SELECT * FROM recipe_snapshots'])
      expect(() => raw.exec(sql)).toThrow()
  } finally { raw.close(); store.close() }
})
it('rolls back recipe insertion and counters when retry insertion fails', async () => {
  const path = await database(), store = openSnapshotStore(path), raw = new DatabaseSync(path)
  try {
    raw.exec("CREATE TRIGGER fail_recipe_key BEFORE INSERT ON recipe_idempotency_keys BEGIN SELECT RAISE(ABORT, 'fixture failure'); END")
    expect(() => store.publishRecipe({ compiled: compiledFixture, idempotencyKey: randomUUID(), clientKey: 'client', now: publicationNow })).toThrow()
    expect(raw.prepare('SELECT * FROM capacity').get()).toMatchObject({ records: 0, bytes: 0 })
    expect(raw.prepare('SELECT count(*) AS n FROM recipe_snapshots').get()!.n).toBe(0)
  } finally { raw.close(); store.close() }
})
let compiledFixture: Awaited<ReturnType<typeof normalizePublishedRecipe>>
beforeAll(async () => { compiledFixture = await normalizePublishedRecipe(example) })

it('bounds recipe ID collision retries to three and leaves no partial quotas', async () => {
  const path = await database(), id = 'rc_' + 'a'.repeat(32)
  let calls = 0
  const store = new SqliteSnapshotStore(path, { randomRecipeId: () => { calls++; return id } })
  try {
    const input = { compiled: compiledFixture, idempotencyKey: randomUUID(), clientKey: 'client', now: publicationNow }
    store.publishRecipe(input)
    calls = 0
    expect(() => store.publishRecipe({ ...input, idempotencyKey: randomUUID() })).toThrow()
    expect(calls).toBe(3)
  } finally { store.close() }
})
it('explicitly migrates a historical v1 database while preserving published bytes', async () => {
  const root = await mkdtemp(join(tmpdir(), 'ombelle-v1-migration-')); roots.push(root)
  const path = join(root, 'legacy.sqlite'), raw = new DatabaseSync(path)
  const preset = await normalizePublishedPreset(presetExample)
  const snapshot = { snapshotVersion: '1.0', id: 'ps_' + 'a'.repeat(32), revision: 1, preset: preset.data, presetHash: preset.hash, catalogRelease: '0.1.0', compilerVersion: '0.1.0', createdAt: '2026-11-01T12:00:00.000Z', validationStatus: 'draft' }
  const text = canonicalize(snapshot)
  try {
    raw.exec('PRAGMA journal_mode = WAL')
    raw.exec(await readFile('tests/fixtures/snapshot-store-v1.sql', 'utf8'))
    raw.prepare('INSERT INTO snapshots VALUES (?, 1, ?, ?, ?, ?)').run(snapshot.id, text, createHash('sha256').update(text).digest('hex'), preset.hash, Buffer.byteLength(text))
    let premature: SqliteSnapshotStore | undefined
    try { expect(() => { premature = openSnapshotStore(path) }).toThrow() }
    finally { premature?.close() }
    initializeSnapshotStore(path)
    initializeSnapshotStore(path)
    expect(raw.prepare('PRAGMA user_version').get()!.user_version).toBe(2)
    const store = openSnapshotStore(path)
    try { expect(store.lookup({ id: snapshot.id, revision: 1 })).toEqual(snapshot) } finally { store.close() }
    expect(raw.prepare('SELECT response FROM snapshots').get()!.response).toBe(text)
  } finally { raw.close() }
})
