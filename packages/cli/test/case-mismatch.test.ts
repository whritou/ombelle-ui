// CLI-04: writing into a directory whose name differs only in case breaks case-sensitive hosts.
import { afterEach, expect, it } from 'vitest'
import fs from 'node:fs/promises'
import path from 'node:path'
import { compile, compileRecipe } from '@ombelle/compiler'
import example from '../../../examples/preset.example.json'
import recipe from '../../../examples/recipe.example.json'
import { createProject } from '../../../tests/helpers/projects.js'
import { snapshotTree } from '../../../tests/helpers/tree.js'
import { inspectProject } from '../src/project/inspect.js'
import { planAdd } from '../src/plan/components.js'
import { planRecipe } from '../src/plan/recipe.js'
import { planTheme } from '../src/plan/theme.js'
import { applyPlan } from '../src/apply/transaction.js'

const roots: string[] = []
afterEach(async () => { for (const root of roots.splice(0)) await fs.rm(root, { recursive: true, force: true }) })
const build = (componentIds: 'button'[]) =>
  compile({ preset: example, componentIds, catalogRelease: '0.1.0', compilerVersion: '0.1.0' })

it('conflicts instead of writing into a case-mismatched components directory', async () => {
  const root = await createProject('vite')
  roots.push(root)
  await applyPlan(await planTheme(await inspectProject(root), await build([])))
  const context = await inspectProject(root)
  const components = path.join(root, context.componentsDir)
  const upper = path.join(path.dirname(components), path.basename(components)[0].toUpperCase() + path.basename(components).slice(1))
  await fs.rm(components, { recursive: true, force: true })
  await fs.mkdir(path.join(upper, 'ui'), { recursive: true })
  await fs.writeFile(path.join(upper, 'ui', 'other.tsx'), 'export {}\n')
  const before = await snapshotTree(root)
  const add = await planAdd(await inspectProject(root), await build(['button']))
  expect(add.diagnostics).toEqual(expect.arrayContaining([expect.objectContaining({
    code: 'FILE_CONFLICT', message: expect.stringContaining('differs only in case') })]))
  const recipePlan = await planRecipe(await inspectProject(root), await compileRecipe({ recipe }))
  expect(recipePlan.diagnostics).toEqual(expect.arrayContaining([expect.objectContaining({
    message: expect.stringContaining('differs only in case') })]))
  expect(await snapshotTree(root)).toEqual(before)
})
