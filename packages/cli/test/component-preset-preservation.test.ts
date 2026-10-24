import { describe, expect, it } from 'vitest'
import fs from 'node:fs/promises'
import path from 'node:path'
import { compile, compileButtonPreset } from '@ombelle/compiler'
import { getCatalog } from '@ombelle/catalog'
import { componentPresetProjects } from './helpers/component-preset-projects.js'
import { inspectProject } from '../src/project/inspect.js'
import { planTheme } from '../src/plan/theme.js'
import { planAdd } from '../src/plan/components.js'
import { planComponentPreset } from '../src/plan/component-preset.js'
import { applyPlan } from '../src/apply/transaction.js'

describe('component preset integration contracts', () => {
  const { setup } = componentPresetProjects({ ordinaryButton: true })
  const preset = getCatalog('0.1.0').presets.flat

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
    expect((await inspectProject(root)).lock!.componentPresets).toEqual(
      installed,
    )
    const theme = await compile({
      preset,
      componentIds: [],
      catalogRelease: '0.1.0',
      compilerVersion: '0.1.0',
    })
    await applyPlan(await planTheme(await inspectProject(root), theme))
    expect((await inspectProject(root)).lock!.componentPresets).toEqual(
      installed,
    )
  })
})

describe('component preset safety contracts', () => {
  const { setup } = componentPresetProjects()
  const flat = () => getCatalog('0.1.0').presets.flat

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
})
