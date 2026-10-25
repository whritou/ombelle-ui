import { afterEach, expect, it } from 'vitest'
import fs from 'node:fs/promises'
import path from 'node:path'
import { createHash } from 'node:crypto'
import { getCatalog } from '@ombelle/catalog'
import type { FileChange, ProjectLock } from '@ombelle/contracts'
import { createProject } from '../helpers/projects.js'
import { runBuiltCli, jsonRecord } from '../helpers/cli-runtime.js'
import { snapshotTree } from '../helpers/tree.js'

const roots: string[] = []
const existingIds = ['button', 'badge', 'dialog', 'input'] as const

afterEach(async () => {
  for (const root of roots.splice(0))
    await fs.rm(root, { recursive: true, force: true })
})

for (const framework of ['vite', 'next'] as const)
  it.each(['flat', 'minimalist', 'neo-brutalism'] as const)(
    `plans and installs owned Card artifacts without changing existing state in ${framework}/%s`,
    async (family) => {
      const root = await createProject(framework)
      roots.push(root)
      const read = (file: string) => fs.readFile(path.join(root, file), 'utf8')
      const command = (args: string[]) =>
        runBuiltCli('node', [...args, '--cwd', root, '--json'], root)
      const pkg = JSON.parse(await read('package.json'))
      // Keep setup offline: existing components' declared dependencies are installed.
      for (const id of existingIds)
        for (const dependency of getCatalog('0.1.0').templates[id].dependencies)
          pkg.dependencies[dependency.name] = dependency.version
      await fs.writeFile(path.join(root, 'package.json'), JSON.stringify(pkg))
      const config = JSON.parse(await read('components.json'))
      // Exercise both the default destination and an upstream custom UI alias.
      const customAlias = framework === 'next'
      if (customAlias) config.aliases.ui = '@/design-system/ui'
      await fs.writeFile(path.join(root, 'components.json'), JSON.stringify(config))
      const uiDir = customAlias ? 'src/design-system/ui' : 'src/components/ui'
      const uiAlias = customAlias ? '@/design-system/ui' : '@/components/ui'
      const initialized = await command([
        'init', '--preset',
        path.resolve('packages/catalog/src/presets', family + '.json'),
        '--yes',
      ])
      expect(initialized.code, initialized.output).toBe(0)
      const existing = await command(['add', ...existingIds, '--yes'])
      expect(existing.code, existing.output).toBe(0)
      const lockBefore: ProjectLock = JSON.parse(await read('ui-library.lock.json'))
      const before = await snapshotTree(root)
      const expectedArtifacts = [
        { path: uiDir + '/card.css', logicalPath: 'components/ui/card.css', kind: 'style' },
        { path: uiDir + '/card.tsx', logicalPath: 'components/ui/card.tsx', kind: 'component' },
        { path: 'src/ombelle-examples/card.tsx', logicalPath: 'examples/card.tsx', kind: 'usage' },
      ]

      const dry = await command(['add', 'card', '--dry-run'])
      expect(dry.code, dry.output).toBe(0)
      const dryData = jsonRecord(dry.data)
      expect(dryData).toMatchObject({
        status: 'planned', packageManager: 'pnpm', networkAccess: false,
        presetHash: jsonRecord(initialized.data).presetHash,
        dependencyPlan: [], warnings: [],
      })
      const changes = dryData.changes as FileChange[]
      expect(changes.filter((change) => change.action === 'create').map(({ path, kind }) => ({ path, kind })))
        .toEqual(expectedArtifacts.map(({ path, kind }) => ({ path, kind })))
      expect(changes.filter((change) => change.action === 'update').map((change) => change.path))
        .toEqual(['./ui-library.lock.json'])
      expect(await snapshotTree(root)).toEqual(before)

      const installed = await command(['add', 'card', '--yes'])
      expect(installed.code, installed.output).toBe(0)
      expect(jsonRecord(installed.data)).toMatchObject({
        status: 'success', packageManager: 'pnpm', dependencyPlan: [],
        presetHash: dryData.presetHash,
      })
      const lock: ProjectLock = JSON.parse(await read('ui-library.lock.json'))
      for (const artifact of expectedArtifacts) {
        const content = await read(artifact.path)
        expect(content).toBe(changes.find((change) => change.path === artifact.path)!.afterContent)
        expect(lock.artifacts[artifact.path]).toEqual({
          logicalPath: artifact.logicalPath,
          kind: artifact.kind,
          sha256: createHash('sha256').update(content).digest('hex'),
        })
      }
      expect(await read(uiDir + '/card.tsx')).toContain("import './card.css'")
      expect(await read(uiDir + '/card.tsx')).toContain("from '@/lib/utils'")
      expect(await read('src/ombelle-examples/card.tsx')).toContain(`from '${uiAlias}/card'`)
      for (const [file, record] of Object.entries(lockBefore.artifacts))
        expect(lock.artifacts[file], file).toEqual(record)
      expect({ ...lock, artifacts: {} }).toEqual({ ...lockBefore, artifacts: {} })
      expect(Object.keys(lock.artifacts).sort()).toEqual([
        ...Object.keys(lockBefore.artifacts), ...expectedArtifacts.map((artifact) => artifact.path),
      ].sort())
      const after = await snapshotTree(root)
      // Every existing byte remains owned by its original operation, including
      // components, utility, global CSS, saved defaults, manager metadata and lockfile.
      for (const [file, hash] of Object.entries(before))
        if (file !== 'ui-library.lock.json') expect(after[file], file).toBe(hash)
      expect(Object.keys(after).filter((file) => !(file in before)).sort())
        .toEqual(expectedArtifacts.map((artifact) => artifact.path).sort())

      const repeat = await command(['add', 'card', '--yes'])
      expect(repeat.code, repeat.output).toBe(0)
      expect((jsonRecord(repeat.data).changes as FileChange[]).every((change) => change.action === 'noop'))
        .toBe(true)
      expect(await snapshotTree(root)).toEqual(after)

      for (const name of ['card.tsx', 'card.css']) {
        const file = uiDir + '/' + name
        const original = await read(file)
        await fs.appendFile(path.join(root, file), '\n/* local edit */\n')
        const edited = await snapshotTree(root)
        const conflict = await command(['add', 'card', '--yes'])
        expect(conflict.code, conflict.output).toBe(4)
        expect(jsonRecord(conflict.data)).toMatchObject({
          status: 'conflict',
          warnings: expect.arrayContaining([expect.objectContaining({ code: 'FILE_CONFLICT', path: file })]),
          changes: expect.arrayContaining([expect.objectContaining({ action: 'conflict', path: file })]),
        })
        expect(await snapshotTree(root)).toEqual(edited)
        await fs.writeFile(path.join(root, file), original)
      }
    },
  )
