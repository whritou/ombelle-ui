import { it, expect, afterEach } from 'vitest'
import fs from 'node:fs/promises'
import { compile } from '@ombelle/compiler'
import { getCatalog } from '@ombelle/catalog'
import { createProject } from '../../../tests/helpers/projects.js'
import { inspectProject } from '../src/project/inspect.js'
import { planAdd } from '../src/plan/components.js'
import { planTheme } from '../src/plan/theme.js'
import { planRecipe } from '../src/plan/recipe.js'
import { planComponentPreset } from '../src/plan/component-preset.js'
const roots: string[] = []
afterEach(async () => {
  for (const root of roots.splice(0))
    await fs.rm(root, { recursive: true, force: true })
})
const flat = () => getCatalog('0.1.0').presets.flat
const build = (componentIds: string[]) =>
  compile({
    preset: flat(),
    componentIds: componentIds as never,
    catalogRelease: '0.1.0',
    compilerVersion: '0.1.0',
  })
async function project(style?: string) {
  const root = await createProject('vite')
  roots.push(root)
  const file = root + '/components.json'
  if (style === undefined) await fs.rm(file)
  else {
    const c = JSON.parse(await fs.readFile(file, 'utf8'))
    c.style = style
    await fs.writeFile(file, JSON.stringify(c))
  }
  return root
}
const lockOf = (plan: { changes: { kind: string; afterContent: string }[] }) =>
  JSON.parse(plan.changes.find((c) => c.kind === 'lock')!.afterContent)

it.each([
  ['base-sera', 'base', true],
  ['radix-nova', 'radix', true],
  [undefined, 'radix', true],
  ['radix-lyra', 'radix', false],
] as const)('inspects %s as %s', async (style, edition, supported) => {
  const context = await inspectProject(await project(style))
  expect(context.edition).toBe(edition)
  expect(context.upstreamStyleSupported).toBe(supported)
})

it('plans components without primitives for Base UI projects and locks the edition', async () => {
  const plan = await planAdd(await inspectProject(await project('base-nova')), await build(['badge']))
  expect(plan.changes.filter((c) => c.action === 'conflict')).toEqual([])
  expect(lockOf(plan).edition).toBe('base')
})

it('rejects unknown styles for component commands', async () => {
  await expect(
    planAdd(await inspectProject(await project('radix-lyra')), await build(['badge'])),
  ).rejects.toMatchObject({
    code: 'UNSUPPORTED_PROJECT',
    message:
      "Style `radix-lyra` isn't supported; Ombelle supports `radix-nova`, `new-york` and shadcn's `base-*` styles",
  })
})

it('writes the full theme on Base UI projects and only the palette on unknown styles', async () => {
  for (const [style, full] of [['base-sera', true], ['radix-lyra', false]] as const) {
    const context = await inspectProject(await project(style))
    const plan = await planTheme(context, await build([]))
    expect(plan.changes.some((c) => c.path === context.styleFile), style).toBe(full)
  }
})

it('refuses to mix editions once components are installed', async () => {
  const root = await project('base-nova')
  const context = await inspectProject(root)
  const plan = await planAdd(context, await build(['badge']))
  const { applyPlan } = await import('../src/apply/transaction.js')
  await applyPlan(plan, { dependencies: async () => {} })
  const c = JSON.parse(await fs.readFile(root + '/components.json', 'utf8'))
  c.style = 'radix-nova'
  await fs.writeFile(root + '/components.json', JSON.stringify(c))
  await expect(
    planAdd(await inspectProject(root), await build(['card'])),
  ).rejects.toMatchObject({
    code: 'FILE_CONFLICT',
    message:
      "This project's components.json uses the radix edition but installed Ombelle components use base; editions can't be mixed",
  })
})

it('treats a lock without an edition as Radix only when it records components', async () => {
  const root = await project('base-nova')
  const lock = (components: boolean) => ({
    lockVersion: 1,
    catalogRelease: '0.1.0',
    compilerVersion: '0.1.0',
    presetHash: 'x',
    managedDeclarations: [],
    artifacts: components
      ? { 'src/components/ui/card.tsx': { logicalPath: 'components/ui/card.tsx', sha256: 'x', kind: 'component' } }
      : {},
  })
  const context = await inspectProject(root)
  context.lock = lock(false) as never
  await expect(planAdd(context, await build(['badge']))).resolves.toBeDefined()
  context.lock = lock(true) as never
  await expect(planAdd(context, await build(['badge']))).rejects.toMatchObject({
    code: 'FILE_CONFLICT',
    message:
      "This project's components.json uses the base edition but installed Ombelle components use radix; editions can't be mixed",
  })
})

it('keeps recipes and component presets Radix-only', async () => {
  const context = await inspectProject(await project('base-nova'))
  context.config = { paths: {} } as never
  context.preset = {} as never
  context.lock = { artifacts: {}, managedDeclarations: [] } as never
  for (const run of [
    () => planRecipe(context, {} as never),
    () => planComponentPreset(context, {} as never),
  ])
    await expect(run()).rejects.toMatchObject({
      code: 'UNSUPPORTED_PROJECT',
      message: "Recipes and component presets aren't available for Base UI yet",
    })
})
