import { expect, it } from 'vitest'
import { getCatalog } from '@ombelle/catalog'
import badge from '../../../examples/component-recipe.badge.json'
import button from '../../../examples/recipe.example.json'
import { compileComponentRecipe, compileInstallableRecipe, compileRecipe } from '../src/index.js'

it('compiles an isolated Badge and its usage deterministically', async () => {
  const result = await compileComponentRecipe({ recipe: badge, darkSelector: '.night' })
  expect(result.recipe.data).toEqual(badge)
  expect(result.dependencies).toEqual(getCatalog('0.1.0').templates.badge.dependencies)
  const artifacts = Object.fromEntries(result.artifacts.map(a => [a.logicalPath, a.content]))
  expect(artifacts['recipes/catalog_badge/r1/badge.tsx']).toContain('export function RecipeBadge')
  expect(artifacts['recipes/catalog_badge/r1/badge.tsx']).toContain('Ready <now> & later')
  expect(artifacts['recipes/catalog_badge/r1/badge.css']).toMatch(/\[data-slot=['"]recipe-badge['"]\]/)
  expect(artifacts['recipes/catalog_badge/r1/badge.css']).toContain('.night')
  expect(artifacts['recipes/catalog_badge/r1/badge.css']).not.toContain(':root')
  expect(artifacts['examples/recipes/catalog_badge/r1.tsx']).toContain('<RecipeBadge />')
  const reordered = Object.fromEntries(Object.entries(badge).reverse())
  expect(await compileInstallableRecipe({ recipe: reordered, darkSelector: '.night' })).toEqual(result)
})

it('preserves Button output and rejects unavailable release references', async () => {
  expect(await compileInstallableRecipe({ recipe: button })).toEqual(await compileRecipe({ recipe: button }))
  await expect(compileInstallableRecipe({
    recipe: { ...badge, presetRef: { ...badge.presetRef, compilerVersion: '99.0.0' } },
  })).rejects.toMatchObject({ code: 'UNSUPPORTED_RELEASE' })
})
