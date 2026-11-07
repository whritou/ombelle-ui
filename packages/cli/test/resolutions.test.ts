import { it, expect, afterEach } from 'vitest'
import fs from 'node:fs/promises'
import path from 'node:path'
import { compile } from '@ombelle/compiler'
import { getCatalog } from '@ombelle/catalog'
import type { ComponentId } from '@ombelle/contracts'
import { createProject } from '../../../tests/helpers/projects.js'
import { inspectProject } from '../src/project/inspect.js'
import { planAdd, type Resolution } from '../src/plan/components.js'
import { planTheme } from '../src/plan/theme.js'
import { besideComponents } from '../src/project/beside.js'
import { applyPlan } from '../src/apply/transaction.js'
const roots: string[] = []
afterEach(async () => {
  for (const root of roots.splice(0))
    await fs.rm(root, { recursive: true, force: true })
})
const shadcnButton = 'export function Button() { return <button data-slot="button" /> }\n'
async function project(style: string) {
  const root = await createProject('vite')
  roots.push(root)
  const file = path.join(root, 'components.json'),
    c = JSON.parse(await fs.readFile(file, 'utf8'))
  c.style = style
  await fs.writeFile(file, JSON.stringify(c))
  await fs.mkdir(path.join(root, 'src/components/ui'), { recursive: true })
  await fs.writeFile(path.join(root, 'src/components/ui/button.tsx'), shadcnButton)
  return root
}
async function plan(root: string, ids: ComponentId[], resolutions: Record<string, Resolution> = {}) {
  const context = await inspectProject(root)
  const result = await compile({
    preset: getCatalog('0.1.0').presets.flat,
    componentIds: ids,
    catalogRelease: '0.1.0',
    compilerVersion: '0.1.0',
    edition: context.edition,
    prefixedComponents: besideComponents(context, resolutions),
  })
  return planAdd(context, result, resolutions)
}
const read = (root: string, p: string) => fs.readFile(path.join(root, p), 'utf8')
const lockOf = async (root: string) => JSON.parse(await read(root, 'ui-library.lock.json'))
const apply = (p: Awaited<ReturnType<typeof planAdd>>) => applyPlan(p, { dependencies: async () => {} })

it.each(['radix-nova', 'base-nova'])('names both resolutions for an unowned file (%s)', async (style) => {
  const p = await plan(await project(style), ['button'])
  expect(p.changes.find((c) => c.path === 'src/components/ui/button.tsx')!.action).toBe('conflict')
  expect(p.diagnostics).toContainEqual({
    code: 'FILE_CONFLICT',
    message:
      'src/components/ui/button.tsx exists and is not managed by Ombelle; rerun with --overwrite src/components/ui/button.tsx or --beside src/components/ui/button.tsx',
    path: 'src/components/ui/button.tsx',
    resolutions: ['overwrite', 'beside'],
  })
})

it.each(['radix-nova', 'base-nova'])('overwrites an unowned file when asked (%s)', async (style) => {
  const root = await project(style)
  const p = await plan(root, ['button'], { 'src/components/ui/button.tsx': 'overwrite' })
  expect(p.changes.find((c) => c.path === 'src/components/ui/button.tsx')!.action).toBe('update')
  await apply(p)
  expect(await read(root, 'src/components/ui/button.tsx')).not.toBe(shadcnButton)
  expect((await lockOf(root)).artifacts['src/components/ui/button.tsx']).toBeDefined()
})

it.each(['radix-nova', 'base-nova'])('installs beside an unowned file and keeps using that path (%s)', async (style) => {
  const root = await project(style)
  const p = await plan(root, ['button'], { 'src/components/ui/button.tsx': 'beside' })
  expect(p.changes.some((c) => c.path === 'src/components/ui/button.tsx')).toBe(false)
  expect(p.changes.find((c) => c.path === 'src/components/ui/ombelle/button.tsx')!.action).toBe('create')
  await apply(p)
  expect(await read(root, 'src/components/ui/button.tsx')).toBe(shadcnButton)
  const beside = await read(root, 'src/components/ui/ombelle/button.tsx')
  expect(beside).toContain('data-slot="ombelle-button"')
  expect(await read(root, 'src/styles/ui-style.css')).toContain("[data-slot='ombelle-button']")
  expect(await read(root, 'src/ombelle-examples/button.tsx')).toContain("'@/components/ui/ombelle/button'")
  expect((await lockOf(root)).placements).toEqual({ button: 'beside' })

  // Later adds keep the beside path without a resolution.
  const again = await plan(root, ['button'])
  expect(again.changes.find((c) => c.path === 'src/components/ui/ombelle/button.tsx')!.action).toBe('noop')
  expect(again.changes.some((c) => c.path === 'src/components/ui/button.tsx')).toBe(false)

  // A deleted beside file is recreated beside, never over the app's file.
  await fs.rm(path.join(root, 'src/components/ui/ombelle/button.tsx'))
  const recreated = await plan(root, ['button'])
  expect(recreated.changes.find((c) => c.path === 'src/components/ui/ombelle/button.tsx')!.action).toBe('create')
  expect(recreated.changes.filter((c) => c.action === 'conflict')).toEqual([])
})

it('keeps prefixed shared rules when the theme is reapplied', async () => {
  const root = await project('radix-nova')
  await apply(await plan(root, ['button'], { 'src/components/ui/button.tsx': 'beside' }))
  const context = await inspectProject(root)
  const theme = await compile({
    preset: getCatalog('0.1.0').presets.flat,
    componentIds: [],
    catalogRelease: '0.1.0',
    compilerVersion: '0.1.0',
    edition: context.edition,
    prefixedComponents: besideComponents(context),
  })
  const p = await planTheme(context, theme)
  const style = p.changes.find((c) => c.path === 'src/styles/ui-style.css')
  expect(style === undefined || style.action === 'noop').toBe(true)
})

it.each([
  ['a missing file', 'src/components/ui/missing.tsx', 'overwrite'],
  ['a file that does not conflict', 'src/components/ui/button.tsx', 'overwrite'],
] as const)('rejects a resolution for %s', async (_, file, resolution) => {
  const root = await project('radix-nova')
  if (file === 'src/components/ui/button.tsx') await fs.rm(path.join(root, file))
  await expect(plan(root, ['button'], { [file]: resolution })).rejects.toMatchObject({
    code: 'INVALID_DATA',
    message:
      '--' + resolution + ' ' + file +
      " doesn't match a file Ombelle can resolve; only existing files Ombelle doesn't manage can be overwritten or kept beside",
  })
})

it('never overwrites an Ombelle-owned file the user edited', async () => {
  const root = await project('radix-nova')
  await apply(await plan(root, ['button'], { 'src/components/ui/button.tsx': 'overwrite' }))
  await fs.appendFile(path.join(root, 'src/components/ui/button.tsx'), '// edit\n')
  await expect(
    plan(root, ['button'], { 'src/components/ui/button.tsx': 'overwrite' }),
  ).rejects.toMatchObject({ code: 'INVALID_DATA' })
})

it('adds prefixed shared rules to an unedited themed stylesheet when installing beside', async () => {
  const root = await project('base-nova')
  const context = await inspectProject(root)
  const theme = await compile({
    preset: getCatalog('0.1.0').presets.flat,
    componentIds: [],
    catalogRelease: '0.1.0',
    compilerVersion: '0.1.0',
    edition: context.edition,
  })
  await apply(await planTheme(context, theme))
  const p = await plan(root, ['button'], { 'src/components/ui/button.tsx': 'beside' })
  expect(p.changes.find((c) => c.path === 'src/styles/ui-style.css')!.action).toBe('update')
  expect(p.changes.filter((c) => c.action === 'conflict')).toEqual([])
})
