import { afterEach, expect, it } from 'vitest'
import fs from 'node:fs/promises'
import path from 'node:path'
import { compile } from '@ombelle/compiler'
import { getCatalog } from '@ombelle/catalog'
import { supportedStyleFamilies, type ComponentId } from '@ombelle/contracts'
import { createProject } from '../helpers/projects.js'
import { runBuiltCli, jsonRecord } from '../helpers/cli-runtime.js'
import { snapshotTree } from '../helpers/tree.js'

const roots: string[] = []
afterEach(async () => {
  for (const root of roots.splice(0))
    await fs.rm(root, { recursive: true, force: true })
})

for (const framework of ['vite', 'next'] as const)
  it.each(supportedStyleFamilies)(
    `installs Badge with owned CSS, no-op, dry-run, and edit protection in ${framework}/%s`,
    async (family) => {
      const root = await createProject(framework)
      roots.push(root)
      const pkgFile = path.join(root, 'package.json')
      const pkg = JSON.parse(await fs.readFile(pkgFile, 'utf8'))
      Object.assign(pkg.dependencies, {
        clsx: '2.1.1',
        'tailwind-merge': '3.7.0',
      })
      await fs.writeFile(pkgFile, JSON.stringify(pkg))
      const configFile = path.join(root, 'components.json')
      const config = JSON.parse(await fs.readFile(configFile, 'utf8'))
      config.aliases.ui = '@/design-system/ui'
      await fs.writeFile(configFile, JSON.stringify(config))
      const command = (args: string[]) =>
        runBuiltCli('node', [...args, '--cwd', root, '--json'], root)
      const initialized = await command([
        'init',
        '--preset',
        path.resolve('packages/catalog/src/presets', family + '.json'),
        '--yes',
      ])
      expect(initialized.code, initialized.output).toBe(0)
      expect((await command(['add', 'input', '--yes'])).code).toBe(0)
      const before = await snapshotTree(root)
      const protectedPaths = [
        'package.json',
        'pnpm-lock.yaml',
        'components.json',
        'ui-preset.json',
        'ui-library.config.json',
        'src/index.css',
        'src/design-system/ui/input.tsx',
      ]
      const protectedBytes = await Promise.all(
        protectedPaths.map((file) => fs.readFile(path.join(root, file))),
      )
      const dry = await command(['add', 'badge', '--dry-run'])
      expect(dry.code, dry.output).toBe(0)
      expect(await snapshotTree(root)).toEqual(before)
      const installed = await command(['add', 'badge', '--yes'])
      expect(installed.code, installed.output).toBe(0)
      expect(jsonRecord(installed.data).presetHash).toBe(
        jsonRecord(initialized.data).presetHash,
      )
      const canonical = await compile({
        preset: getCatalog('0.1.0').presets[family],
        componentIds: ['badge' as ComponentId],
        catalogRelease: '0.1.0',
        compilerVersion: '0.1.0',
      })
      for (const name of ['badge.tsx', 'badge.css'])
        expect(
          await fs.readFile(
            path.join(root, 'src/design-system/ui', name),
            'utf8',
          ),
        ).toBe(
          canonical.artifacts.find(
            (a) => a.logicalPath === 'components/ui/' + name,
          )!.content,
        )
      expect(
        await fs.readFile(
          path.join(root, 'src/ombelle-examples/badge.tsx'),
          'utf8',
        ),
      ).toContain("from '@/design-system/ui/badge'")
      const lock = JSON.parse(
        await fs.readFile(path.join(root, 'ui-library.lock.json'), 'utf8'),
      )
      expect(lock.artifacts['src/design-system/ui/badge.css'].logicalPath).toBe(
        'components/ui/badge.css',
      )
      expect(
        await Promise.all(
          protectedPaths.map((file) => fs.readFile(path.join(root, file))),
        ),
      ).toEqual(protectedBytes)
      const after = await snapshotTree(root)
      expect((await command(['add', 'badge', '--yes'])).code).toBe(0)
      expect(await snapshotTree(root)).toEqual(after)
      for (const name of ['badge.tsx', 'badge.css']) {
        const file = path.join(root, 'src/design-system/ui', name),
          original = await fs.readFile(file, 'utf8')
        await fs.appendFile(file, '\n/* local edit */')
        const edited = await snapshotTree(root)
        expect((await command(['add', 'badge', '--yes'])).code).toBe(4)
        expect(await snapshotTree(root)).toEqual(edited)
        await fs.writeFile(file, original)
      }
    },
  )
