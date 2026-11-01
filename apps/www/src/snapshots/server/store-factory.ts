import type { SnapshotConfig } from './config'
import type { SnapshotStore } from './store'

export async function openConfiguredSnapshotStore(config: SnapshotConfig): Promise<SnapshotStore> {
  if (config.backend === 'postgres') {
    const { openPostgresSnapshotStore } = await import('./postgres-store')
    return openPostgresSnapshotStore(config.databaseUrl)
  }
  const { openSnapshotStore } = await import('./sqlite-store')
  return openSnapshotStore(config.dbPath)
}
