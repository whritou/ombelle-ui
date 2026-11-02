import { afterAll, expect, it } from 'vitest'
import { randomBytes, randomUUID } from 'node:crypto'
import { normalizePublishedPreset, normalizePublishedRecipe } from '@ombelle/compiler'
import preset from '../../examples/preset.example.json'
import recipe from '../../examples/recipe.example.json'
import { publicationNow, publicationStoreContract } from '../helpers/publication-store-contract.js'
import { openPostgresSnapshotStore, closePostgresPools } from '../../apps/www/src/snapshots/server/postgres-store.js'
import { initializePostgresSnapshotStore } from '../../apps/www/src/snapshots/server/postgres-migrations.js'
import { createPostgresPool } from '../../apps/www/src/snapshots/server/postgres-pool.js'

const connection = process.env.OMBELLE_POSTGRES_TEST_DATABASE_URL
const direct = process.env.OMBELLE_POSTGRES_TEST_DIRECT_URL
const expectedHost = process.env.OMBELLE_POSTGRES_TEST_EXPECTED_HOST
if (process.env.OMBELLE_POSTGRES_TEST_BRANCH !== 'dev-hosted-install-codes' || !connection || !direct || !expectedHost ||
    new URL(connection).hostname !== expectedHost || new URL(direct).hostname !== expectedHost.replace('-pooler.', '.'))
  throw new Error('Hosted storage tests require explicitly configured isolated dev-hosted-install-codes branch credentials; production is not a test target.')

const raw = createPostgresPool(direct)
const schemas: string[] = []
afterAll(async () => {
  await closePostgresPools()
  for (const schema of schemas) {
    if (!/^ombelle_test_[a-f0-9]{16}$/.test(schema)) throw new Error('Unsafe test cleanup target')
    await raw.query(`DROP SCHEMA IF EXISTS "${schema}" CASCADE`)
  }
  await raw.end()
})
function schemaName() { const value = 'ombelle_test_' + randomBytes(8).toString('hex'); schemas.push(value); return value }
async function fixture() {
  const schema = schemaName()
  await initializePostgresSnapshotStore(direct!, schema)
  const store = await openPostgresSnapshotStore(connection!, { schema })
  return { store, schema, reopen: () => openPostgresSnapshotStore(connection!, { schema }), close: async () => { await store.close() } }
}
publicationStoreContract('Neon Postgres publication contract', fixture)

it('does not create or migrate storage during an ordinary open', async () => {
  const schema = schemaName()
  await expect(openPostgresSnapshotStore(connection!, { schema })).rejects.toMatchObject({ status: 503 })
  expect((await raw.query('SELECT schema_name FROM information_schema.schemata WHERE schema_name=$1', [schema])).rowCount).toBe(0)
  await initializePostgresSnapshotStore(direct!, schema)
  await initializePostgresSnapshotStore(direct!, schema)
  await raw.query(`UPDATE "${schema}".schema_version SET version=999`)
  await expect(openPostgresSnapshotStore(connection!, { schema })).rejects.toMatchObject({ status: 503 })
  await expect(initializePostgresSnapshotStore(direct!, schema)).rejects.toMatchObject({ status: 503 })
})
it('refuses migrations over the pooled endpoint', async () => {
  await expect(initializePostgresSnapshotStore(connection!, schemaName())).rejects.toMatchObject({ status: 503 })
})
it('commits one recipe intent across concurrent independent request ports', async () => {
  const context = await fixture(), compiled = await normalizePublishedRecipe(recipe)
  const input = { compiled, clientKey: 'race', idempotencyKey: randomUUID(), now: publicationNow }
  const other = await context.reopen()
  const results = await Promise.all([context.store.publishRecipe(input), other.publishRecipe(input), context.store.publishRecipe(input)])
  expect(new Set(results.map(result => result.snapshot.id)).size).toBe(1)
  expect(results.filter(result => !result.replayed)).toHaveLength(1)
  expect((await raw.query(`SELECT records FROM "${context.schema}".capacity`)).rows[0].records).toBe(1)
})
it('atomically binds a concurrent retry key across preset and recipe kinds', async () => {
  const context = await fixture(), key = randomUUID()
  const results = await Promise.allSettled([
    context.store.publish({ preset: await normalizePublishedPreset(preset), clientKey: 'race', idempotencyKey: key, now: publicationNow }),
    context.store.publishRecipe({ compiled: await normalizePublishedRecipe(recipe), clientKey: 'race', idempotencyKey: key, now: publicationNow }),
  ])
  expect(results.filter(result => result.status === 'fulfilled')).toHaveLength(1)
  expect(results.find(result => result.status === 'rejected')).toMatchObject({ reason: { status: 409 } })
  expect((await raw.query(`SELECT records FROM "${context.schema}".capacity`)).rows[0].records).toBe(1)
})
it('rolls back publication, retry keys and quotas when capacity is exhausted', async () => {
  const context = await fixture()
  await raw.query(`UPDATE "${context.schema}".capacity SET bytes=268435456`)
  await expect(context.store.publishRecipe({ compiled: await normalizePublishedRecipe(recipe), clientKey: 'full', idempotencyKey: randomUUID(), now: publicationNow }))
    .rejects.toMatchObject({ code: 'SNAPSHOT_CAPACITY_REACHED' })
  expect((await raw.query(`SELECT count(*)::int AS n FROM "${context.schema}".publications`)).rows[0].n).toBe(0)
  expect((await raw.query(`SELECT count(*)::int AS n FROM "${context.schema}".idempotency_keys`)).rows[0].n).toBe(0)
  expect((await raw.query(`SELECT count(*)::int AS n FROM "${context.schema}".rate_buckets`)).rows[0].n).toBe(0)
})
it('protects immutable responses with database triggers', async () => {
  const context = await fixture()
  await context.store.publishRecipe({ compiled: await normalizePublishedRecipe(recipe), clientKey: 'immutable', idempotencyKey: randomUUID(), now: publicationNow })
  await expect(raw.query(`UPDATE "${context.schema}".publications SET response='{}'`)).rejects.toThrow()
  await expect(raw.query(`DELETE FROM "${context.schema}".publications`)).rejects.toThrow()
})
it('bounds collision retries and rejects unsafe schema identifiers', async () => {
  const schema = schemaName()
  await initializePostgresSnapshotStore(direct!, schema)
  let calls = 0
  const store = await openPostgresSnapshotStore(connection!, { schema, randomRecipeId: () => { calls++; return 'rc_' + 'a'.repeat(32) } })
  const input = { compiled: await normalizePublishedRecipe(recipe), clientKey: 'collision', idempotencyKey: randomUUID(), now: publicationNow }
  await store.publishRecipe(input)
  calls = 0
  await expect(store.publishRecipe({ ...input, idempotencyKey: randomUUID() })).rejects.toMatchObject({ status: 503 })
  expect(calls).toBe(3)
  await expect(openPostgresSnapshotStore(connection!, { schema: 'public; DROP SCHEMA public' })).rejects.toMatchObject({ status: 503 })
})

it('shares global publication and record-capacity limits across both kinds', async () => {
  const context = await fixture()
  const day = Math.floor(publicationNow / 86_400_000)
  await raw.query(`INSERT INTO "${context.schema}".rate_buckets VALUES('global','',$1,999)`, [day])
  const outcomes = await Promise.allSettled([
    context.store.publishRecipe({ compiled: await normalizePublishedRecipe(recipe), clientKey: 'global-a', idempotencyKey: randomUUID(), now: publicationNow }),
    context.store.publish({ preset: await normalizePublishedPreset(preset), clientKey: 'global-b', idempotencyKey: randomUUID(), now: publicationNow }),
  ])
  expect(outcomes.filter(outcome => outcome.status === 'fulfilled')).toHaveLength(1)
  expect(outcomes.find(outcome => outcome.status === 'rejected')).toMatchObject({ reason: { status: 429 } })
  await raw.query(`UPDATE "${context.schema}".capacity SET records=100000`)
  await expect(context.store.publishRecipe({ compiled: await normalizePublishedRecipe(recipe), clientKey: 'next-day', idempotencyKey: randomUUID(), now: publicationNow + 86_400_000 }))
    .rejects.toMatchObject({ code: 'SNAPSHOT_CAPACITY_REACHED' })
})
it('bounds lock waiting and rolls back without a partial publication', async () => {
  const context = await fixture(), blocker = await raw.connect()
  try {
    await blocker.query('BEGIN')
    await blocker.query(`SELECT * FROM "${context.schema}".capacity FOR UPDATE`)
    const started = performance.now()
    await expect(context.store.publishRecipe({ compiled: await normalizePublishedRecipe(recipe), clientKey: 'locked', idempotencyKey: randomUUID(), now: publicationNow })).rejects.toMatchObject({ status: 503 })
    expect(performance.now() - started).toBeGreaterThanOrEqual(1500)
    expect(performance.now() - started).toBeLessThan(8000)
  } finally { await blocker.query('ROLLBACK'); blocker.release() }
  expect((await raw.query(`SELECT records FROM "${context.schema}".capacity`)).rows[0].records).toBe(0)
})
it('rejects stored integrity corruption even through an already-open request port', async () => {
  const context = await fixture()
  const { snapshot } = await context.store.publishRecipe({ compiled: await normalizePublishedRecipe(recipe), clientKey: 'corrupt', idempotencyKey: randomUUID(), now: publicationNow })
  await raw.query(`ALTER TABLE "${context.schema}".publications DISABLE TRIGGER publications_immutable`)
  await raw.query(`UPDATE "${context.schema}".publications SET payload_hash=$1`, ['0'.repeat(64)])
  await expect(context.store.lookupRecipe({ id: snapshot.id, revision: 1 })).rejects.toMatchObject({ status: 503 })
  await expect(openPostgresSnapshotStore(connection!, { schema: context.schema })).rejects.toMatchObject({ status: 503 })
})

it('cleans expired bookkeeping in bounded batches while keeping publication bytes', async () => {
  const context = await fixture()
  const { snapshot } = await context.store.publish({ preset: await normalizePublishedPreset(preset), clientKey: 'cleanup', idempotencyKey: randomUUID(), now: publicationNow })
  await raw.query(`INSERT INTO "${context.schema}".idempotency_keys(key,kind,payload_hash,snapshot_id,expires_at)
    SELECT gen_random_uuid(),'preset',$1,$2,0 FROM generate_series(1,400)`, [snapshot.presetHash, snapshot.id])
  await raw.query(`INSERT INTO "${context.schema}".rate_buckets(kind,client_key,window_start,count)
    SELECT 'attempt','expired-'||n,0,1 FROM generate_series(1,400) AS n`)
  await context.store.consumeAttempt('cleanup', publicationNow)
  expect((await raw.query(`SELECT count(*)::int AS n FROM "${context.schema}".idempotency_keys WHERE expires_at=0`)).rows[0].n).toBe(300)
  expect((await raw.query(`SELECT count(*)::int AS n FROM "${context.schema}".rate_buckets WHERE window_start=0`)).rows[0].n).toBe(300)
  expect(await context.store.lookup({ id: snapshot.id, revision: 1 })).toEqual(snapshot)
})
