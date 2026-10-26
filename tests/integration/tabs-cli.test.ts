import { afterEach, expect, it } from 'vitest'
import fs from 'node:fs/promises'
import path from 'node:path'
import { createHash } from 'node:crypto'
import { getCatalog } from '@ombelle/catalog'
import { supportedStyleFamilies, type FileChange, type ProjectLock } from '@ombelle/contracts'
import { createProject } from '../helpers/projects.js'
import { runBuiltCli, jsonRecord } from '../helpers/cli-runtime.js'
import { snapshotTree } from '../helpers/tree.js'

const roots: string[] = []
const id = 'tabs' as const
const dependencies = [{ name: '@radix-ui/react-tabs', version: '1.2.1' }]

afterEach(async () => {
  for (const root of roots.splice(0))
    await fs.rm(root, { recursive: true, force: true })
})

for (const framework of ['vite', 'next'] as const)
  for (const family of supportedStyleFamilies)
    it(`owns and preserves Tabs artifacts in ${framework}/${family}`, async () => {
      const root = await createProject(framework)
      roots.push(root)
      const read = (file: string) => fs.readFile(path.join(root, file), 'utf8')
      const write = (file: string, content: string) => fs.writeFile(path.join(root, file), content)
      const command = (args: string[]) => runBuiltCli('node', [...args, '--cwd', root, '--json'], root)
      const customAlias = framework === 'next'
      const uiDir = customAlias ? 'src/design-system/ui' : 'src/components/ui'
      if (customAlias) {
        const config = JSON.parse(await read('components.json'))
        config.aliases.ui = '@/design-system/ui'
        await write('components.json', JSON.stringify(config))
      }
      const seed = async (components: readonly ('input' | typeof id)[]) => {
        const pkg = JSON.parse(await read('package.json'))
        for (const component of components)
          for (const dependency of getCatalog('0.1.0').templates[component].dependencies)
            pkg.dependencies[dependency.name] = dependency.version
        await write('package.json', JSON.stringify(pkg))
      }
      await seed(['input'])
      const initialized = await command([
        'init', '--preset', path.resolve('packages/catalog/src/presets', family + '.json'), '--yes',
      ])
      expect(initialized.code, initialized.output).toBe(0)
      expect((await command(['add', 'input', '--yes'])).code).toBe(0)
      await fs.appendFile(path.join(root, uiDir, 'input.tsx'), '\n/* preserved consumer edit */\n')
      const preserved = [
        uiDir + '/input.tsx', 'src/styles/ui-style.css', 'src/index.css',
        'ui-preset.json', 'ui-library.config.json', 'components.json', 'pnpm-lock.yaml',
      ]
      const original = Object.fromEntries(
        await Promise.all(preserved.map(async (file) => [file, await read(file)])),
      )
      const before = await snapshotTree(root)
      const dry = await command(['add', id, '--dry-run'])
      expect(dry.code, dry.output).toBe(0)
      const plan = jsonRecord(dry.data)
      expect(plan).toMatchObject({
        status: 'planned', packageManager: 'pnpm', networkAccess: false, warnings: [],
      })
      expect((plan.dependencyPlan as typeof dependencies).map(({ name, version }) => ({ name, version })))
        .toEqual(dependencies)
      const changes = plan.changes as FileChange[]
      const artifacts = [
        { path: uiDir + '/' + id + '.css', logicalPath: 'components/ui/' + id + '.css', kind: 'style' },
        { path: uiDir + '/' + id + '.tsx', logicalPath: 'components/ui/' + id + '.tsx', kind: 'component' },
        { path: 'src/ombelle-examples/' + id + '.tsx', logicalPath: 'examples/' + id + '.tsx', kind: 'usage' },
      ]
      expect(changes.filter((change) => change.action === 'create').map(({ path, kind }) => ({ path, kind })))
        .toEqual(artifacts.map(({ path, kind }) => ({ path, kind })))
      expect(await snapshotTree(root)).toEqual(before)
      // Predeclared exact dependencies keep this ownership test offline.
      await seed([id])
      const packageBefore = await read('package.json')
      const applied = await command(['add', id, '--yes'])
      expect(applied.code, applied.output).toBe(0)
      expect(jsonRecord(applied.data)).toMatchObject({
        status: 'success', packageManager: 'pnpm', dependencyPlan: [],
        presetHash: jsonRecord(initialized.data).presetHash,
      })
      const lock: ProjectLock = JSON.parse(await read('ui-library.lock.json'))
      for (const artifact of artifacts) {
        const content = await read(artifact.path)
        expect(content).toBe(changes.find((change) => change.path === artifact.path)!.afterContent)
        expect(lock.artifacts[artifact.path]).toEqual({
          logicalPath: artifact.logicalPath,
          kind: artifact.kind,
          sha256: createHash('sha256').update(content).digest('hex'),
        })
      }
      expect(await read(uiDir + '/' + id + '.tsx')).toContain("import './" + id + ".css'")
      expect(await read('src/ombelle-examples/' + id + '.tsx'))
        .toContain("from '" + (customAlias ? '@/design-system/ui/' : '@/components/ui/') + id + "'")
      for (const file of preserved) expect(await read(file)).toBe(original[file])
      expect(await read('package.json')).toBe(packageBefore)
      const installedDependencies = JSON.parse(packageBefore).dependencies
      for (const dependency of [
        ...dependencies, { name: 'react', version: '19.3.1' },
        { name: 'clsx', version: '2.1.1' }, { name: 'tailwind-merge', version: '3.7.0' },
      ])
        expect(installedDependencies[dependency.name]).toBe(dependency.version)
      const after = await snapshotTree(root)
      const repeat = await command(['add', id, '--yes'])
      expect(repeat.code, repeat.output).toBe(0)
      expect((jsonRecord(repeat.data).changes as FileChange[]).every((change) => change.action === 'noop')).toBe(true)
      expect(await snapshotTree(root)).toEqual(after)
      for (const extension of ['tsx', 'css']) {
        const file = uiDir + '/' + id + '.' + extension
        const source = await read(file)
        await fs.appendFile(path.join(root, file), '\n/* local edit */\n')
        const edited = await snapshotTree(root)
        const result = await command(['add', id, '--yes'])
        expect(result.code, result.output).toBe(4)
        expect(jsonRecord(result.data)).toMatchObject({
          status: 'conflict',
          warnings: expect.arrayContaining([expect.objectContaining({ code: 'FILE_CONFLICT', path: file })]),
          changes: expect.arrayContaining([expect.objectContaining({ action: 'conflict', path: file })]),
        })
        expect(await snapshotTree(root)).toEqual(edited)
        await write(file, source)
      }
    })

