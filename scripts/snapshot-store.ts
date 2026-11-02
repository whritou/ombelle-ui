import { isAbsolute } from 'node:path'
import { parseSnapshotReference, parseRecipeSnapshotReference } from '@ombelle/contracts'
import { backupSnapshotStore, initializeSnapshotStore, openSnapshotStore } from '../apps/www/src/snapshots/server/sqlite-store.js'
import type { WithdrawalReason } from '../apps/www/src/snapshots/server/store.js'

async function main(): Promise<void> {
  const [command, ...args] = process.argv.slice(2)
  const backend = process.env.OMBELLE_SNAPSHOT_BACKEND ?? 'sqlite'
  const path = process.env.OMBELLE_SNAPSHOT_DB_PATH
  if (!['sqlite', 'postgres'].includes(backend) || (backend === 'sqlite' && (!path || !isAbsolute(path)))) throw new Error('configuration')
  if (command === 'init' && args.length === 0) {
    if (backend === 'postgres') {
      const { initializePostgresSnapshotStore } = await import('../apps/www/src/snapshots/server/postgres-migrations.js')
      const direct = process.env.DATABASE_URL_UNPOOLED
      if (!direct) throw new Error('configuration')
      await initializePostgresSnapshotStore(direct)
    } else initializeSnapshotStore(path!)
  } else if (command === 'backup' && args.length === 1 && isAbsolute(args[0]) && backend === 'sqlite')
    await backupSnapshotStore(path!, args[0])
  else if (command === 'withdraw' && args.length === 3 && args[1] === '--reason' && ['abuse', 'security', 'operator-request'].includes(args[2])) {
    const recipe = args[0].startsWith('rc_')
    const reference = (recipe ? parseRecipeSnapshotReference : parseSnapshotReference)(args[0])
    const store = backend === 'postgres'
      ? await (await import('../apps/www/src/snapshots/server/postgres-store.js')).openPostgresSnapshotStore(process.env.DATABASE_URL ?? '')
      : openSnapshotStore(path!)
    try { await (recipe ? store.withdrawRecipe(reference, args[2] as WithdrawalReason, Date.now()) : store.withdraw(reference, args[2] as WithdrawalReason, Date.now())) }
    finally {
      await store.close()
      if (backend === 'postgres') await (await import('../apps/www/src/snapshots/server/postgres-store.js')).closePostgresPools()
    }
  } else if (command === 'unwithdraw' && args.length === 1) {
    const recipe = args[0].startsWith('rc_')
    const reference = (recipe ? parseRecipeSnapshotReference : parseSnapshotReference)(args[0])
    const store = backend === 'postgres'
      ? await (await import('../apps/www/src/snapshots/server/postgres-store.js')).openPostgresSnapshotStore(process.env.DATABASE_URL ?? '')
      : openSnapshotStore(path!)
    try { await (recipe ? store.unwithdrawRecipe(reference) : store.unwithdraw(reference)) }
    finally {
      await store.close()
      if (backend === 'postgres') await (await import('../apps/www/src/snapshots/server/postgres-store.js')).closePostgresPools()
    }
  } else throw new Error('arguments')
  process.stdout.write('Snapshot store operation completed.\n')
}

main().catch(() => {
  // Deliberately omit exception text: storage failures may contain paths/SQL,
  // and malformed arguments may contain private data or retry keys.
  process.stderr.write('Snapshot store operation failed. Check the command, configuration, and initialized database.\n')
  process.exitCode = 1
})
