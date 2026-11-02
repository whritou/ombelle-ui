import { Pool } from 'pg'
import { attachDatabasePool } from '@vercel/functions'
import { SnapshotServiceError } from './errors'

export function storageFailure(error?: unknown): never {
  throw error instanceof SnapshotServiceError ? error : new SnapshotServiceError({ status: 503, code: 'SNAPSHOT_SERVICE_UNAVAILABLE' })
}
export function quotedSchema(schema: string): string {
  if (!/^[a-z][a-z0-9_]{0,62}$/.test(schema)) return storageFailure()
  return '"' + schema + '"'
}
export function postgresConnectionUrl(value: string, direct = false): URL {
  try {
    if (/[\s\0]/.test(value)) throw new Error('Invalid connection')
    const url = new URL(value)
    if (!['postgres:', 'postgresql:'].includes(url.protocol) || !url.hostname || !url.username || !url.password || url.pathname.length < 2 || url.hash ||
        (direct && url.hostname.includes('-pooler.'))) throw new Error('Invalid connection')
    return url
  } catch { return storageFailure() }
}
export function createPostgresPool(connectionString: string): Pool {
  const url = postgresConnectionUrl(connectionString)
  // Connection-string SSL options must not override verified TLS or inject local
  // certificate paths. Trust comes from Node's approved CA configuration.
  for (const key of ['sslmode', 'sslcert', 'sslkey', 'sslrootcert', 'uselibpqcompat']) url.searchParams.delete(key)
  const pool = new Pool({
    connectionString: url.href, ssl: { rejectUnauthorized: true }, enableChannelBinding: true,
    max: 3, idleTimeoutMillis: 5_000, connectionTimeoutMillis: 10_000, allowExitOnIdle: true,
    statement_timeout: 5_000, idle_in_transaction_session_timeout: 5_000,
  })
  // Idle connection loss must not crash the instance; the next acquisition or
  // query reports availability through the controlled HTTP error boundary.
  pool.on('error', () => {})
  attachDatabasePool(pool)
  return pool
}
