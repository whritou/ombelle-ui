import { afterEach, expect, it } from 'vitest'
import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { compile } from '@ombelle/compiler'
import { getCatalog } from '@ombelle/catalog'
import { componentsWithStyleSupport, type ComponentId, type FileChange } from '@ombelle/contracts'
import { createProject } from '../helpers/projects.js'
import { createNpmProject } from '../helpers/npm-project.js'
import { runNative } from '../helpers/bun-command.js'
import { runBuiltCli, runtimeIdentity, jsonRecord } from '../helpers/cli-runtime.js'
import { snapshotTree } from '../helpers/tree.js'

const roots: string[] = []
afterEach(async () => {
  for (const root of roots.splice(0))
    await fs.rm(root, { recursive: true, force: true })
})

const glassIds = componentsWithStyleSupport('liquid-glass', ['experimental'])
const notice = (ids: readonly string[]) =>
  'liquid-glass is experimental for ' + ids.join(', ') +
  '; see docs/components/liquid-glass.md for limitations'
const installOrder = ['button', 'dialog', 'badge', 'card', 'tabs', 'tooltip'] as const
const presetPath = path.resolve('packages/catalog/src/presets/liquid-glass.json')
const flatPath = path.resolve('packages/catalog/src/presets/flat.json')

async function writePresets() {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'ombelle-glass-presets-'))
  roots.push(dir)
  const glass = path.join(dir, 'liquid-glass.json')
  await fs.copyFile(presetPath, glass)
  const low = JSON.parse(await fs.readFile(presetPath, 'utf8'))
  low.design.glassOpacity = 0.6
  const lowFile = path.join(dir, 'low-opacity.json')
  await fs.writeFile(lowFile, JSON.stringify(low))
  const high = JSON.parse(await fs.readFile(presetPath, 'utf8'))
  high.revision = 2
  high.design.glassOpacity = 0.95
  const highFile = path.join(dir, 'high-opacity.json')
  await fs.writeFile(highFile, JSON.stringify(high))
  return { glass, lowFile, highFile }
}

async function seed(root: string, components: readonly ComponentId[]) {
  const file = path.join(root, 'package.json')
  const pkg = JSON.parse(await fs.readFile(file, 'utf8'))
  for (const component of components)
    for (const dependency of getCatalog('0.1.0').templates[component].dependencies)
      pkg.dependencies[dependency.name] = dependency.version
  Object.assign(pkg.dependencies, { clsx: '2.1.1', 'tailwind-merge': '3.7.0' })
  await fs.writeFile(file, JSON.stringify(pkg))
}

async function humanOutput(cwd: string, args: string[]) {
  const identity = await runtimeIdentity('node')
  const result = await runNative(
    identity.executable, [path.resolve('packages/cli/dist/main.js'), ...args], cwd, {},
  )
  return result.output
}

it('lists the six experimental ids', () => {
  expect(glassIds).toEqual(['button', 'badge', 'card', 'dialog', 'tabs', 'tooltip'])
})

for (const manager of ['pnpm', 'npm'] as const) {
  const make = () => (manager === 'npm' ? createNpmProject('vite') : createProject('vite'))
  const lockName = manager === 'npm' ? 'package-lock.json' : 'pnpm-lock.yaml'

  it(`installs liquid-glass components with notices and refuses unavailable ones (${manager})`, async () => {
    const root = await make()
    roots.push(root)
    const { glass } = await writePresets()
    const command = (args: string[]) => runBuiltCli('node', [...args, '--cwd', root, '--json'], root)
    await seed(root, installOrder)

    const init = await command(['init', '--preset', glass, '--yes'])
    expect(init.code, init.output).toBe(0)
    expect(jsonRecord(init.data).notices).toEqual([notice(glassIds)])

    const addArgs = ['add', ...installOrder]
    const dry = await command([...addArgs, '--dry-run'])
    expect(dry.code, dry.output).toBe(0)
    const dryPlan = jsonRecord(dry.data)
    expect(dryPlan.status).toBe('planned')
    expect(dryPlan.warnings).toEqual([])
    expect(dryPlan.notices).toEqual([notice(glassIds)])

    const applied = await command([...addArgs, '--yes'])
    expect(applied.code, applied.output).toBe(0)
    const appliedPlan = jsonRecord(applied.data)
    expect(appliedPlan.status).toBe('success')
    expect(appliedPlan.notices).toEqual([notice(glassIds)])

    const canonical = await compile({
      preset: JSON.parse(await fs.readFile(glass, 'utf8')),
      componentIds: [...installOrder],
      catalogRelease: '0.1.0',
      compilerVersion: '0.1.0',
    })
    const css = canonical.artifacts.filter(
      (a) => a.logicalPath.startsWith('components/ui/') && a.logicalPath.endsWith('.css'),
    )
    expect(css.map((a) => a.logicalPath).sort()).toEqual(
      ['badge', 'card', 'tabs', 'tooltip'].map((id) => 'components/ui/' + id + '.css'),
    )
    for (const artifact of canonical.artifacts.filter((a) => a.logicalPath.startsWith('components/ui/')))
      expect(await fs.readFile(path.join(root, 'src', artifact.logicalPath), 'utf8'), artifact.logicalPath)
        .toBe(artifact.content)
    expect((appliedPlan.changes as FileChange[]).some((c) => c.action === 'conflict')).toBe(false)

    // A subset only lists the ids it installs.
    const again = await command(['add', 'badge', '--dry-run'])
    expect(again.code, again.output).toBe(0)
    expect(jsonRecord(again.data).notices).toEqual([notice(['badge'])])

    // Unavailable component: refused, nothing written.
    const before = await snapshotTree(root)
    expect(Object.keys(before)).toContain(lockName)
    const refused = await command(['add', 'input', '--yes'])
    expect(refused.code, refused.output).not.toBe(0)
    expect(jsonRecord(jsonRecord(refused.data).error)).toMatchObject({ code: 'STYLE_UNAVAILABLE', path: '/componentIds' })
    expect(await snapshotTree(root)).toEqual(before)
  }, 180000)

  it(`refuses a mixed add as a whole (${manager})`, async () => {
    const root = await make()
    roots.push(root)
    const { glass } = await writePresets()
    const command = (args: string[]) => runBuiltCli('node', [...args, '--cwd', root, '--json'], root)
    await seed(root, ['button'])
    const init = await command(['init', '--preset', glass, '--yes'])
    expect(init.code, init.output).toBe(0)
    const before = await snapshotTree(root)
    const refused = await command(['add', 'button', 'input', '--yes'])
    expect(refused.code, refused.output).not.toBe(0)
    expect(jsonRecord(jsonRecord(refused.data).error).code).toBe('STYLE_UNAVAILABLE')
    const after = await snapshotTree(root)
    expect(after).toEqual(before)
    expect(Object.keys(after).some((f) => f.endsWith('/button.tsx'))).toBe(false)
  }, 180000)

  it(`switches a flat project with theme add and rejects low opacity (${manager})`, async () => {
    const root = await make()
    roots.push(root)
    const { glass, lowFile } = await writePresets()
    const command = (args: string[]) => runBuiltCli('node', [...args, '--cwd', root, '--json'], root)
    await seed(root, ['button'])

    const flatBefore = await snapshotTree(root)
    const low = await command(['theme', 'add', lowFile, '--yes'])
    expect(low.code, low.output).toBe(2)
    expect(jsonRecord(jsonRecord(low.data).error)).toMatchObject({ code: 'INVALID_DATA', path: '/design/glassOpacity' })
    expect(await snapshotTree(root)).toEqual(flatBefore)

    const human = await humanOutput(root, ['theme', 'add', glass, '--dry-run', '--cwd', root])
    expect(human).toContain('\nNotice: ' + notice(glassIds))

    const theme = await command(['theme', 'add', glass, '--yes'])
    expect(theme.code, theme.output).toBe(0)
    expect(jsonRecord(theme.data).notices).toEqual([notice(glassIds)])
    expect(await fs.readFile(path.join(root, 'src/index.css'), 'utf8')).toContain('--unrelated')
  }, 180000)

  it(`installs a scoped Button from a glass preset (${manager})`, async () => {
    const root = await make()
    roots.push(root)
    const { glass } = await writePresets()
    const command = (args: string[]) => runBuiltCli('node', [...args, '--cwd', root, '--json'], root)
    await seed(root, ['button'])
    const init = await command(['init', '--preset', path.resolve('packages/catalog/src/presets/minimalist.json'), '--yes'])
    expect(init.code, init.output).toBe(0)
    const added = await command(['add', 'button', '--preset', glass, '--yes'])
    expect(added.code, added.output).toBe(0)
    const plan = jsonRecord(added.data)
    expect(plan.status).toBe('success')
    expect(plan.notices).toEqual([notice(['button'])])
    expect(plan.warnings).toEqual([])
  }, 180000)

  it(`refuses theme add into glass while unavailable components are installed (${manager})`, async () => {
    const root = await make()
    roots.push(root)
    const { glass } = await writePresets()
    const command = (args: string[]) => runBuiltCli('node', [...args, '--cwd', root, '--json'], root)
    await seed(root, ['input'])
    const init = await command(['init', '--preset', flatPath, '--yes'])
    expect(init.code, init.output).toBe(0)
    const added = await command(['add', 'input', '--yes'])
    expect(added.code, added.output).toBe(0)

    const before = await snapshotTree(root)
    const refused = await command(['theme', 'add', glass, '--yes'])
    expect(refused.code, refused.output).toBe(2)
    const error = jsonRecord(jsonRecord(refused.data).error)
    expect(error).toMatchObject({ code: 'STYLE_UNAVAILABLE', path: '/componentIds' })
    expect(String(error.message)).toContain('input')
    expect(String(error.message)).toContain(glassIds.join(', '))
    expect(await snapshotTree(root)).toEqual(before)
  }, 180000)

  it(`refuses theme add out of glass while glass component CSS is installed (${manager})`, async () => {
    const root = await make()
    roots.push(root)
    const { glass } = await writePresets()
    const command = (args: string[]) => runBuiltCli('node', [...args, '--cwd', root, '--json'], root)
    await seed(root, ['card'])
    const init = await command(['init', '--preset', glass, '--yes'])
    expect(init.code, init.output).toBe(0)
    const added = await command(['add', 'card', '--yes'])
    expect(added.code, added.output).toBe(0)

    const before = await snapshotTree(root)
    const refused = await command(['theme', 'add', flatPath, '--yes'])
    expect(refused.code, refused.output).toBe(2)
    const error = jsonRecord(jsonRecord(refused.data).error)
    expect(error).toMatchObject({ code: 'STYLE_UNAVAILABLE', path: '/styleFamily' })
    expect(String(error.message)).toContain('card.css')
    expect(String(error.nextAction)).toBe('Remove card, switch the theme, then add them again.')
    expect(await snapshotTree(root)).toEqual(before)
  }, 180000)

  it(`switches out of glass when only ui-style.css carries glass rules and re-applies glass (${manager})`, async () => {
    const root = await make()
    roots.push(root)
    const { glass, highFile } = await writePresets()
    const command = (args: string[]) => runBuiltCli('node', [...args, '--cwd', root, '--json'], root)
    await seed(root, ['button', 'dialog'])
    const init = await command(['init', '--preset', glass, '--yes'])
    expect(init.code, init.output).toBe(0)
    const added = await command(['add', 'button', 'dialog', '--yes'])
    expect(added.code, added.output).toBe(0)

    const again = await command(['theme', 'add', highFile, '--yes'])
    expect(again.code, again.output).toBe(0)
    expect(jsonRecord(again.data).notices).toEqual([notice(glassIds)])
    expect(await fs.readFile(path.join(root, 'src/index.css'), 'utf8')).toContain('--glass-opacity: 0.95')

    const flat = await command(['theme', 'add', flatPath, '--yes'])
    expect(flat.code, flat.output).toBe(0)
    expect(jsonRecord(flat.data).notices).toEqual([])
  }, 180000)
}
