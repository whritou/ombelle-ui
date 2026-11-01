import type { PoolClient } from 'pg'
import { createPostgresPool, postgresConnectionUrl, quotedSchema, storageFailure } from './postgres-pool'

export const postgresSnapshotSchemaVersion = 1
export async function verifyPostgresSnapshotSchema(client: Pick<PoolClient, 'query'>, schema = 'ombelle'): Promise<void> {
  const s = quotedSchema(schema)
  const result = await client.query(`SELECT version,
    (SELECT count(*)::int FROM information_schema.tables WHERE table_schema=$1 AND table_name=ANY($2::text[])) AS tables,
    (SELECT count(*)::int FROM pg_trigger t JOIN pg_class c ON c.oid=t.tgrelid JOIN pg_namespace n ON n.oid=c.relnamespace
      WHERE n.nspname=$1 AND t.tgname IN ('publications_immutable','publications_capacity') AND NOT t.tgisinternal AND t.tgenabled='O') AS triggers
    FROM ${s}.schema_version WHERE singleton=1`, [schema, ['schema_version', 'publications', 'idempotency_keys', 'rate_buckets', 'withdrawals', 'capacity']])
  if (result.rowCount !== 1 || result.rows[0].version !== postgresSnapshotSchemaVersion || result.rows[0].tables !== 6 || result.rows[0].triggers !== 2)
    storageFailure()
}

function initialSchema(schema: string): string {
  const s = quotedSchema(schema)
  return `
    CREATE TABLE ${s}.schema_version (singleton INTEGER PRIMARY KEY CHECK(singleton=1), version INTEGER NOT NULL CHECK(version>=1));
    INSERT INTO ${s}.schema_version VALUES (1,1);
    CREATE TABLE ${s}.publications (
      id TEXT PRIMARY KEY CHECK(id ~ '^(ps|rc)_[0-9a-f]{32}$'),
      kind TEXT NOT NULL CHECK(kind IN ('preset','recipe')),
      revision INTEGER NOT NULL CHECK(revision=1),
      response TEXT NOT NULL,
      response_hash TEXT NOT NULL CHECK(response_hash ~ '^[0-9a-f]{64}$'),
      payload_hash TEXT NOT NULL CHECK(payload_hash ~ '^[0-9a-f]{64}$'),
      bytes INTEGER NOT NULL CHECK(bytes>0 AND bytes<=131072 AND bytes=octet_length(response)),
      CHECK((kind='preset' AND left(id,3)='ps_') OR (kind='recipe' AND left(id,3)='rc_'))
    );
    CREATE TABLE ${s}.capacity (
      singleton INTEGER PRIMARY KEY CHECK(singleton=1),
      records INTEGER NOT NULL CHECK(records>=0 AND records<=100000),
      bytes INTEGER NOT NULL CHECK(bytes>=0 AND bytes<=268435456)
    );
    INSERT INTO ${s}.capacity VALUES(1,0,0);
    CREATE TABLE ${s}.idempotency_keys (
      key UUID PRIMARY KEY, kind TEXT NOT NULL CHECK(kind IN ('preset','recipe')),
      payload_hash TEXT NOT NULL CHECK(payload_hash ~ '^[0-9a-f]{64}$'),
      snapshot_id TEXT NOT NULL REFERENCES ${s}.publications(id), expires_at BIGINT NOT NULL
    );
    CREATE INDEX ON ${s}.idempotency_keys(expires_at);
    CREATE TABLE ${s}.rate_buckets (
      kind TEXT NOT NULL CHECK(kind IN ('attempt','client','global')), client_key TEXT NOT NULL,
      window_start BIGINT NOT NULL, count INTEGER NOT NULL CHECK(count>=0), PRIMARY KEY(kind,client_key,window_start)
    );
    CREATE INDEX ON ${s}.rate_buckets(kind,window_start);
    CREATE TABLE ${s}.withdrawals (
      snapshot_id TEXT PRIMARY KEY REFERENCES ${s}.publications(id),
      reason TEXT NOT NULL CHECK(reason IN ('abuse','security','operator-request')), withdrawn_at BIGINT NOT NULL
    );
    CREATE FUNCTION ${s}.reject_publication_mutation() RETURNS trigger LANGUAGE plpgsql AS $$
      BEGIN RAISE EXCEPTION 'immutable publication'; END;
    $$;
    CREATE TRIGGER publications_immutable BEFORE UPDATE OR DELETE ON ${s}.publications
      FOR EACH ROW EXECUTE FUNCTION ${s}.reject_publication_mutation();
    CREATE FUNCTION ${s}.count_publication() RETURNS trigger LANGUAGE plpgsql AS $$
      BEGIN
        UPDATE ${s}.capacity SET records=records+1, bytes=bytes+NEW.bytes WHERE singleton=1;
        IF NOT FOUND THEN RAISE EXCEPTION 'missing capacity'; END IF;
        RETURN NEW;
      END;
    $$;
    CREATE TRIGGER publications_capacity AFTER INSERT ON ${s}.publications
      FOR EACH ROW EXECUTE FUNCTION ${s}.count_publication();
  `
}

/** Operator-only. Request imports and ordinary store opens never call DDL. */
export async function initializePostgresSnapshotStore(directConnectionString: string, schema = 'ombelle'): Promise<void> {
  postgresConnectionUrl(directConnectionString, true)
  const s = quotedSchema(schema), pool = createPostgresPool(directConnectionString)
  let client: PoolClient | undefined
  try {
    client = await pool.connect()
    await client.query('BEGIN')
    await client.query("SET LOCAL lock_timeout='2s'; SET LOCAL statement_timeout='5s'")
    await client.query('SELECT pg_advisory_xact_lock(hashtextextended($1,0))', ['ombelle snapshot migration:' + schema])
    const tables = await client.query('SELECT table_name FROM information_schema.tables WHERE table_schema=$1', [schema])
    if (tables.rowCount === 0) {
      await client.query(`CREATE SCHEMA IF NOT EXISTS ${s}`)
      await client.query(initialSchema(schema))
    } else if (!tables.rows.some(row => row.table_name === 'schema_version')) storageFailure()
    await verifyPostgresSnapshotSchema(client, schema)
    await client.query('COMMIT')
  } catch (error) {
    try { await client?.query('ROLLBACK') } catch {}
    storageFailure(error)
  } finally { client?.release(); await pool.end() }
}
