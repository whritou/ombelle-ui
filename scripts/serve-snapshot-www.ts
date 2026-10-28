import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { spawn, spawnSync, type ChildProcess } from 'node:child_process'
import { initializeSnapshotStore } from '../apps/www/src/snapshots/server/sqlite-store.js'

const repo = process.cwd()
const root = await fs.mkdtemp(path.join(os.tmpdir(), 'ombelle-snapshot-www-'))
const dbPath = path.join(root, 'snapshots.sqlite')
const marker = path.join(repo, '.artifacts/snapshot-browser.json')
await fs.mkdir(path.dirname(marker), { recursive: true })
initializeSnapshotStore(dbPath)
await fs.writeFile(marker, JSON.stringify({ dbPath, root }))
const predev = spawnSync(process.execPath, [path.join(repo, 'scripts/build-editor-worker.mjs')], { cwd: repo, windowsHide: true, stdio: 'inherit' })
if (predev.status !== 0) throw new Error('The www predev worker build failed.')
const next = path.join(repo, 'apps/www/node_modules/next/dist/bin/next')
const child: ChildProcess = spawn(process.execPath, [next, 'dev', '--hostname', '127.0.0.1', '--port', '3000'], {
  cwd: path.join(repo, 'apps/www'),
  windowsHide: true,
  stdio: 'inherit',
  env: {
    ...process.env,
    OMBELLE_SNAPSHOT_DB_PATH: dbPath,
    OMBELLE_PUBLIC_ORIGIN: 'http://127.0.0.1:3000',
    OMBELLE_SNAPSHOT_RATE_SECRET: 'snapshot-browser-development-secret-32-bytes-minimum',
    OMBELLE_SNAPSHOT_CLIENT_IP_HEADER: undefined,
    NEXT_TELEMETRY_DISABLED: '1',
  },
})
let stopping = false
async function stop(signal?: NodeJS.Signals) {
  if (stopping) return
  stopping = true
  if (child.pid && child.exitCode === null) {
    if (process.platform === 'win32') {
      const killer = spawn('taskkill', ['/PID', String(child.pid), '/T', '/F'], { windowsHide: true, stdio: 'ignore' })
      await new Promise<void>((resolve) => killer.once('close', () => resolve()))
    } else child.kill(signal ?? 'SIGTERM')
  }
  await fs.rm(marker, { force: true })
  await fs.rm(root, { recursive: true, force: true, maxRetries: 8, retryDelay: 250 })
}
process.once('SIGINT', () => void stop('SIGINT').then(() => process.exit(130)))
process.once('SIGTERM', () => void stop('SIGTERM').then(() => process.exit(143)))
child.once('error', async (error) => { console.error(error); await stop(); process.exitCode = 1 })
child.once('exit', async (code) => { await stop(); process.exitCode = code ?? 1 })
