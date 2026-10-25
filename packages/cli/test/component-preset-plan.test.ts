import { describe, expect, it } from 'vitest'
import fs from 'node:fs/promises'
import path from 'node:path'
import { compileButtonPreset, compileRecipe } from '@ombelle/compiler'
import { getCatalog } from '@ombelle/catalog'
import { componentPresetProjects } from './helpers/component-preset-projects.js'
import { snapshotTree } from '../../../tests/helpers/tree.js'
import { inspectProject } from '../src/project/inspect.js'
import { planRecipe } from '../src/plan/recipe.js'
import { planComponentPreset } from '../src/plan/component-preset.js'
import { applyPlan } from '../src/apply/transaction.js'
import recipe from '../../../examples/recipe.example.json'

describe('component preset integration contracts', () => {
  const { setup } = componentPresetProjects({ ordinaryButton: true })
  const preset = getCatalog('0.1.0').presets.flat

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
    expect(repeat.changes.every((change) => change.action === 'noop')).toBe(
      true,
    )
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
    expect((await planComponentPreset(context, result)).dependencyPlan).toEqual(
      [{ name: 'clsx', version: '2.1.1' }],
    )
    context.manager = 'bun'
    context.bunLockfile = 'bun.lock'
    const plan = await planComponentPreset(context, result)
    expect(plan.dependencyPlan).toEqual(result.dependencies)
    expect(plan.bunLockfile).toBe('bun.lock')
  })
})

describe('component preset safety contracts', () => {
  const { setup } = componentPresetProjects()
  const flat = () => getCatalog('0.1.0').presets.flat

  it('plans a component-only install through custom aliases without planning-time writes', async () => {
    const root = await setup()
    const tsconfigPath = path.join(root, 'tsconfig.json')
    const tsconfig = JSON.parse(await fs.readFile(tsconfigPath, 'utf8'))
    tsconfig.compilerOptions.paths = { '@/design/*': ['./src/design/*'] }
    await fs.writeFile(tsconfigPath, JSON.stringify(tsconfig))
    const componentConfigPath = path.join(root, 'components.json')
    const componentConfig = JSON.parse(
      await fs.readFile(componentConfigPath, 'utf8'),
    )
    componentConfig.aliases.ui = '@/design/ui'
    componentConfig.aliases.components = '@/design'
    componentConfig.aliases.utils = '@/design/lib/utils'
    await fs.writeFile(componentConfigPath, JSON.stringify(componentConfig))
    const savedConfigPath = path.join(root, 'ui-library.config.json')
    const savedConfig = JSON.parse(await fs.readFile(savedConfigPath, 'utf8'))
    savedConfig.paths.components = 'src/design/ui'
    await fs.writeFile(savedConfigPath, JSON.stringify(savedConfig))
    const before = await snapshotTree(root)
    const context = await inspectProject(root)
    const result = await compileButtonPreset({ preset: flat() })
    const plan = await planComponentPreset(context, result)
    const id = result.preset.data.id
    const revision = result.preset.data.revision
    const directory = `src/design/ui/presets/${id}/r${revision}`
    const example = `src/design/ombelle-examples/presets/${id}/r${revision}.tsx`

    expect(plan.diagnostics).toEqual([])
    expect(plan.changes.map((change) => change.path).sort()).toEqual(
      [
        `${directory}/button.tsx`,
        `${directory}/button.css`,
        example,
        'src/design/lib/utils.ts',
        './ui-library.lock.json',
      ].sort(),
    )
    expect(plan.componentPreset).toMatchObject({
      importPath: `@/design/ui/presets/${id}/r${revision}/button`,
      examplePath: example,
      preset: result.preset,
      scope: result.scope,
    })
    expect(
      plan.changes.find((change) => change.path === example)?.afterContent,
    ).toContain(`from "@/design/ui/presets/${id}/r${revision}/button"`)
    expect(
      plan.changes.some((change) => change.path === 'ui-preset.json'),
    ).toBe(false)
    expect(plan.changes.some((change) => change.path === 'src/index.css')).toBe(
      false,
    )
    expect(
      plan.changes.some((change) => change.path === 'src/design/ui/button.tsx'),
    ).toBe(false)
    expect(plan.managedDeclarations).toEqual(context.lock?.managedDeclarations)
    const plannedLock = JSON.parse(
      plan.changes.find((change) => change.path === './ui-library.lock.json')!
        .afterContent,
    )
    expect(plannedLock.recipes).toEqual(context.lock?.recipes)
    expect(plan.dependencyPlan).toEqual(
      result.dependencies.filter(
        (dependency) =>
          context.packageJson.dependencies?.[dependency.name] !==
            dependency.version &&
          context.packageJson.devDependencies?.[dependency.name] !==
            dependency.version,
      ),
    )
    expect(await snapshotTree(root)).toEqual(before)
    await applyPlan(plan, { dependencies: async () => {} })
    expect(
      (await inspectProject(root)).lock?.componentPresets?.[`${id}@${revision}`]
        ?.scope,
    ).toBe(result.scope)
  })

  it('installs once and reports a same-input repeat as a no-op', async () => {
    const root = await setup()
    const result = await compileButtonPreset({ preset: flat() })
    const context = await inspectProject(root)
    const plan = await planComponentPreset(context, result)
    await applyPlan(plan, {
      dependencies: async (projectRoot, dependencies) => {
        const packagePath = path.join(projectRoot, 'package.json')
        const packageJson = JSON.parse(await fs.readFile(packagePath, 'utf8'))
        packageJson.dependencies = {
          ...packageJson.dependencies,
          ...Object.fromEntries(
            dependencies.map(({ name, version }) => [name, version]),
          ),
        }
        await fs.writeFile(packagePath, JSON.stringify(packageJson))
      },
    })

    const repeat = await planComponentPreset(await inspectProject(root), result)
    expect(repeat.diagnostics).toEqual([])
    expect(repeat.changes.every((change) => change.action === 'noop')).toBe(
      true,
    )
    expect(repeat.dependencyPlan).toEqual([])
    expect(repeat.componentPreset).toEqual(plan.componentPreset)
    expect((await inspectProject(root)).lock?.componentPresets).toEqual(
      expect.objectContaining({
        [`${result.preset.data.id}@${result.preset.data.revision}`]:
          expect.objectContaining({ scope: result.scope }),
      }),
    )
  })
})
