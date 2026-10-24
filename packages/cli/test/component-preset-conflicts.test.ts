import { describe, expect, it } from 'vitest'
import fs from 'node:fs/promises'
import path from 'node:path'
import { compileButtonPreset } from '@ombelle/compiler'
import { getCatalog } from '@ombelle/catalog'
import { componentPresetProjects } from './helpers/component-preset-projects.js'
import { inspectProject } from '../src/project/inspect.js'
import { transformComponentPresetArtifact } from '../src/project/component-preset-transform.js'
import { planComponentPreset } from '../src/plan/component-preset.js'
import { applyPlan } from '../src/apply/transaction.js'

describe('component preset integration contracts', () => {
  const { setup } = componentPresetProjects({ ordinaryButton: true })
  const preset = getCatalog('0.1.0').presets.flat

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
      const plan = await planComponentPreset(
        await inspectProject(root),
        changed,
      )
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
        plan.changes.find((change) => change.path === context.utilsFile)
          ?.action,
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
})

describe('component preset safety contracts', () => {
  const { setup } = componentPresetProjects()
  const flat = () => getCatalog('0.1.0').presets.flat

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
      untrackedPlan.changes.find(
        (change) => change.path === untracked.utilsFile,
      )?.action,
    ).toBe('conflict')

    await fs.unlink(path.join(root, untracked.utilsFile))
    await applyPlan(
      await planComponentPreset(await inspectProject(root), result),
      { dependencies: async () => {} },
    )
    await fs.appendFile(
      path.join(root, untracked.utilsFile),
      '\n// local edit\n',
    )
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

    const plan = await planComponentPreset(await inspectProject(root), result, {
      readDirectory,
    })

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
})
