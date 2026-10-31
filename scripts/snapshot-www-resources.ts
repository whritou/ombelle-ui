import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { initializeSnapshotStore } from '../apps/www/src/snapshots/server/sqlite-store.js'

type SnapshotBrowserResources = {
  root: string
  dbPath: string
  cleanup(): Promise<void>
}

const running = (pid: number) => {
  try {
    process.kill(pid, 0)
    return true
  } catch (error) {
    return (error as NodeJS.ErrnoException).code !== 'ESRCH'
  }
}

// Windows test runners stop the server with a forced tree kill, so its exit
// handlers never remove the marker. Recover only an exited owner whose root is
// a snapshot temporary directory; anything else stays a startup conflict.
async function removeExitedOwner(marker: string): Promise<boolean> {
  let owner: { pid?: unknown; root?: unknown }
  try {
    owner = JSON.parse(await fs.readFile(marker, 'utf8'))
  } catch {
    return false
  }
  const { pid, root } = owner
  if (!Number.isInteger(pid) || (pid as number) <= 0 || running(pid as number)) return false
  if (typeof root !== 'string' || path.dirname(root) !== os.tmpdir() || !path.basename(root).startsWith('ombelle-snapshot-www-')) return false
  await fs.rm(root, { recursive: true, force: true, maxRetries: 8, retryDelay: 250 })
  await fs.rm(marker, { force: true })
  return true
}

export async function prepareSnapshotBrowserResources(
  repo: string,
  prebuild: () => void,
  makeRoot: () => Promise<string> = () =>
    fs.mkdtemp(path.join(os.tmpdir(), 'ombelle-snapshot-www-')),
): Promise<SnapshotBrowserResources> {
  const root = await makeRoot()
  const dbPath = path.join(root, 'snapshots.sqlite')
  const marker = path.join(repo, '.artifacts/snapshot-browser.json')
  let ownsMarker = false,
    cleaned = false
  const cleanup = async () => {
    if (cleaned) return
    cleaned = true
    try {
      if (ownsMarker) await fs.rm(marker, { force: true })
    } finally {
      await fs.rm(root, { recursive: true, force: true, maxRetries: 8, retryDelay: 250 })
    }
  }

  try {
    await fs.mkdir(path.dirname(marker), { recursive: true })
    let handle: fs.FileHandle
    try {
      handle = await fs.open(marker, 'wx')
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== 'EEXIST' || !(await removeExitedOwner(marker))) throw error
      handle = await fs.open(marker, 'wx')
    }
    ownsMarker = true
    try {
      await handle.writeFile(JSON.stringify({ pid: process.pid, dbPath, root }))
    } finally {
      await handle.close()
    }
    initializeSnapshotStore(dbPath)
    prebuild()
    return { root, dbPath, cleanup }
  } catch (error) {
    await cleanup()
    throw error
  }
}
