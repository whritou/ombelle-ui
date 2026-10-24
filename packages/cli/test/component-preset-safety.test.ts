import { describe, expect, it } from 'vitest'

import path from 'node:path'
import { compileButtonPreset } from '@ombelle/compiler'
import { getCatalog } from '@ombelle/catalog'
import { createProject } from '../../../tests/helpers/projects.js'
import { componentPresetProjects } from './helpers/component-preset-projects.js'
import { snapshotTree } from '../../../tests/helpers/tree.js'
import { inspectProject } from '../src/project/inspect.js'
import { transformComponentPresetArtifact } from '../src/project/component-preset-transform.js'
import { planComponentPreset } from '../src/plan/component-preset.js'
import { applyPlan } from '../src/apply/transaction.js'

describe('component preset integration contracts', () => {
  const { roots, setup } = componentPresetProjects({ ordinaryButton: true })
  const preset = getCatalog('0.1.0').presets.flat

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
  const { roots, setup } = componentPresetProjects()
  const flat = () => getCatalog('0.1.0').presets.flat

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
    const style = result.artifacts.find(
      (artifact) => artifact.kind === 'style',
    )!
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
