import fs from 'node:fs/promises'
import path from 'node:path'
import { randomUUID } from 'node:crypto'
import {
  FoundationError,
  type InstallPlan,
  type Dependency,
  type PackageManager,
  type BunLockfile,
} from '@ombelle/contracts'
import { sha256 } from '@ombelle/compiler'
import { safePath } from '../project/paths.js'
import { fingerprintFile } from '../project/fingerprint.js'
import { assertStandaloneProject } from '../project/workspace.js'
import {
  completeMarker,
  dependenciesMarker,
  operationLockName,
  operationOwner,
  recoverInterruptedOperation,
  transactionsDirectory,
} from './recovery.js'
import {
  prepareManager,
  runDependencies,
  type PreparedManager,
} from './manager.js'
export type ApplyPorts = {
  dependencies?: (
    root: string,
    deps: Dependency[],
    manager: PackageManager,
    prepared?: PreparedManager,
    bunLockfile?: BunLockfile,
    signal?: AbortSignal,
  ) => Promise<void>
  beforeWrite?: (file: string, index: number) => Promise<void>
}
export type ApplyResult = { status: 'success'; writtenPaths: string[] }
const hashAt = fingerprintFile
export async function applyPlan(
  plan: InstallPlan,
  ports: ApplyPorts = {},
): Promise<ApplyResult> {
  if (
    plan.diagnostics.length ||
    plan.changes.some((c) => c.action === 'conflict')
  )
    throw new FoundationError(
      'FILE_CONFLICT',
      'Resolve all plan conflicts before applying',
    )
  const seen = new Set<string>()
  for (const c of plan.changes) {
    const key = path.normalize(c.path).toLowerCase()
    if (seen.has(key))
      throw new FoundationError(
        'FILE_CONFLICT',
        'Duplicate destination',
        c.path,
      )
    seen.add(key)
    await safePath(plan.projectRoot, c.path)
  }
  const prepared =
    plan.dependencyPlan.length && !ports.dependencies
      ? await prepareManager(plan.projectRoot, plan.packageManager, plan.bunLockfile, plan.dependencyPlan)
      : undefined
  const lockPath = await safePath(plan.projectRoot, operationLockName)
  const relative = transactionsDirectory + '/' + randomUUID()
  const operation = await acquireOperationLock(plan.projectRoot, lockPath, relative)
  let folder: string | undefined,
    dependencyStarted = false
  const written: { path: string; afterHash: string; before: Buffer | null }[] =
    []
  // Ctrl-C or a termination request rolls back like any other failure instead of exiting mid-apply (CLI-02).
  // The package manager runs in the same process group and receives Ctrl-C itself; the abort covers SIGTERM.
  const abort = new AbortController()
  let interrupted: NodeJS.Signals | undefined
  const onSignal = (signal: NodeJS.Signals) => {
    interrupted ??= signal
    abort.abort()
  }
  const signals: NodeJS.Signals[] = ['SIGINT', 'SIGTERM', 'SIGHUP']
  for (const signal of signals) process.on(signal, onSignal)
  const checkInterrupted = () => {
    if (interrupted)
      throw new FoundationError('INTERNAL_ERROR', 'Interrupted by ' + interrupted)
  }
  try {
    for (const [file, hash] of Object.entries(plan.preconditions ?? {}))
      if ((await hashAt(plan.projectRoot, file)) !== hash)
        throw new FoundationError(
          'FILE_CONFLICT',
          'Project metadata changed after planning',
          file,
        )
    for (const c of plan.changes)
      if ((await hashAt(plan.projectRoot, c.path)) !== c.beforeHash)
        throw new FoundationError(
          'FILE_CONFLICT',
          'File changed after planning',
          c.path,
        )
    if (plan.dependencyPlan.length) await assertStandaloneProject(plan.projectRoot)
    const pending = plan.changes.filter((c) => c.action !== 'noop')
    if (!pending.length && !plan.dependencyPlan.length)
      return { status: 'success', writtenPaths: [] }
    checkInterrupted()
    folder = await safePath(plan.projectRoot, relative)
    await fs.mkdir(path.dirname(folder), { recursive: true })
    await fs.mkdir(folder)
    // The plan is the recovery journal: it is complete on disk before the first file is replaced.
    await fs.writeFile(
      path.join(folder, 'plan.json.tmp'),
      JSON.stringify(plan, null, 2),
    )
    await fs.rename(path.join(folder, 'plan.json.tmp'), path.join(folder, 'plan.json'))
    for (let i = 0; i < pending.length; i++) {
      checkInterrupted()
      const c = pending[i]
      await ports.beforeWrite?.(c.path, i)
      const target = await safePath(plan.projectRoot, c.path)
      if ((await hashAt(plan.projectRoot, c.path)) !== c.beforeHash)
        throw new FoundationError(
          'FILE_CONFLICT',
          'File changed while applying',
          c.path,
        )
      const before = c.beforeHash === null ? null : await fs.readFile(target)
      if (before !== null)
        await fs.writeFile(path.join(folder, i + '.bak'), before)
      const staged = path.join(folder, i + '.tmp')
      await fs.writeFile(staged, c.afterContent)
      await fs.mkdir(path.dirname(target), { recursive: true })
      await safePath(plan.projectRoot, c.path)
      await fs.rename(staged, target)
      written.push({
        path: c.path,
        afterHash: await sha256(c.afterContent),
        before,
      })
    }
    if (plan.dependencyPlan.length) {
      checkInterrupted()
      await assertStandaloneProject(plan.projectRoot)
      dependencyStarted = true
      await fs.writeFile(path.join(folder, dependenciesMarker), '')
      await (ports.dependencies ?? runDependencies)(
        plan.projectRoot,
        plan.dependencyPlan,
        plan.packageManager,
        prepared,
        plan.bunLockfile,
        abort.signal,
      )
    }
    checkInterrupted()
    await fs.writeFile(path.join(folder, completeMarker), '')
    await fs.rm(folder, { recursive: true })
    folder = undefined
    try {
      await fs.rmdir(await safePath(plan.projectRoot, transactionsDirectory))
    } catch (e) {
      if (
        !['ENOTEMPTY', 'ENOENT', 'EEXIST'].includes(
          (e as NodeJS.ErrnoException).code ?? '',
        )
      )
        throw e
    }
    return { status: 'success', writtenPaths: written.map((w) => w.path) }
  } catch (cause) {
    if (!folder) throw cause
    const unrestoredPaths: string[] = []
    for (const entry of written.toReversed()) {
      try {
        const target = await safePath(plan.projectRoot, entry.path)
        if ((await hashAt(plan.projectRoot, entry.path)) !== entry.afterHash) {
          unrestoredPaths.push(entry.path)
          continue
        }
        if (entry.before === null) await fs.unlink(target)
        else await fs.writeFile(target, entry.before)
      } catch {
        unrestoredPaths.push(entry.path)
      }
    }
    const recovery = {
      sourceRestored: unrestoredPaths.length === 0,
      unrestoredPaths,
      transactionPath: folder,
      packageStateMayHaveChanged: dependencyStarted,
      ...(interrupted ? { interrupted: true } : {}),
    }
    try {
      await fs.writeFile(
        path.join(folder, 'recovery.json'),
        JSON.stringify(recovery, null, 2),
      )
    } catch {
      // Report the original failure and the transaction path even if the record cannot be written.
    }
    const error = new FoundationError(
      dependencyStarted && !interrupted
        ? 'DEPENDENCY_FAILURE'
        : cause instanceof FoundationError
          ? cause.code
          : 'INTERNAL_ERROR',
      interrupted
        ? 'Interrupted by ' + interrupted + '; the planned files were restored'
        : cause instanceof Error ? cause.message : 'Installation failed',
      folder,
      'Review recovery.json and repair the project with ' +
        plan.packageManager +
        (plan.bunLockfile ? ' (' + plan.bunLockfile + ')' : '') +
        ' before retrying.',
    )
    error.recovery = recovery
    throw error
  } finally {
    for (const signal of signals) process.off(signal, onSignal)
    await operation.close()
    await fs.unlink(lockPath)
  }
}

/**
 * Take the project's operation lock, recording this process as its owner. A lock left by an operation
 * that can no longer be running (CLI-02) is recovered first: its files are restored from the transaction
 * folder, the lock is released, and the command is refused so the user can review and re-run it.
 */
async function acquireOperationLock(root: string, lockPath: string, transaction: string): Promise<fs.FileHandle> {
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const handle = await fs.open(lockPath, 'wx')
      await handle.writeFile(JSON.stringify(operationOwner(transaction)) + '\n')
      await handle.sync()
      return handle
    } catch (e) {
      if ((e as NodeJS.ErrnoException).code !== 'EEXIST') throw e
    }
    const recoveries = await recoverInterruptedOperation(root)
    if (recoveries === null) continue
    const recovery = recoveries[0]
    const error = new FoundationError(
      'FILE_CONFLICT',
      recovery
        ? 'Restored the files of an interrupted operation; review them and run the command again'
        : 'Released the lock of an interrupted operation that had not changed any file; run the command again',
      recovery?.transactionPath ?? lockPath,
      recovery?.packageStateMayHaveChanged
        ? 'The interrupted package install may have changed package.json, the lockfile or node_modules; check them with your package manager before retrying.'
        : 'Review recovery.json, then run the command again.',
    )
    if (recovery) error.recovery = recovery
    throw error
  }
  throw new FoundationError('FILE_CONFLICT', 'Another operation or an unrecovered lock exists', lockPath)
}
