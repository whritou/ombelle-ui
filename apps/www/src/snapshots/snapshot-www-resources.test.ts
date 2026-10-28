import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
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
