import { afterEach, expect, it } from 'vitest'
import fs from 'node:fs/promises'
import path from 'node:path'
import { compile, compileButtonPreset, compileRecipe } from '@ombelle/compiler'
import { getCatalog } from '@ombelle/catalog'
import { createProject } from '../../../tests/helpers/projects.js'
import { snapshotTree } from '../../../tests/helpers/tree.js'
import { inspectProject } from '../src/project/inspect.js'
import { transformComponentPresetArtifact } from '../src/project/component-preset-transform.js'
import { planTheme } from '../src/plan/theme.js'
import { planAdd } from '../src/plan/components.js'
import { planRecipe } from '../src/plan/recipe.js'
import { planComponentPreset } from '../src/plan/component-preset.js'
import { applyPlan } from '../src/apply/transaction.js'
import recipe from '../../../examples/recipe.example.json'

const roots: string[] = []
const preset = getCatalog('0.1.0').presets.flat
afterEach(async () => {
  for (const root of roots.splice(0))
    await fs.rm(root, { recursive: true, force: true })
})
async function setup(customAliases = false) {
  const root = await createProject('vite')
  roots.push(root)
  if (customAliases) {
    const file = path.join(root, 'components.json')
    const upstream = JSON.parse(await fs.readFile(file, 'utf8'))
    upstream.aliases.ui = '@/design/ui'
    upstream.aliases.utils = '@/shared/cn'
    await fs.writeFile(file, JSON.stringify(upstream))
  }
  const ordinary = await compile({
    preset: getCatalog('0.1.0').presets.minimalist,
    componentIds: ['button'],
    catalogRelease: '0.1.0',
    compilerVersion: '0.1.0',
  })
  await applyPlan(await planTheme(await inspectProject(root), ordinary))
  await applyPlan(await planAdd(await inspectProject(root), ordinary), {
    dependencies: async () => {},
  })
  return root
}

it('plans custom destinations and imports without writing or changing global source', async () => {
  const root = await setup(true)
  await applyPlan(
    await planRecipe(
      await inspectProject(root),
      await compileRecipe({ recipe }),
    ),
    { dependencies: async () => {} },
  )
  const context = await inspectProject(root)
  const before = await snapshotTree(root)
  const result = await compileButtonPreset({ preset })
  const plan = await planComponentPreset(context, result)
  expect(await snapshotTree(root)).toEqual(before)
  expect(plan.diagnostics).toEqual([])
  expect(plan.changes.map((change) => change.path)).toEqual([
    'src/ombelle-examples/presets/builtin-flat/r1.tsx',
    'src/shared/cn.ts',
    'src/design/ui/presets/builtin-flat/r1/button.css',
    'src/design/ui/presets/builtin-flat/r1/button.tsx',
    './ui-library.lock.json',
  ])
  expect(plan.componentPreset?.importPath).toBe(
    '@/design/ui/presets/builtin-flat/r1/button',
  )
  expect(plan.componentPreset?.examplePath).toBe(
    'src/ombelle-examples/presets/builtin-flat/r1.tsx',
  )
  expect(
    plan.changes.find((change) => change.kind === 'usage')?.afterContent,
  ).toContain('"@/design/ui/presets/builtin-flat/r1/button"')
  expect(
    plan.changes.find((change) => change.kind === 'component')?.afterContent,
  ).toContain('"@/shared/cn"')
  expect(plan.dependencyPlan).toEqual([
    { name: 'class-variance-authority', version: '0.7.1' },
    { name: 'clsx', version: '2.1.1' },
    { name: 'tailwind-merge', version: '3.7.0' },
  ])
  const state = JSON.parse(
    plan.changes.find((change) => change.kind === 'lock')!.afterContent,
  )
  expect(state.recipes).toEqual(context.lock!.recipes)
  expect(state.managedDeclarations).toEqual(context.lock!.managedDeclarations)
  expect(state.presetHash).toBe(context.lock!.presetHash)
  expect(
    Object.keys(state.componentPresets['builtin-flat@1'].artifacts),
  ).toHaveLength(3)
  expect(
    state.componentPresets['builtin-flat@1'].artifacts['src/shared/cn.ts'],
  ).toBeUndefined()
  await applyPlan(plan, { dependencies: async () => {} })
  const after = await snapshotTree(root)
  for (const [file, hash] of Object.entries(before))
    if (file !== 'ui-library.lock.json') expect(after[file], file).toBe(hash)
  const repeat = await planComponentPreset(await inspectProject(root), result)
  expect(repeat.changes.every((change) => change.action === 'noop')).toBe(true)
})

it('selects exact missing versions and preserves Bun production dependency rules', async () => {
  const context = await inspectProject(await setup())
  const result = await compileButtonPreset({ preset })
  context.packageJson.dependencies = { clsx: '2.1.0' }
  context.packageJson.devDependencies = {
    react: '19.3.1',
    'class-variance-authority': '0.7.1',
    clsx: '2.1.1',
    'tailwind-merge': '3.7.0',
  }
  expect((await planComponentPreset(context, result)).dependencyPlan).toEqual([
    { name: 'clsx', version: '2.1.1' },
  ])
  context.manager = 'bun'
  context.bunLockfile = 'bun.lock'
  const plan = await planComponentPreset(context, result)
  expect(plan.dependencyPlan).toEqual(result.dependencies)
  expect(plan.bunLockfile).toBe('bun.lock')
})

it('preserves installed component preset provenance through ordinary add and theme changes', async () => {
  const root = await setup()
  await applyPlan(
    await planComponentPreset(
      await inspectProject(root),
      await compileButtonPreset({ preset }),
    ),
    { dependencies: async () => {} },
  )
  const installed = (await inspectProject(root)).lock!.componentPresets
  const input = await compile({
    preset: (await inspectProject(root)).preset,
    componentIds: ['input'],
    catalogRelease: '0.1.0',
    compilerVersion: '0.1.0',
  })
  await applyPlan(await planAdd(await inspectProject(root), input), {
    dependencies: async () => {},
  })
  expect((await inspectProject(root)).lock!.componentPresets).toEqual(installed)
  const theme = await compile({
    preset,
    componentIds: [],
    catalogRelease: '0.1.0',
    compilerVersion: '0.1.0',
  })
  await applyPlan(await planTheme(await inspectProject(root), theme))
  expect((await inspectProject(root)).lock!.componentPresets).toEqual(installed)
})

it('rejects changed same-revision identity and changed dark context', async () => {
  const root = await setup()
  const result = await compileButtonPreset({ preset })
  await applyPlan(
    await planComponentPreset(await inspectProject(root), result),
    { dependencies: async () => {} },
  )
  for (const changed of [
    await compileButtonPreset({
      preset: { ...preset, name: 'Changed preset' },
    }),
    await compileButtonPreset({ preset, darkSelector: '.night' }),
  ]) {
    const plan = await planComponentPreset(await inspectProject(root), changed)
    expect(
      plan.diagnostics.some(
        (diagnostic) => diagnostic.code === 'FILE_CONFLICT',
      ),
    ).toBe(true)
    await expect(applyPlan(plan)).rejects.toMatchObject({
      code: 'FILE_CONFLICT',
    })
  }
})

it.each(['edited', 'untracked'] as const)(
  'conflicts on %s shared utility source',
  async (mode) => {
    const root = await setup()
    const context = await inspectProject(root)
    if (mode === 'edited')
      await fs.appendFile(path.join(root, context.utilsFile), '\n// edited\n')
    else delete context.lock!.artifacts[context.utilsFile]
    const plan = await planComponentPreset(
      context,
      await compileButtonPreset({ preset }),
    )
    expect(
      plan.changes.find((change) => change.path === context.utilsFile)?.action,
    ).toBe('conflict')
  },
)

it('rejects duplicate destinations ignoring case and collisions with lock state', async () => {
  const context = await inspectProject(await setup())
  const result = await compileButtonPreset({ preset })
  const component = result.artifacts.find(
    (artifact) => artifact.kind === 'component',
  )!
  await expect(
    planComponentPreset(context, {
      ...result,
      artifacts: [
        ...result.artifacts,
        {
          ...component,
          logicalPath: component.logicalPath.replace(
            'button.tsx',
            'BUTTON.tsx',
          ),
        },
      ],
    }),
  ).rejects.toMatchObject({ code: 'FILE_CONFLICT' })
  context.utilsFile = './UI-LIBRARY.LOCK.JSON'
  await expect(planComponentPreset(context, result)).rejects.toMatchObject({
    code: 'FILE_CONFLICT',
  })
})

it('rejects unsafe destinations and unexpected artifacts during transformation', async () => {
  const context = await inspectProject(await setup())
  const result = await compileButtonPreset({ preset })
  const artifact = result.artifacts.find((item) => item.kind === 'component')!
  await expect(
    transformComponentPresetArtifact(context, {
      ...artifact,
      logicalPath: 'scoped-presets/../../escape.tsx',
    }),
  ).rejects.toMatchObject({ code: 'UNSUPPORTED_PROJECT' })
  await expect(
    transformComponentPresetArtifact(context, {
      ...artifact,
      logicalPath: 'components/button.tsx',
    }),
  ).rejects.toMatchObject({ code: 'INVALID_DATA' })
})

it('rolls back scoped artifacts and metadata after an injected write failure', async () => {
  const root = await setup()
  const before = await snapshotTree(root)
  const plan = await planComponentPreset(
    await inspectProject(root),
    await compileButtonPreset({ preset }),
  )
  await expect(
    applyPlan(plan, {
      dependencies: async () => {},
      beforeWrite: async (_, index) => {
        if (index === 2) throw Error('injected')
      },
    }),
  ).rejects.toThrow('injected')
  const after = await snapshotTree(root)
  for (const [file, hash] of Object.entries(before))
    expect(after[file], file).toBe(hash)
  expect(
    Object.keys(after).filter((file) => file.includes('/presets/')),
  ).toEqual([])
})

it('requires initialized provenance and a supported upstream primitive edition', async () => {
  const root = await createProject('vite')
  roots.push(root)
  const result = await compileButtonPreset({ preset })
  await expect(
    planComponentPreset(await inspectProject(root), result),
  ).rejects.toMatchObject({ code: 'UNSUPPORTED_PROJECT' })
  const context = await inspectProject(await setup())
  context.upstream!.style = 'base-nova'
  await expect(planComponentPreset(context, result)).rejects.toMatchObject({
    code: 'UNSUPPORTED_PROJECT',
  })
})
