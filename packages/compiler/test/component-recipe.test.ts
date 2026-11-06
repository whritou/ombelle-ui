import { expect, it } from 'vitest'
import { getCatalog } from '@ombelle/catalog'
import { styleFamilies } from '@ombelle/contracts'
import { catalogRecipeFixtures } from '../../../tests/helpers/catalog-recipe-fixtures.js'
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

it('compiles progress without accepting an out-of-range value', async () => {
  const recipe = { ...badge, component: 'progress', props: { value: 25, max: 50 }, content: { label: 'Uploading' } }
  const result = await compileComponentRecipe({ recipe })
  const source = result.artifacts.find(artifact => artifact.logicalPath.endsWith('/progress.tsx'))!.content
  expect(source).toContain('value={25}')
  expect(source).toContain('max={50}')
  await expect(compileComponentRecipe({ recipe: { ...recipe, props: { value: 51, max: 50 } } })).rejects.toThrow()
})

it.each(catalogRecipeFixtures())('compiles $component in each supported family', async recipe => {
  for (const family of styleFamilies) {
    const preset = getCatalog('0.1.0').presets[family]
    const result = await compileComponentRecipe({ recipe: { ...recipe, presetRef: {
      id: preset.id, revision: preset.revision, catalogRelease: preset.catalogRelease, compilerVersion: preset.compilerVersion,
    } } })
    const entry = result.artifacts.find(artifact => artifact.logicalPath.endsWith(`/${recipe.component}.tsx`))
    expect(entry?.content).toContain('createScopedPrimitives')
    const css = result.artifacts.find(artifact => artifact.kind === 'style')!.content
    expect(css).toContain(result.scope)
    expect(css).not.toMatch(/\[data-slot=['"](?!recipe-)/)
    if (family === 'liquid-glass') {
      const filter = result.artifacts.find(artifact => artifact.logicalPath.endsWith('/liquid-glass-filter.tsx'))
      expect(filter?.content).toContain('data-ombelle-recipe-instance')
      expect(filter?.content).not.toContain('root.style.')
    }
  }
})
