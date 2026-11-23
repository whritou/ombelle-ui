import { describe, expect, it } from 'vitest'
import {
  pendingPostgresMigrations, postgresMigrations, postgresMinimumSchemaVersion, postgresSnapshotSchemaVersion,
  verifyPostgresSnapshotSchema, type PostgresMigration,
} from './postgres-migrations'

const step = (version: number): PostgresMigration => ({ version, description: 'step ' + version, sql: () => 'SELECT 1' })
const client = (row: { version: number; tables: number; triggers: number } | null) => ({
  query: async () => ({ rowCount: row ? 1 : 0, rows: row ? [row] : [] }),
}) as never

describe('postgres schema versions', () => {
  it('ships with the initial schema and no migration yet', () => {
    expect(postgresMigrations).toEqual([])
    expect(postgresSnapshotSchemaVersion).toBe(1)
    expect(postgresMinimumSchemaVersion).toBeLessThanOrEqual(postgresSnapshotSchemaVersion)
  })

  it('accepts the current schema and any newer one at runtime, so a deployment from before a migration still serves', async () => {
    await expect(verifyPostgresSnapshotSchema(client({ version: 1, tables: 6, triggers: 2 }))).resolves.toBeUndefined()
    await expect(verifyPostgresSnapshotSchema(client({ version: 2, tables: 6, triggers: 2 }))).resolves.toBeUndefined()
    await expect(verifyPostgresSnapshotSchema(client({ version: 7, tables: 6, triggers: 2 }))).resolves.toBeUndefined()
  })

  it('still refuses a schema that lacks a required table or trigger, or has no version row', async () => {
    await expect(verifyPostgresSnapshotSchema(client({ version: 1, tables: 5, triggers: 2 }))).rejects.toMatchObject({ status: 503 })
    await expect(verifyPostgresSnapshotSchema(client({ version: 1, tables: 6, triggers: 1 }))).rejects.toMatchObject({ status: 503 })
    await expect(verifyPostgresSnapshotSchema(client(null))).rejects.toMatchObject({ status: 503 })
  })
})

describe('pending migrations', () => {
  const list = [step(2), step(3)]
  it('returns the steps after the stored version, in order', () => {
    expect(pendingPostgresMigrations(1, list).map(m => m.version)).toEqual([2, 3])
    expect(pendingPostgresMigrations(2, list).map(m => m.version)).toEqual([3])
    expect(pendingPostgresMigrations(3, list)).toEqual([])
    expect(pendingPostgresMigrations(1, [])).toEqual([])
  })
  it('refuses a stored schema newer than the build, or an invalid one, instead of downgrading', () => {
    expect(() => pendingPostgresMigrations(4, list)).toThrow('Unsupported schema version')
    expect(() => pendingPostgresMigrations(0, list)).toThrow('Unsupported schema version')
    expect(() => pendingPostgresMigrations(2, [])).toThrow('Unsupported schema version')
  })
  it('refuses a list with a gap or a misnumbered step', () => {
    expect(() => pendingPostgresMigrations(1, [step(3)])).toThrow('without gaps')
    expect(() => pendingPostgresMigrations(1, [step(2), step(4)])).toThrow('without gaps')
  })
})
