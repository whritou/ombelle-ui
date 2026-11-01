import { createHash, randomBytes } from 'node:crypto'
import type { Pool, PoolClient } from 'pg'
import {
  parseSnapshotReference, parseRecipeSnapshotReference, validatePreset, validateRecipe,
  validatePresetSnapshot, validateRecipeSnapshot,
  type PresetSnapshot, type RecipeSnapshot, type SnapshotReference,
} from '@ombelle/contracts'
import { canonicalize } from '@ombelle/compiler'
import { SnapshotServiceError } from './errors'
import { createPostgresPool, quotedSchema, storageFailure } from './postgres-pool'
import { verifyPostgresSnapshotSchema } from './postgres-migrations'
import type { SnapshotStore, PublishSnapshotInput, PublishRecipeSnapshotInput, WithdrawalReason } from './store'

const pools = new Map<string, Pool>()
const minuteMs = 60_000, dayMs = 86_400_000
type Kind = 'preset' | 'recipe'
type Envelope = PresetSnapshot | RecipeSnapshot
type InputMetadata = { clientKey: string; idempotencyKey: string; now: number }
type StoreOptions = { schema?: string; randomId?: () => string; randomRecipeId?: () => string }
const hash = (value: string) => createHash('sha256').update(value, 'utf8').digest('hex')

export async function openPostgresSnapshotStore(connectionString: string, options: StoreOptions = {}): Promise<SnapshotStore> {
  try {
    const schema = options.schema ?? 'ombelle'
    quotedSchema(schema)
    let pool = pools.get(connectionString)
    if (!pool) {
      if (pools.size >= 4) storageFailure()
      pool = createPostgresPool(connectionString)
      pools.set(connectionString, pool)
    }
    await verifyPostgresSnapshotSchema(pool, schema)
    return new PostgresSnapshotStore(pool, schema, options)
  } catch (error) { return storageFailure(error) }
}

/** For operator/test shutdown, never per HTTP request. */
export async function closePostgresPools(): Promise<void> {
  const existing = [...pools.values()]
  pools.clear()
  await Promise.all(existing.map(pool => pool.end()))
}

class PostgresSnapshotStore implements SnapshotStore {
  private readonly s: string
  private readonly randomId: () => string
  private readonly randomRecipeId: () => string
  constructor(private readonly pool: Pool, schema: string, options: StoreOptions) {
    this.s = quotedSchema(schema)
    this.randomId = options.randomId ?? (() => 'ps_' + randomBytes(16).toString('hex'))
    this.randomRecipeId = options.randomRecipeId ?? (() => 'rc_' + randomBytes(16).toString('hex'))
  }

  private async transaction<T>(operation: (client: PoolClient) => Promise<T>): Promise<T> {
    let client: PoolClient | undefined
    try {
      client = await this.pool.connect()
      await client.query('BEGIN')
      await client.query("SET LOCAL lock_timeout='2s'; SET LOCAL statement_timeout='5s'")
      // A single small shared budget row serializes publication bookkeeping.
      // Every write takes this first, so cross-kind retries cannot deadlock or
      // oversubscribe quotas. Normal reads do not take the write lock.
      const capacity = await client.query(`SELECT records FROM ${this.s}.capacity WHERE singleton=1 FOR UPDATE`)
      if (capacity.rowCount !== 1) storageFailure()
      const result = await operation(client)
      await client.query('COMMIT')
      return result
    } catch (error) {
      try { await client?.query('ROLLBACK') } catch {}
      return storageFailure(error)
    } finally { client?.release() }
  }
  private async cleanup(client: PoolClient, now: number): Promise<void> {
    await client.query(`DELETE FROM ${this.s}.idempotency_keys WHERE key IN
      (SELECT key FROM ${this.s}.idempotency_keys WHERE expires_at<=$1 ORDER BY expires_at LIMIT 100)`, [now])
    await client.query(`DELETE FROM ${this.s}.rate_buckets WHERE (kind,client_key,window_start) IN
      (SELECT kind,client_key,window_start FROM ${this.s}.rate_buckets WHERE (kind='attempt' AND window_start<$1)
        OR (kind IN ('client','global') AND window_start<$2) ORDER BY kind,client_key,window_start LIMIT 100)`, [Math.floor(now / minuteMs), Math.floor(now / dayMs)])
  }
  private async assertQuota(client: PoolClient, kind: string, clientKey: string, now: number, duration: number, limit: number): Promise<void> {
    const window = Math.floor(now / duration)
    const row = await client.query(`SELECT count FROM ${this.s}.rate_buckets WHERE kind=$1 AND client_key=$2 AND window_start=$3`, [kind, clientKey, window])
    if (row.rows[0]?.count >= limit)
      throw new SnapshotServiceError({ status: 429, code: 'RATE_LIMITED', retryAfter: Math.ceil(((window + 1) * duration - now) / 1000) })
  }
  private async increment(client: PoolClient, kind: string, clientKey: string, now: number, duration: number): Promise<void> {
    await client.query(`INSERT INTO ${this.s}.rate_buckets(kind,client_key,window_start,count) VALUES($1,$2,$3,1)
      ON CONFLICT(kind,client_key,window_start) DO UPDATE SET count=${this.s}.rate_buckets.count+1`, [kind, clientKey, Math.floor(now / duration)])
  }
  async consumeAttempt(clientKey: string, now: number): Promise<void> {
    await this.transaction(async client => {
      await this.cleanup(client, now)
      await this.assertQuota(client, 'attempt', clientKey, now, minuteMs, 5)
      await this.increment(client, 'attempt', clientKey, now, minuteMs)
    })
  }
  async publish(input: PublishSnapshotInput): Promise<{ snapshot: PresetSnapshot; replayed: boolean }> {
    try {
      validatePreset(input.preset.data)
      const payload = canonicalize(input.preset.data)
      if (Buffer.byteLength(payload) > 65_536) throw new SnapshotServiceError({ status: 413, code: 'PAYLOAD_TOO_LARGE' })
      if (hash(payload) !== input.preset.hash) storageFailure()
      return await this.publishRecord('preset', input, input.preset.hash, id => validatePresetSnapshot({
        snapshotVersion: '1.0', id, revision: 1, preset: input.preset.data, presetHash: input.preset.hash,
        catalogRelease: '0.1.0', compilerVersion: '0.1.0', createdAt: new Date(input.now).toISOString(), validationStatus: 'draft',
      }))
    } catch (error) { return storageFailure(error) }
  }
  async publishRecipe(input: PublishRecipeSnapshotInput): Promise<{ snapshot: RecipeSnapshot; replayed: boolean }> {
    try {
      const { compiled } = input
      validateRecipe(compiled.recipe.data)
      validatePreset(compiled.preset.data)
      const payload = canonicalize(compiled.recipe.data)
      if (Buffer.byteLength(payload) > 65_536) throw new SnapshotServiceError({ status: 413, code: 'PAYLOAD_TOO_LARGE' })
      if (hash(payload) !== compiled.recipe.hash || hash(canonicalize(compiled.preset.data)) !== compiled.preset.hash) storageFailure()
      return await this.publishRecord('recipe', input, compiled.recipe.hash, id => validateRecipeSnapshot({
        snapshotVersion: '1.0', id, revision: 1, recipe: compiled.recipe.data, recipeHash: compiled.recipe.hash,
        preset: compiled.preset.data, presetHash: compiled.preset.hash, catalogRelease: '0.1.0', compilerVersion: '0.1.0',
        createdAt: new Date(input.now).toISOString(), validationStatus: 'draft',
      }))
    } catch (error) { return storageFailure(error) }
  }
  private async publishRecord<S extends Envelope>(kind: Kind, input: InputMetadata, payloadHash: string, build: (id: string) => S): Promise<{ snapshot: S; replayed: boolean }> {
    if (!Number.isSafeInteger(input.now) || input.now < 0) storageFailure()
    return this.transaction(async client => {
      const prior = await client.query(`SELECT kind,payload_hash,snapshot_id FROM ${this.s}.idempotency_keys WHERE key=$1 AND expires_at>$2`, [input.idempotencyKey, input.now])
      if (prior.rowCount) {
        if (prior.rows[0].kind !== kind || prior.rows[0].payload_hash !== payloadHash)
          throw new SnapshotServiceError({ status: 409, code: 'IDEMPOTENCY_CONFLICT' })
        const snapshot = await this.lookupRecord(kind, { id: prior.rows[0].snapshot_id, revision: 1 }, client) as S
        if ((kind === 'preset' ? (snapshot as PresetSnapshot).presetHash : (snapshot as RecipeSnapshot).recipeHash) !== payloadHash) storageFailure()
        return { snapshot, replayed: true }
      }
      await this.cleanup(client, input.now)
      await this.assertQuota(client, 'client', input.clientKey, input.now, dayMs, 20)
      await this.assertQuota(client, 'global', '', input.now, dayMs, 1000)
      for (let attempt = 0; attempt < 3; attempt++) {
        const id = (kind === 'preset' ? this.randomId : this.randomRecipeId)()
        if ((await client.query(`SELECT 1 FROM ${this.s}.publications WHERE id=$1`, [id])).rowCount) continue
        const snapshot = build(id), response = canonicalize(snapshot), bytes = Buffer.byteLength(response)
        if (bytes > 128 * 1024) storageFailure()
        const capacity = (await client.query(`SELECT records,bytes FROM ${this.s}.capacity WHERE singleton=1`)).rows[0]
        if (!capacity) storageFailure()
        if (capacity.records >= 100_000 || capacity.bytes + bytes > 256 * 1024 * 1024)
          throw new SnapshotServiceError({ status: 503, code: 'SNAPSHOT_CAPACITY_REACHED' })
        await client.query(`INSERT INTO ${this.s}.publications(id,kind,revision,response,response_hash,payload_hash,bytes) VALUES($1,$2,1,$3,$4,$5,$6)`, [id, kind, response, hash(response), payloadHash, bytes])
        await client.query(`DELETE FROM ${this.s}.idempotency_keys WHERE key=$1 AND expires_at<=$2`, [input.idempotencyKey, input.now])
        await client.query(`INSERT INTO ${this.s}.idempotency_keys(key,kind,payload_hash,snapshot_id,expires_at) VALUES($1,$2,$3,$4,$5)`, [input.idempotencyKey, kind, payloadHash, id, input.now + dayMs])
        await this.increment(client, 'client', input.clientKey, input.now, dayMs)
        await this.increment(client, 'global', '', input.now, dayMs)
        return { snapshot, replayed: false }
      }
      return storageFailure()
    })
  }
  async lookup(ref: SnapshotReference): Promise<PresetSnapshot> { return this.lookupRecord('preset', ref) as Promise<PresetSnapshot> }
  async lookupRecipe(ref: SnapshotReference): Promise<RecipeSnapshot> { return this.lookupRecord('recipe', ref) as Promise<RecipeSnapshot> }
  private async lookupRecord(kind: Kind, ref: SnapshotReference, runner: Pick<PoolClient, 'query'> = this.pool): Promise<Envelope> {
    try {
      (kind === 'preset' ? parseSnapshotReference : parseRecipeSnapshotReference)(`${ref.id}@${ref.revision}`)
      const row = (await runner.query(`SELECT p.*,w.snapshot_id IS NOT NULL AS withdrawn FROM ${this.s}.publications p
        LEFT JOIN ${this.s}.withdrawals w ON w.snapshot_id=p.id WHERE p.id=$1 AND p.revision=$2 AND p.kind=$3`, [ref.id, ref.revision, kind])).rows[0]
      if (!row) throw new SnapshotServiceError({ status: 404, code: 'SNAPSHOT_NOT_FOUND' })
      if (row.withdrawn) throw new SnapshotServiceError({ status: 410, code: 'SNAPSHOT_WITHDRAWN' })
      if (typeof row.response !== 'string' || row.bytes > 128 * 1024 || Buffer.byteLength(row.response) !== row.bytes || hash(row.response) !== row.response_hash) storageFailure()
      const snapshot = kind === 'preset' ? validatePresetSnapshot(JSON.parse(row.response)) : validateRecipeSnapshot(JSON.parse(row.response))
      if (canonicalize(snapshot) !== row.response || snapshot.id !== ref.id || snapshot.revision !== ref.revision ||
          hash(canonicalize(snapshot.preset)) !== snapshot.presetHash ||
          (kind === 'preset' ? snapshot.presetHash !== row.payload_hash :
            (snapshot as RecipeSnapshot).recipeHash !== row.payload_hash || hash(canonicalize((snapshot as RecipeSnapshot).recipe)) !== row.payload_hash)) storageFailure()
      return snapshot
    } catch (error) { return storageFailure(error) }
  }
  async withdraw(ref: SnapshotReference, reason: WithdrawalReason, now: number): Promise<void> { await this.changeWithdrawal('preset', ref, reason, now) }
  async unwithdraw(ref: SnapshotReference): Promise<void> { await this.changeWithdrawal('preset', ref) }
  async withdrawRecipe(ref: SnapshotReference, reason: WithdrawalReason, now: number): Promise<void> { await this.changeWithdrawal('recipe', ref, reason, now) }
  async unwithdrawRecipe(ref: SnapshotReference): Promise<void> { await this.changeWithdrawal('recipe', ref) }
  private async changeWithdrawal(kind: Kind, ref: SnapshotReference, reason?: WithdrawalReason, now?: number): Promise<void> {
    (kind === 'preset' ? parseSnapshotReference : parseRecipeSnapshotReference)(`${ref.id}@${ref.revision}`)
    if (reason !== undefined && !['abuse', 'security', 'operator-request'].includes(reason)) storageFailure()
    await this.transaction(async client => {
      if (!(await client.query(`SELECT 1 FROM ${this.s}.publications WHERE id=$1 AND revision=$2 AND kind=$3`, [ref.id, ref.revision, kind])).rowCount)
        throw new SnapshotServiceError({ status: 404, code: 'SNAPSHOT_NOT_FOUND' })
      if (reason) await client.query(`INSERT INTO ${this.s}.withdrawals(snapshot_id,reason,withdrawn_at) VALUES($1,$2,$3)
        ON CONFLICT(snapshot_id) DO UPDATE SET reason=EXCLUDED.reason,withdrawn_at=EXCLUDED.withdrawn_at`, [ref.id, reason, now])
      else await client.query(`DELETE FROM ${this.s}.withdrawals WHERE snapshot_id=$1`, [ref.id])
    })
  }
  async close(): Promise<void> { /* The shared Fluid Compute pool owns its lifecycle. */ }
}
