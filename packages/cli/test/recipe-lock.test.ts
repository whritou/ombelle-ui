import { afterEach, expect, it } from 'vitest'
import fs from 'node:fs/promises'
import path from 'node:path'
import { compile, compileRecipe } from '@ombelle/compiler'
import { getCatalog } from '@ombelle/catalog'
import { createProject } from '../../../tests/helpers/projects.js'
import { snapshotTree } from '../../../tests/helpers/tree.js'
import { inspectProject } from '../src/project/inspect.js'
import { planTheme } from '../src/plan/theme.js'
import { planRecipe } from '../src/plan/recipe.js'
import { applyPlan } from '../src/apply/transaction.js'
import example from '../../../examples/recipe.example.json'
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
it('accepts legacy locks and rejects tampered recipe provenance', async () => {
  const root = await setup(),
    result = await compileRecipe({ recipe: example })
  expect((await inspectProject(root)).lock!.recipes).toBeUndefined()
  await applyPlan(await planRecipe(await inspectProject(root), result), {
    dependencies: async () => {},
  })
  const file = path.join(root, 'ui-library.lock.json'),
    lock = JSON.parse(await fs.readFile(file, 'utf8'))
  lock.recipes['rc_primary-button@2'].scope = 'f'.repeat(64)
  await fs.writeFile(file, JSON.stringify(lock))
  await expect(inspectProject(root)).rejects.toMatchObject({
    code: 'UNSUPPORTED_PROJECT',
  })
})
it('preserves revision coexistence, recreates missing files and conflicts on local edits', async () => {
  const root = await setup(),
    result = await compileRecipe({ recipe: example })
  await applyPlan(await planRecipe(await inspectProject(root), result), {
    dependencies: async () => {},
  })
  await applyPlan(
    await planRecipe(
      await inspectProject(root),
      await compileRecipe({ recipe: { ...example, revision: 3 } }),
    ),
    { dependencies: async () => {} },
  )
  expect(Object.keys((await inspectProject(root)).lock!.recipes!)).toHaveLength(
    2,
  )
  const css = 'src/components/ui/recipes/rc_primary-button/r2/button.css'
  await fs.unlink(path.join(root, css))
  expect(
    (await planRecipe(await inspectProject(root), result)).changes.find(
      (c) => c.path === css,
    )!.action,
  ).toBe('create')
  await fs.writeFile(path.join(root, css), '/* local */')
  expect(
    (await planRecipe(await inspectProject(root), result)).changes.find(
      (c) => c.path === css,
    )!.action,
  ).toBe('conflict')
})
it('stops stale plans, concurrent locks, custom roots and reserved IDs', async () => {
  const root = await setup(),
    result = await compileRecipe({ recipe: example }),
    plan = await planRecipe(await inspectProject(root), result)
  await fs.appendFile(path.join(root, 'tsconfig.json'), ' ')
  await expect(
    applyPlan(plan, { dependencies: async () => {} }),
  ).rejects.toMatchObject({ code: 'FILE_CONFLICT' })
  const next = await planRecipe(await inspectProject(root), result)
  await fs.writeFile(path.join(root, '.ombelle-operation.lock'), 'held')
  await expect(
    applyPlan(next, { dependencies: async () => {} }),
  ).rejects.toMatchObject({ code: 'FILE_CONFLICT' })
  await fs.unlink(path.join(root, '.ombelle-operation.lock'))
  await expect(
    planRecipe(
      await inspectProject(root),
      await compileRecipe({ recipe: { ...example, id: 'con' } }),
    ),
  ).rejects.toMatchObject({ code: 'UNSUPPORTED_PROJECT' })
  const context = await inspectProject(root)
  context.config!.paths.recipeOutput = '../escape'
  await expect(planRecipe(context, result)).rejects.toMatchObject({
    code: 'UNSUPPORTED_PROJECT',
  })
})
it('rejects untracked occupied files even for identical content and rolls back dependency failure', async () => {
  const root = await setup(),
    result = await compileRecipe({ recipe: example }),
    plan = await planRecipe(await inspectProject(root), result)
  const target = plan.changes.find((c) => c.kind === 'component')!
  await fs.mkdir(path.dirname(path.join(root, target.path)), {
    recursive: true,
  })
  await fs.writeFile(path.join(root, target.path), target.afterContent)
  expect(
    (await planRecipe(await inspectProject(root), result)).changes.find(
      (c) => c.path === target.path,
    )!.action,
  ).toBe('conflict')
  await fs.unlink(path.join(root, target.path))
  const before = await snapshotTree(root),
    fresh = await planRecipe(await inspectProject(root), result)
  await expect(
    applyPlan(fresh, {
      dependencies: async () => {
        throw Error('package install failed')
      },
    }),
  ).rejects.toMatchObject({
    code: 'DEPENDENCY_FAILURE',
    recovery: { sourceRestored: true, packageStateMayHaveChanged: true },
  })
  const after = await snapshotTree(root)
  for (const key of Object.keys(after))
    if (key.startsWith('.ombelle-transactions/')) delete after[key]
  expect(after).toEqual(before)
})
