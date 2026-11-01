import { isAbsolute } from 'node:path'
import { parseSnapshotReference, parseRecipeSnapshotReference } from '@ombelle/contracts'
import { backupSnapshotStore, initializeSnapshotStore, openSnapshotStore } from '../apps/www/src/snapshots/server/sqlite-store.js'
import type { WithdrawalReason } from '../apps/www/src/snapshots/server/store.js'

async function main(): Promise<void> {
  const [command, ...args] = process.argv.slice(2)
  const path = process.env.OMBELLE_SNAPSHOT_DB_PATH
  if (!path || !isAbsolute(path)) throw new Error('configuration')
  if (command === 'init' && args.length === 0) initializeSnapshotStore(path)
  else if (command === 'backup' && args.length === 1 && isAbsolute(args[0]))
    await backupSnapshotStore(path, args[0])
  else if (command === 'withdraw' && args.length === 3 && args[1] === '--reason' && ['abuse', 'security', 'operator-request'].includes(args[2])) {
    const recipe = args[0].startsWith('rc_')
    const reference = (recipe ? parseRecipeSnapshotReference : parseSnapshotReference)(args[0])
    const store = openSnapshotStore(path)
    try { await (recipe ? store.withdrawRecipe(reference, args[2] as WithdrawalReason, Date.now()) : store.withdraw(reference, args[2] as WithdrawalReason, Date.now())) }
    finally { await store.close() }
  } else if (command === 'unwithdraw' && args.length === 1) {
    const recipe = args[0].startsWith('rc_')
    const reference = (recipe ? parseRecipeSnapshotReference : parseSnapshotReference)(args[0])
    const store = openSnapshotStore(path)
    try { await (recipe ? store.unwithdrawRecipe(reference) : store.unwithdraw(reference)) }
    finally { await store.close() }
  } else throw new Error('arguments')
  process.stdout.write('Snapshot store operation completed.\n')
}

main().catch(() => {
  // Deliberately omit exception text: storage failures may contain paths/SQL,
  // and malformed arguments may contain private data or retry keys.
  process.stderr.write('Snapshot store operation failed. Check the command, configuration, and initialized database.\n')
  process.exitCode = 1
})
