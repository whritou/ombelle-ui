import { expect, it } from 'vitest'
import fs from 'node:fs/promises'
import { compileRecipe } from '@ombelle/compiler'
import { recipeFixtures } from '../../fixtures/shared/recipes.js'
import { recipeReferenceBank } from '../helpers/recipe-fixture.js'
import { createProject } from '../helpers/projects.js'
import { writeScenarioFixture } from '../helpers/scenario-fixture.js'
import path from 'node:path'
it('uses three exact generated recipe identities and an independent canonical source bank', async () => {
  const recipes = recipeFixtures()
  expect(recipes).toHaveLength(3)
  expect(new Set(recipes.map((r) => r.id)).size).toBe(3)
  const bank = await recipeReferenceBank()
  for (const recipe of recipes) {
    const result = await compileRecipe({ recipe })
    for (const a of result.artifacts)
      expect(bank.get(a.logicalPath)?.content).toBe(a.content)
  }
})
it('renders generated RecipeButtons through a separate fixture view', async () => {
  const source = await fs.readFile('fixtures/shared/recipe-fixture.tsx', 'utf8')
  expect(source).toContain('/recipes/rc_flat_button/r1/button')
  expect(source).toContain('/recipes/rc_minimalist_button/r1/button')
  expect(source).toContain('/recipes/rc_neo_brutalism_button/r1/button')
  expect(source).not.toContain('@ombelle/')
})
it('keeps ordinary consumer fixtures independent of uninstalled recipe modules', async () => {
  const root = await createProject('vite')
  try {
    await writeScenarioFixture(root, 'flat')
    expect(
      await fs.readFile(path.join(root, 'src/scenario.tsx'), 'utf8'),
    ).not.toContain('./recipe-fixture')
    await writeScenarioFixture(root, 'flat', true)
    expect(
      await fs.readFile(path.join(root, 'src/scenario.tsx'), 'utf8'),
    ).toContain('./recipe-fixture')
  } finally {
    await fs.rm(root, { recursive: true, force: true })
  }
})
