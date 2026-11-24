// PUB-08: the published config and lock schemas describe exactly what the CLI writes, including a lock
// with ordinary components, a recipe and a component preset.
import { afterEach, expect, it } from 'vitest'
import fs from 'node:fs/promises'
import path from 'node:path'
import Ajv2020 from 'ajv/dist/2020.js'
import { compile, compileButtonPreset, compileRecipe } from '@ombelle/compiler'
import { getCatalog } from '@ombelle/catalog'
import recipe from '../../../examples/recipe.example.json'
import configSchema from '../../../schemas/project-config.schema.json' with { type: 'json' }
import lockSchema from '../../../schemas/project-lock.schema.json' with { type: 'json' }
import { createProject } from '../../../tests/helpers/projects.js'
import { inspectProject } from '../src/project/inspect.js'
import { planTheme } from '../src/plan/theme.js'
import { planAdd } from '../src/plan/components.js'
import { planRecipe } from '../src/plan/recipe.js'
import { planComponentPreset } from '../src/plan/component-preset.js'
import { applyPlan } from '../src/apply/transaction.js'

const roots: string[] = []
afterEach(async () => {
  for (const root of roots.splice(0)) await fs.rm(root, { recursive: true, force: true })
})
const ports = { dependencies: async () => {} }

it('validates the config and the lock the CLI writes against the published schemas', async () => {
  const root = await createProject('vite')
  roots.push(root)
  const flat = getCatalog('0.1.0').presets.flat
  const build = (componentIds: ('button' | 'badge')[]) =>
    compile({ preset: flat, componentIds, catalogRelease: '0.1.0', compilerVersion: '0.1.0' })
  await applyPlan(await planTheme(await inspectProject(root), await build([])), ports)
  await applyPlan(await planAdd(await inspectProject(root), await build(['button', 'badge'])), ports)
  await applyPlan(await planRecipe(await inspectProject(root), await compileRecipe({ recipe })), ports)
  await applyPlan(await planComponentPreset(await inspectProject(root), await compileButtonPreset({ preset: getCatalog('0.1.0').presets.minimalist })), ports)

  const ajv = new Ajv2020({ allErrors: true, strict: false })
  const config = JSON.parse(await fs.readFile(path.join(root, 'ui-library.config.json'), 'utf8'))
  const lock = JSON.parse(await fs.readFile(path.join(root, 'ui-library.lock.json'), 'utf8'))
  expect(lock.recipes).toBeDefined()
  expect(lock.componentPresets).toBeDefined()
  const validConfig = ajv.compile(configSchema)
  const validLock = ajv.compile(lockSchema)
  expect(validConfig(config), JSON.stringify(validConfig.errors)).toBe(true)
  expect(validLock(lock), JSON.stringify(validLock.errors)).toBe(true)
  // The schemas reject what the CLI refuses: another version.
  expect(validLock({ ...lock, lockVersion: 2 })).toBe(false)
  expect(validConfig({ ...config, configVersion: 2 })).toBe(false)
})
