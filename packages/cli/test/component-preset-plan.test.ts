import { afterEach, describe, expect, it } from 'vitest'
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

describe('component preset integration contracts', () => {

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

})

describe('component preset safety contracts', () => {

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

it('conflicts with an existing differently cased path on case-sensitive filesystems', async () => {
  const root = await setup()
  const result = await compileButtonPreset({ preset: flat() })
  const component = result.artifacts.find(
    (artifact) => artifact.kind === 'component',
  )!
  const target = await transformComponentPresetArtifact(
    await inspectProject(root),
    component,
  )
  const destinationDirectory = path.dirname(path.join(root, target.path))
  await fs.mkdir(destinationDirectory, { recursive: true })
  const readDirectory = async (directory: string): Promise<string[]> => {
    const entries = await fs.readdir(directory, { encoding: 'utf8' })
    if (directory !== destinationDirectory) return entries
    return [...entries, 'Button.tsx']
  }

  const plan = await planComponentPreset(
    await inspectProject(root),
    result,
    { readDirectory },
  )

  expect(
    plan.changes.find((change) => change.path === target.path)?.action,
  ).toBe('conflict')
  expect(plan.diagnostics).toContainEqual(
    expect.objectContaining({ code: 'FILE_CONFLICT', path: target.path }),
  )
})

it('conflicts with lock ownership recorded under a differently cased key', async () => {
  const root = await setup()
  const context = await inspectProject(root)
  const result = await compileButtonPreset({ preset: flat() })
  const component = result.artifacts.find(
    (artifact) => artifact.kind === 'component',
  )!
  const target = await transformComponentPresetArtifact(context, component)
  context.lock!.artifacts[target.path.replace('button.tsx', 'Button.tsx')] = {
    logicalPath: component.logicalPath,
    kind: 'component',
    sha256: 'a'.repeat(64),
  }

  const plan = await planComponentPreset(context, result)

  expect(
    plan.changes.find((change) => change.path === target.path)?.action,
  ).toBe('conflict')
  expect(plan.diagnostics).toContainEqual(
    expect.objectContaining({ code: 'FILE_CONFLICT', path: target.path }),
  )
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
  ).rejects.toMatchObject({ code: 'UNSUPPORTED_PROJECT' })
})

})
