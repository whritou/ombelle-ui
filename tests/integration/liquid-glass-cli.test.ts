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
const mountNotice =
  'mount <LiquidGlassFilter /> from components/ui/liquid-glass-filter once in your root layout for refraction in Chromium browsers'
const notice = (ids: readonly string[]) =>
  'liquid-glass is experimental for ' + ids.join(', ') +
  '; see docs/components/liquid-glass.md for limitations'
const contrastNotice = expect.stringContaining('Liquid glass text contrast fails in')
const installOrder = [
  'button', 'dialog', 'badge', 'card', 'tabs', 'tooltip', 'alert', 'dropdown-menu', 'popover', 'input',
  'label', 'textarea', 'native-select', 'checkbox', 'switch', 'radio-group', 'select', 'avatar', 'separator',
  'table', 'accordion', 'progress', 'skeleton',
  'input-group', 'sheet', 'alert-dialog', 'breadcrumb', 'pagination', 'toast',
  'spinner', 'kbd', 'empty', 'field', 'meter', 'stepper',
  'slider', 'toggle-group', 'chip', 'tag-input', 'input-otp', 'combobox', 'command', 'hover-card', 'context-menu', 'calendar', 'toggle', 'collapsible', 'scroll-area', 'button-group', 'item', 'number-input', 'color-picker',
] as const
const installed = glassIds.filter((id) => (installOrder as readonly string[]).includes(id))
const presetPath = path.resolve('packages/catalog/src/presets/liquid-glass.json')
const flatPath = path.resolve('packages/catalog/src/presets/flat.json')

async function writePresets() {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'ombelle-glass-presets-'))
  roots.push(dir)
  const glass = path.join(dir, 'liquid-glass.json')
  await fs.copyFile(presetPath, glass)
  const low = JSON.parse(await fs.readFile(presetPath, 'utf8'))
  low.design.glassOpacity = 0.3
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

it('lists the fifty-two experimental ids, one per catalog component', () => {
  expect(glassIds).toEqual(['alert', 'accordion', 'button', 'badge', 'avatar', 'card', 'checkbox', 'dialog', 'dropdown-menu', 'input', 'label', 'popover', 'progress', 'native-select', 'radio-group', 'select', 'switch', 'separator', 'skeleton', 'tabs', 'table', 'textarea', 'tooltip', 'input-group', 'sheet', 'alert-dialog', 'breadcrumb', 'pagination', 'toast', 'spinner', 'kbd', 'empty', 'field', 'meter', 'stepper', 'slider', 'toggle-group', 'chip', 'tag-input', 'input-otp', 'combobox', 'command', 'hover-card', 'context-menu', 'calendar', 'toggle', 'collapsible', 'scroll-area', 'button-group', 'item', 'number-input', 'color-picker'])
})

for (const manager of ['pnpm', 'npm'] as const) {
  const make = () => (manager === 'npm' ? createNpmProject('vite') : createProject('vite'))
  const lockName = manager === 'npm' ? 'package-lock.json' : 'pnpm-lock.yaml'

  it(`installs liquid-glass components with notices (${manager})`, async () => {
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
    expect(dryPlan.notices).toEqual([notice(installed), mountNotice])

    const applied = await command([...addArgs, '--yes'])
    expect(applied.code, applied.output).toBe(0)
    const appliedPlan = jsonRecord(applied.data)
    expect(appliedPlan.status).toBe('success')
    expect(appliedPlan.notices).toEqual([notice(installed), mountNotice])
    expect(await fs.readFile(path.join(root, 'src/components/ui/liquid-glass-filter.tsx'), 'utf8')).toContain('ombelle-liquid-glass')

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
      [
        'accordion', 'alert', 'avatar', 'badge', 'card', 'checkbox', 'dropdown-menu', 'label', 'native-select', 'popover', 'progress',
        'radio-group', 'select', 'separator', 'skeleton', 'switch', 'table', 'tabs', 'textarea', 'tooltip',
        'input-group', 'sheet', 'alert-dialog', 'breadcrumb', 'pagination', 'toast',
        'spinner', 'kbd', 'empty', 'field', 'meter', 'stepper',
        'slider', 'toggle-group', 'chip', 'tag-input', 'input-otp', 'combobox', 'command', 'hover-card', 'context-menu', 'calendar', 'toggle', 'collapsible', 'scroll-area', 'button-group', 'item', 'number-input', 'color-picker',
      ].map((id) => 'components/ui/' + id + '.css').sort(),
    )
    for (const artifact of canonical.artifacts.filter((a) => a.logicalPath.startsWith('components/ui/')))
      expect(await fs.readFile(path.join(root, 'src', artifact.logicalPath), 'utf8'), artifact.logicalPath)
        .toBe(artifact.content)
    expect((appliedPlan.changes as FileChange[]).some((c) => c.action === 'conflict')).toBe(false)

    // A subset only lists the ids it installs.
    const again = await command(['add', 'badge', '--dry-run'])
    expect(again.code, again.output).toBe(0)
    expect(jsonRecord(again.data).notices).toEqual([notice(['badge']), mountNotice])
  }, 180000)

  it.each([
    { family: 'liquid-glass', preset: 'glass' },
    { family: 'flat', preset: 'flat' },
  ] as const)(`add with an id outside the catalog in a $family project fails before any write (${manager})`, async ({ preset }) => {
    const root = await make()
    roots.push(root)
    const { glass } = await writePresets()
    const command = (args: string[]) => runBuiltCli('node', [...args, '--cwd', root, '--json'], root)
    await seed(root, ['button'])
    const init = await command(['init', '--preset', preset === 'glass' ? glass : flatPath, '--yes'])
    expect(init.code, init.output).toBe(0)
    const before = await snapshotTree(root)
    expect(Object.keys(before)).toContain(lockName)
    // The catalog check runs before style support in every family, so the typo is not reported as
    // STYLE_UNAVAILABLE, and the whole add is refused, even with --yes.
    const refused = await command(['add', 'button', 'unknown-component', 'buton', '--yes'])
    expect(refused.code, refused.output).toBe(2)
    expect(jsonRecord(jsonRecord(refused.data).error)).toMatchObject({
      code: 'UNKNOWN_COMPONENT',
      path: '/componentIds',
      message: 'Unknown components: unknown-component, buton (did you mean button?)',
    })
    const after = await snapshotTree(root)
    expect(after).toEqual(before)
    expect(Object.keys(after).some((f) => f.endsWith('/button.tsx'))).toBe(false)
  }, 180000)

  it(`plans and applies a low-contrast glass theme with a warning (${manager})`, async () => {
    const root = await make()
    roots.push(root)
    const { glass, lowFile } = await writePresets()
    const command = (args: string[]) => runBuiltCli('node', [...args, '--cwd', root, '--json'], root)
    await seed(root, ['button'])

    const flatBefore = await snapshotTree(root)
    const low = await command(['theme', 'add', lowFile, '--dry-run'])
    expect(low.code, low.output).toBe(0)
    expect(jsonRecord(low.data).notices).toEqual([notice(glassIds), contrastNotice])
    expect(await snapshotTree(root)).toEqual(flatBefore)

    const human = await humanOutput(root, ['theme', 'add', lowFile, '--dry-run', '--cwd', root])
    expect(human).toContain('\nNotice: Liquid glass text contrast fails in')

    const applied = await command(['theme', 'add', lowFile, '--yes'])
    expect(applied.code, applied.output).toBe(0)
    expect(await fs.readFile(path.join(root, 'src/index.css'), 'utf8')).toContain('--glass-opacity: 0.3')

    const theme = await command(['theme', 'add', glass, '--yes'])
    expect(theme.code, theme.output).toBe(0)
    expect(jsonRecord(theme.data).notices).toEqual([notice(glassIds)])
    expect(await fs.readFile(path.join(root, 'src/index.css'), 'utf8')).toContain('--unrelated')
  }, 180000)

  it(`initializes and installs with low-contrast global and scoped presets (${manager})`, async () => {
    const root = await make()
    roots.push(root)
    const { lowFile } = await writePresets()
    const command = (args: string[]) => runBuiltCli('node', [...args, '--cwd', root, '--json'], root)
    await seed(root, ['button'])
    const recipe = JSON.parse(await fs.readFile('examples/recipe.example.json', 'utf8'))
    recipe.presetRef.id = 'builtin-liquid-glass'
    recipe.overrides = { glassOpacity: 0.3 }
    const recipeFile = path.join(path.dirname(lowFile), 'button.recipe.json')
    await fs.writeFile(recipeFile, JSON.stringify(recipe))
    for (const args of [
      ['init', '--preset', lowFile],
      ['add', 'button'],
      ['add', 'button', '--preset', lowFile],
      ['add', '--recipe', recipeFile],
      // A subsequent CLI process recompiles installed scoped presets and recipes.
      ['add', '--recipe', recipeFile],
    ]) {
      const result = await command([...args, '--yes'])
      expect(result.code, result.output).toBe(0)
      expect(jsonRecord(result.data).notices).toContainEqual(contrastNotice)
    }
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
