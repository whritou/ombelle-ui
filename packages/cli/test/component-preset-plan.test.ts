import { afterEach, expect, it } from 'vitest'
import fs from 'node:fs/promises'
import path from 'node:path'
import { compile, compileButtonPreset } from '@ombelle/compiler'
import { getCatalog } from '@ombelle/catalog'
import { createProject } from '../../../tests/helpers/projects.js'
import { snapshotTree } from '../../../tests/helpers/tree.js'
import { inspectProject } from '../src/project/inspect.js'
import { planTheme } from '../src/plan/theme.js'
import { planComponentPreset } from '../src/plan/component-preset.js'
import { transformComponentPresetArtifact } from '../src/project/component-preset-transform.js'
import { applyPlan } from '../src/apply/transaction.js'

const roots: string[] = []

afterEach(async () => {
  for (const root of roots.splice(0))
    await fs.rm(root, { recursive: true, force: true })
})

async function setup() {
  const root = await createProject('vite')
  roots.push(root)
  await applyPlan(
    await planTheme(
      await inspectProject(root),
      await compile({
        preset: getCatalog('0.1.0').presets.flat,
        componentIds: [],
        catalogRelease: '0.1.0',
        compilerVersion: '0.1.0',
      }),
    ),
  )
  return root
}

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
  expect(plan.changes.some((change) => change.path === 'ui-preset.json')).toBe(
    false,
  )
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
  expect(repeat.changes.every((change) => change.action === 'noop')).toBe(true)
  expect(repeat.dependencyPlan).toEqual([])
  expect(repeat.componentPreset).toEqual(plan.componentPreset)
  expect((await inspectProject(root)).lock?.componentPresets).toEqual(
    expect.objectContaining({
      [`${result.preset.data.id}@${result.preset.data.revision}`]:
        expect.objectContaining({ scope: result.scope }),
    }),
  )
})

it('rejects a transformed artifact hash tampered in both provenance maps', async () => {
  const root = await setup()
  const result = await compileButtonPreset({ preset: flat() })
  const plan = await planComponentPreset(await inspectProject(root), result)
  await applyPlan(plan, { dependencies: async () => {} })

  const lockPath = path.join(root, 'ui-library.lock.json')
  const lock = JSON.parse(await fs.readFile(lockPath, 'utf8'))
  const key = `${result.preset.data.id}@${result.preset.data.revision}`
  const file = plan.componentPreset!.examplePath
  const tamperedHash = 'f'.repeat(64)
  lock.componentPresets[key].artifacts[file].sha256 = tamperedHash
  lock.artifacts[file].sha256 = tamperedHash
  await fs.writeFile(lockPath, JSON.stringify(lock))

  await expect(inspectProject(root)).rejects.toMatchObject({
    code: 'UNSUPPORTED_PROJECT',
  })
})

it('conflicts when an immutable revision changes preset data or dark selector', async () => {
  const root = await setup()
  const result = await compileButtonPreset({ preset: flat() })
  await applyPlan(
    await planComponentPreset(await inspectProject(root), result),
    { dependencies: async () => {} },
  )

  const changedPreset = structuredClone(flat())
  changedPreset.name = 'Changed bytes under the same revision'
  const changed = await compileButtonPreset({ preset: changedPreset })
  const changedDark = await compileButtonPreset({
    preset: flat(),
    darkSelector: '.night',
  })

  for (const candidate of [changed, changedDark]) {
    const plan = await planComponentPreset(
      await inspectProject(root),
      candidate,
    )
    expect(
      plan.diagnostics.some(
        (diagnostic) => diagnostic.code === 'FILE_CONFLICT',
      ),
    ).toBe(true)
    expect(plan.changes.some((change) => change.action === 'conflict')).toBe(
      true,
    )
  }
})

it('conflicts with edited and untracked shared utility files', async () => {
  const root = await setup()
  const result = await compileButtonPreset({ preset: flat() })
  const utility = result.artifacts.find(
    (artifact) => artifact.kind === 'utility',
  )!
  const untracked = await inspectProject(root)
  await fs.mkdir(path.dirname(path.join(root, untracked.utilsFile)), {
    recursive: true,
  })
  await fs.writeFile(path.join(root, untracked.utilsFile), utility.content)
  const untrackedPlan = await planComponentPreset(untracked, result)
  expect(
    untrackedPlan.changes.find((change) => change.path === untracked.utilsFile)
      ?.action,
  ).toBe('conflict')

  await fs.unlink(path.join(root, untracked.utilsFile))
  await applyPlan(
    await planComponentPreset(await inspectProject(root), result),
    { dependencies: async () => {} },
  )
  await fs.appendFile(path.join(root, untracked.utilsFile), '\n// local edit\n')
  const editedPlan = await planComponentPreset(
    await inspectProject(root),
    result,
  )
  expect(
    editedPlan.changes.find((change) => change.path === untracked.utilsFile)
      ?.action,
  ).toBe('conflict')
})

it('rejects case-insensitive duplicate artifact destinations', async () => {
  const root = await setup()
  const result = await compileButtonPreset({ preset: flat() })
  const component = result.artifacts.find(
    (artifact) => artifact.kind === 'component',
  )!
  const casingCollision = {
    ...component,
    logicalPath: component.logicalPath.replace('button.tsx', 'Button.tsx'),
  }
  const corrupted = {
    ...result,
    artifacts: [...result.artifacts, casingCollision],
  }

  await expect(
    planComponentPreset(await inspectProject(root), corrupted),
  ).rejects.toMatchObject({ code: 'FILE_CONFLICT' })
})

it('rolls back component files and lock metadata after a write failure', async () => {
  const root = await setup()
  const before = await snapshotTree(root)
  const plan = await planComponentPreset(
    await inspectProject(root),
    await compileButtonPreset({ preset: flat() }),
  )

  await expect(
    applyPlan(plan, {
      dependencies: async () => {},
      beforeWrite: async (_file, index) => {
        if (index === 1)
          throw new Error('injected component preset write failure')
      },
    }),
  ).rejects.toThrow('injected component preset write failure')
  const after = await snapshotTree(root)
  for (const [file, bytes] of Object.entries(before))
    expect(after[file], file).toEqual(bytes)
  expect(
    Object.keys(after).filter((file) => file.includes('/presets/')),
  ).toEqual([])
})

it('rejects unsupported primitive editions and uninitialized projects', async () => {
  const root = await setup()
  const result = await compileButtonPreset({ preset: flat() })
  const context = await inspectProject(root)
  context.upstream!.style = 'unsupported'
  await expect(planComponentPreset(context, result)).rejects.toMatchObject({
    code: 'UNSUPPORTED_PROJECT',
  })

  const uninitialized = await createProject('vite')
  roots.push(uninitialized)
  await expect(
    planComponentPreset(await inspectProject(uninitialized), result),
  ).rejects.toMatchObject({ code: 'UNSUPPORTED_PROJECT' })
})

it('transforms only component-preset artifacts into scoped destinations', async () => {
  const root = await setup()
  const context = await inspectProject(root)
  const result = await compileButtonPreset({ preset: flat() })
  const style = result.artifacts.find((artifact) => artifact.kind === 'style')!
  const transformed = await transformComponentPresetArtifact(context, style)

  expect(transformed.path).toBe(
    `src/components/ui/presets/${result.preset.data.id}/r${result.preset.data.revision}/button.css`,
  )
  expect(transformed.content).toBe(style.content)
  await expect(
    transformComponentPresetArtifact(context, {
      ...style,
      logicalPath: '../escape.css',
    }),
  ).rejects.toMatchObject({ code: 'INVALID_DATA' })
})
