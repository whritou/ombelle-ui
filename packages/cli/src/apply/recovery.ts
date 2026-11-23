import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { createHash } from 'node:crypto'
import { FoundationError, type InstallPlan } from '@ombelle/contracts'
import { safePath } from '../project/paths.js'
import { fingerprintFile } from '../project/fingerprint.js'

export const operationLockName = '.ombelle-operation.lock'
export const transactionsDirectory = '.ombelle-transactions'
/** Written once every planned change and dependency step finished, just before the folder is removed. */
export const completeMarker = 'complete'
/** Written just before the package manager starts. */
export const dependenciesMarker = 'dependencies-started'
/** 0.9 and earlier wrote an empty lock and bounded every apply to about two minutes. */
const legacyLockAgeMs = 10 * 60 * 1000

export type OperationOwner = { pid: number; hostname: string; startedAt: string; transaction?: string }
export type Recovery = {
  sourceRestored: boolean
  unrestoredPaths: string[]
  transactionPath: string
  packageStateMayHaveChanged: boolean
  restoredPaths?: string[]
  interrupted?: boolean
}

export function operationOwner(transaction?: string): OperationOwner {
  return { pid: process.pid, hostname: os.hostname(), startedAt: new Date().toISOString(),
    ...(transaction ? { transaction } : {}) }
}

function alive(pid: number): boolean {
  try {
    process.kill(pid, 0)
    return true
  } catch (e) {
    // EPERM: the process exists but belongs to someone else.
    return (e as NodeJS.ErrnoException).code === 'EPERM'
  }
}

async function readOwner(lockPath: string): Promise<{ owner?: OperationOwner; ageMs: number }> {
  const [text, stat] = await Promise.all([fs.readFile(lockPath, 'utf8'), fs.stat(lockPath)])
  const ageMs = Date.now() - stat.mtimeMs
  try {
    const value = JSON.parse(text) as Partial<OperationOwner>
    if (Number.isSafeInteger(value.pid) && typeof value.hostname === 'string' && typeof value.startedAt === 'string' &&
      (value.transaction === undefined || typeof value.transaction === 'string'))
      return { owner: value as OperationOwner, ageMs }
  } catch { /* an empty or partial lock: 0.9 and earlier, or killed while writing it */ }
  return { ageMs }
}

/**
 * Whether the lock belongs to an operation that can no longer be running: its process is gone on this
 * machine, or it is a legacy (empty) lock older than any 0.9 apply could take.
 */
export async function staleOperation(lockPath: string): Promise<{ stale: boolean; owner?: OperationOwner }> {
  const { owner, ageMs } = await readOwner(lockPath)
  if (!owner) return { stale: ageMs > legacyLockAgeMs }
  return { stale: owner.hostname === os.hostname() && !alive(owner.pid), owner }
}

const sha256 = (value: string | Buffer) => createHash('sha256').update(value).digest('hex')

/**
 * Restore the files of one interrupted transaction from its plan.json and .bak files. The plan is written
 * (atomically) before the first file is replaced, so a folder without a readable plan replaced nothing.
 * A file is restored only while it still holds the bytes the transaction wrote; anything else is reported.
 */
export async function restoreTransaction(root: string, folder: string): Promise<Recovery> {
  const recovery: Recovery = {
    sourceRestored: true, unrestoredPaths: [], restoredPaths: [], transactionPath: folder,
    packageStateMayHaveChanged: false, interrupted: true,
  }
  const exists = async (name: string) => fs.access(path.join(folder, name)).then(() => true, () => false)
  if (await exists(completeMarker)) {
    // The operation finished; only its cleanup was interrupted.
    await fs.rm(folder, { recursive: true, force: true })
    return { ...recovery, restoredPaths: [] }
  }
  recovery.packageStateMayHaveChanged = await exists(dependenciesMarker)
  let plan: InstallPlan | undefined
  try {
    plan = JSON.parse(await fs.readFile(path.join(folder, 'plan.json'), 'utf8')) as InstallPlan
  } catch { /* no complete plan: nothing was replaced */ }
  const pending = plan?.changes.filter(change => change.action !== 'noop') ?? []
  for (let i = pending.length - 1; i >= 0; i--) {
    const change = pending[i]
    try {
      const current = await fingerprintFile(root, change.path)
      if (current === change.beforeHash) continue
      if (current !== sha256(change.afterContent)) {
        recovery.unrestoredPaths.push(change.path)
        continue
      }
      const target = await safePath(root, change.path)
      if (change.beforeHash === null) await fs.unlink(target)
      else {
        const before = await fs.readFile(path.join(folder, i + '.bak'))
        if (sha256(before) !== change.beforeHash) throw new Error('Backup does not match')
        const staged = path.join(folder, i + '.restore')
        await fs.writeFile(staged, before)
        await fs.rename(staged, target)
      }
      recovery.restoredPaths!.push(change.path)
    } catch {
      recovery.unrestoredPaths.push(change.path)
    }
  }
  recovery.sourceRestored = recovery.unrestoredPaths.length === 0
  await fs.writeFile(path.join(folder, 'recovery.json'), JSON.stringify(recovery, null, 2))
  return recovery
}

/**
 * Recover the operation a stale lock belongs to: restore its transaction (named by the lock, or for a
 * legacy lock every unfinished transaction folder), then release the lock. Throws when the lock may
 * belong to a running operation.
 */
export async function recoverInterruptedOperation(root: string): Promise<Recovery[] | null> {
  const lockPath = await safePath(root, operationLockName)
  let state
  try {
    state = await staleOperation(lockPath)
  } catch (e) {
    if ((e as NodeJS.ErrnoException).code === 'ENOENT') return null
    throw e
  }
  if (!state.stale)
    throw new FoundationError(
      'FILE_CONFLICT',
      'Another operation is running in this project' +
        (state.owner ? ` (process ${state.owner.pid} on ${state.owner.hostname}, started ${state.owner.startedAt})` : ''),
      lockPath,
      'Wait for it to finish. If no Ombelle command is running, see "Interrupted operations" in docs/foundation-local-usage.md.',
    )
  const base = await safePath(root, transactionsDirectory)
  let folders: string[]
  if (state.owner?.transaction) folders = [path.join(root, state.owner.transaction)]
  else
    try {
      const entries = await fs.readdir(base, { withFileTypes: true })
      folders = []
      for (const entry of entries)
        if (entry.isDirectory() &&
          !(await fs.access(path.join(base, entry.name, 'recovery.json')).then(() => true, () => false)))
          folders.push(path.join(base, entry.name))
    } catch (e) {
      if ((e as NodeJS.ErrnoException).code !== 'ENOENT') throw e
      folders = []
    }
  const recoveries: Recovery[] = []
  for (const folder of folders) {
    await safePath(root, path.relative(root, folder))
    if (await fs.access(folder).then(() => true, () => false))
      recoveries.push(await restoreTransaction(root, folder))
  }
  await fs.unlink(lockPath)
  try {
    await fs.rmdir(base)
  } catch { /* still holds recovery records, or never existed */ }
  return recoveries
}
