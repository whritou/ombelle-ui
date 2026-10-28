import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { initializeSnapshotStore } from '../apps/www/src/snapshots/server/sqlite-store.js'

type SnapshotBrowserResources = {
  root: string
  dbPath: string
  cleanup(): Promise<void>
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
    const handle = await fs.open(marker, 'wx')
    ownsMarker = true
    try {
      await handle.writeFile(JSON.stringify({ dbPath, root }))
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
