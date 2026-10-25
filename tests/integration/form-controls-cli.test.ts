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
const formIds = ['label', 'textarea', 'native-select'] as const
type TemplateId = keyof ReturnType<typeof getCatalog>['templates']
const lucide = { name: 'lucide-react', version: '1.55.0' }
const sha = (content: string) => createHash('sha256').update(content).digest('hex')
const flatPreset = () => path.resolve('packages/catalog/src/presets/flat.json')

afterEach(async () => {
  for (const root of roots.splice(0))
    await fs.rm(root, { recursive: true, force: true })
})

async function project(framework: 'vite' | 'next') {
  const root = await createProject(framework)
  roots.push(root)
  return {
    root,
    read: (file: string) => fs.readFile(path.join(root, file), 'utf8'),
    write: (file: string, content: string) =>
      fs.writeFile(path.join(root, file), content),
    command: (args: string[]) =>
      runBuiltCli('node', [...args, '--cwd', root, '--json'], root),
  }
}

type Project = Awaited<ReturnType<typeof project>>

// Keeps setup offline: seeds declared catalog dependencies into package.json.
async function seedDependencies(
  { read, write }: Project,
  ids: readonly TemplateId[],
  options: { except?: string } = {},
) {
  const pkg = JSON.parse(await read('package.json'))
  for (const id of ids)
    for (const dependency of getCatalog('0.1.0').templates[id].dependencies)
      if (dependency.name !== options.except)
        pkg.dependencies[dependency.name] = dependency.version
  await write('package.json', JSON.stringify(pkg))
}

for (const framework of ['vite', 'next'] as const)
  for (const family of ['flat', 'minimalist', 'neo-brutalism'] as const)
    it.each(formIds)(
      `plans and installs owned %s artifacts in ${framework}/${family}`,
      async (id) => {
        const p = await project(framework)
        const { root, read, command } = p
        // Exercise both the default destination and a custom UI alias.
        const customAlias = framework === 'next'
        const config = JSON.parse(await read('components.json'))
        if (customAlias) config.aliases.ui = '@/design-system/ui'
        await p.write('components.json', JSON.stringify(config))
        const uiDir = customAlias ? 'src/design-system/ui' : 'src/components/ui'
        await seedDependencies(p, ['input', ...formIds], { except: lucide.name })
        const initialized = await command(['init', '--preset', path.resolve('packages/catalog/src/presets', family + '.json'), '--yes'])
        expect(initialized.code, initialized.output).toBe(0)
        // An existing component installs the shared utility first, as in card-cli.
        const existing = await command(['add', 'input', '--yes'])
        expect(existing.code, existing.output).toBe(0)
        const packageJsonBefore = await read('package.json')
        const lockfileBefore = await read('pnpm-lock.yaml')
        const before = await snapshotTree(root)
        const expectedArtifacts = [
          { path: uiDir + '/' + id + '.css', logicalPath: 'components/ui/' + id + '.css', kind: 'style' },
          { path: uiDir + '/' + id + '.tsx', logicalPath: 'components/ui/' + id + '.tsx', kind: 'component' },
          { path: 'src/ombelle-examples/' + id + '.tsx', logicalPath: 'examples/' + id + '.tsx', kind: 'usage' },
        ]

        const dry = await command(['add', id, '--dry-run'])
        expect(dry.code, dry.output).toBe(0)
        const dryData = jsonRecord(dry.data)
        expect(dryData).toMatchObject({ status: 'planned', packageManager: 'pnpm', networkAccess: false, warnings: [] })
        const dependencyPlan = dryData.dependencyPlan as { name: string; version: string }[]
        expect(dependencyPlan.map(({ name, version }) => ({ name, version })))
          .toEqual(id === 'native-select' ? [lucide] : [])
        const changes = dryData.changes as FileChange[]
        expect(changes.filter((change) => change.action === 'create').map(({ path, kind }) => ({ path, kind })))
          .toEqual(expectedArtifacts.map(({ path, kind }) => ({ path, kind })))
        expect(await snapshotTree(root)).toEqual(before)

        await seedDependencies(p, [id])
        const seeded = await read('package.json')
        const installed = await command(['add', id, '--yes'])
        expect(installed.code, installed.output).toBe(0)
        expect(jsonRecord(installed.data)).toMatchObject({ status: 'success', packageManager: 'pnpm', dependencyPlan: [] })
        const lock: ProjectLock = JSON.parse(await read('ui-library.lock.json'))
        for (const artifact of expectedArtifacts) {
          const content = await read(artifact.path)
          expect(content).toBe(changes.find((change) => change.path === artifact.path)!.afterContent)
          expect(lock.artifacts[artifact.path]).toEqual({
            logicalPath: artifact.logicalPath,
            kind: artifact.kind,
            sha256: sha(content),
          })
        }
        expect(await read(uiDir + '/' + id + '.tsx')).toContain("import './" + id + ".css'")
        // Package manager metadata, dependency declarations and the lockfile are untouched.
        expect(await read('package.json')).toBe(seeded)
        expect(JSON.parse(await read('package.json')).packageManager).toBe(JSON.parse(packageJsonBefore).packageManager)
        expect(await read('pnpm-lock.yaml')).toBe(lockfileBefore)

        const after = await snapshotTree(root)
        const repeat = await command(['add', id, '--yes'])
        expect(repeat.code, repeat.output).toBe(0)
        expect((jsonRecord(repeat.data).changes as FileChange[]).every((change) => change.action === 'noop')).toBe(true)
        expect(await snapshotTree(root)).toEqual(after)

        for (const extension of ['tsx', 'css']) {
          const file = uiDir + '/' + id + '.' + extension
          const original = await read(file)
          await fs.appendFile(path.join(root, file), '\n/* local edit */\n')
          const edited = await snapshotTree(root)
          const conflict = await command(['add', id, '--yes'])
          expect(conflict.code, conflict.output).toBe(4)
          expect(jsonRecord(conflict.data)).toMatchObject({
            status: 'conflict',
            warnings: expect.arrayContaining([expect.objectContaining({ code: 'FILE_CONFLICT', path: file })]),
            changes: expect.arrayContaining([expect.objectContaining({ action: 'conflict', path: file })]),
          })
          expect(await snapshotTree(root)).toEqual(edited)
          await p.write(file, original)
        }
      },
    )

it('names theme add when the shared stylesheet is stale but unedited', async () => {
  const p = await project('vite')
  const { read, write, command } = p
  await seedDependencies(p, ['input', 'textarea'])
  const initialized = await command(['init', '--preset', flatPreset(), '--yes'])
  expect(initialized.code, initialized.output).toBe(0)
  const added = await command(['add', 'input', '--yes'])
  expect(added.code, added.output).toBe(0)
  const styleFile = 'src/styles/ui-style.css'
  const compiled = await read(styleFile)
  // Simulates a stylesheet installed before the Input invalid rule existed.
  const stale = compiled.replace(
    /^\[data-slot=['"]input['"]\]\[aria-invalid=['"]true['"]\]\s*\{[^}]*\}\r?\n/m,
    '',
  )
  expect(stale).not.toBe(compiled)
  await write(styleFile, stale)
  const lock: ProjectLock = JSON.parse(await read('ui-library.lock.json'))
  lock.artifacts[styleFile] = { ...lock.artifacts[styleFile], sha256: sha(stale) }
  await write('ui-library.lock.json', JSON.stringify(lock))

  const blocked = await command(['add', 'textarea', '--yes'])
  expect(blocked.code, blocked.output).toBe(4)
  expect(jsonRecord(blocked.data)).toMatchObject({
    status: 'conflict',
    warnings: expect.arrayContaining([
      expect.objectContaining({
        code: 'FILE_CONFLICT',
        path: styleFile,
        message: expect.stringContaining('run theme add ./ui-preset.json'),
      }),
    ]),
  })
  expect(await read(styleFile)).toBe(stale)

  const themed = await command(['theme', 'add', './ui-preset.json', '--yes'])
  expect(themed.code, themed.output).toBe(0)
  expect(await read(styleFile)).toBe(compiled)
  const retry = await command(['add', 'textarea', '--yes'])
  expect(retry.code, retry.output).toBe(0)
})

it('keeps edited shared stylesheets as conflicts', async () => {
  const p = await project('vite')
  const { root, read, command } = p
  await seedDependencies(p, ['input', 'textarea'])
  expect((await command(['init', '--preset', flatPreset(), '--yes'])).code).toBe(0)
  expect((await command(['add', 'input', '--yes'])).code).toBe(0)
  const styleFile = 'src/styles/ui-style.css'
  await fs.appendFile(path.join(root, styleFile), '\n/* local edit */\n')
  const edited = await snapshotTree(root)
  const conflict = await command(['add', 'textarea', '--yes'])
  expect(conflict.code, conflict.output).toBe(4)
  expect(jsonRecord(conflict.data)).toMatchObject({
    warnings: expect.arrayContaining([
      expect.objectContaining({
        code: 'FILE_CONFLICT',
        path: styleFile,
        message: 'Existing source requires an explicit migration',
      }),
    ]),
  })
  expect(await read(styleFile)).toContain('/* local edit */')
  expect(await snapshotTree(root)).toEqual(edited)
})

it('migrates a legacy text-close Dialog by deleting it', async () => {
  const p = await project('vite')
  const { root, read, write, command } = p
  await seedDependencies(p, ['dialog'])
  expect((await command(['init', '--preset', flatPreset(), '--yes'])).code).toBe(0)
  expect((await command(['add', 'dialog', '--yes'])).code).toBe(0)
  const file = 'src/components/ui/dialog.tsx'
  const legacy = (await read(file)).replace(
    /(<DialogPrimitive\.Close[^>]*>)[\s\S]*?(<\/DialogPrimitive\.Close>)/,
    '$1Close$2',
  )
  expect(legacy).not.toContain('<XIcon')
  await write(file, legacy)
  const lock: ProjectLock = JSON.parse(await read('ui-library.lock.json'))
  lock.artifacts[file] = { ...lock.artifacts[file], sha256: sha(legacy) }
  await write('ui-library.lock.json', JSON.stringify(lock))

  const conflict = await command(['add', 'dialog', '--yes'])
  expect(conflict.code, conflict.output).toBe(4)
  expect(await read(file)).toBe(legacy)

  await fs.rm(path.join(root, file))
  const migrated = await command(['add', 'dialog', '--yes'])
  expect(migrated.code, migrated.output).toBe(0)
  expect(await read(file)).toContain('<XIcon')
})
