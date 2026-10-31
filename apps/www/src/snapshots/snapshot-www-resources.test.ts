import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { spawnSync } from 'node:child_process'
import { afterEach, expect, it } from 'vitest'
import { prepareSnapshotBrowserResources } from '../../../../scripts/snapshot-www-resources.js'

const roots: string[] = []
afterEach(async () => {
  await Promise.all(roots.splice(0).map((root) => fs.rm(root, { recursive: true, force: true })))
})

it('cleans the owned marker and temporary database when prebuild fails', async () => {
  const repo = await fs.mkdtemp(path.join(os.tmpdir(), 'snapshot-www-repo-'))
  roots.push(repo)
  const root = path.join(repo, 'owned-temp')
  await expect(
    prepareSnapshotBrowserResources(
      repo,
      () => {
        throw new Error('prebuild failed')
      },
      async () => {
        await fs.mkdir(root)
        return root
      },
    ),
  ).rejects.toThrow('prebuild failed')
  await expect(fs.access(root)).rejects.toThrow()
  await expect(fs.access(path.join(repo, '.artifacts/snapshot-browser.json'))).rejects.toThrow()
})

it('preserves a marker owned by another invocation and removes its own temporary database', async () => {
  const repo = await fs.mkdtemp(path.join(os.tmpdir(), 'snapshot-www-repo-'))
  roots.push(repo)
  const root = path.join(repo, 'owned-temp'),
    marker = path.join(repo, '.artifacts/snapshot-browser.json')
  await fs.mkdir(path.dirname(marker), { recursive: true })
  await fs.writeFile(marker, 'existing owner')
  await expect(
    prepareSnapshotBrowserResources(
      repo,
      () => {},
      async () => {
        await fs.mkdir(root)
        return root
      },
    ),
  ).rejects.toThrow()
  await expect(fs.readFile(marker, 'utf8')).resolves.toBe('existing owner')
  await expect(fs.access(root)).rejects.toThrow()
})

// Windows test runners stop the server with a forced tree kill, so its exit
// handlers cannot remove the marker. A later run recovers only a dead owner.
const exitedPid = () => spawnSync(process.execPath, ['-e', ''], { windowsHide: true }).pid!
async function staleOwner(pid: number, root?: string) {
  const repo = await fs.mkdtemp(path.join(os.tmpdir(), 'snapshot-www-repo-'))
  const staleRoot = root ?? (await fs.mkdtemp(path.join(os.tmpdir(), 'ombelle-snapshot-www-')))
  roots.push(repo, staleRoot)
  const marker = path.join(repo, '.artifacts/snapshot-browser.json')
  await fs.mkdir(path.dirname(marker), { recursive: true })
  const contents = JSON.stringify({ pid, dbPath: path.join(staleRoot, 'snapshots.sqlite'), root: staleRoot })
  await fs.writeFile(marker, contents)
  const ownRoot = path.join(repo, 'owned-temp')
  const prepare = () => prepareSnapshotBrowserResources(repo, () => {}, async () => {
    await fs.mkdir(ownRoot)
    return ownRoot
  })
  return { marker, contents, staleRoot, ownRoot, prepare }
}

it('recovers a marker and temporary database left by an exited owner', async () => {
  const stale = await staleOwner(exitedPid())
  const resources = await stale.prepare()
  await expect(fs.access(stale.staleRoot)).rejects.toThrow()
  expect(JSON.parse(await fs.readFile(stale.marker, 'utf8'))).toEqual({ pid: process.pid, dbPath: resources.dbPath, root: stale.ownRoot })
  await resources.cleanup()
  await expect(fs.access(stale.marker)).rejects.toThrow()
})

it('preserves a marker whose owner is still running', async () => {
  const stale = await staleOwner(process.pid)
  await expect(stale.prepare()).rejects.toThrow()
  await expect(fs.readFile(stale.marker, 'utf8')).resolves.toBe(stale.contents)
  await expect(fs.access(stale.staleRoot)).resolves.toBeUndefined()
  await expect(fs.access(stale.ownRoot)).rejects.toThrow()
})

it('preserves an exited owner marker whose root is not a snapshot temporary directory', async () => {
  const outside = await fs.mkdtemp(path.join(os.tmpdir(), 'unrelated-'))
  const stale = await staleOwner(exitedPid(), outside)
  await expect(stale.prepare()).rejects.toThrow()
  await expect(fs.readFile(stale.marker, 'utf8')).resolves.toBe(stale.contents)
  await expect(fs.access(outside)).resolves.toBeUndefined()
})
