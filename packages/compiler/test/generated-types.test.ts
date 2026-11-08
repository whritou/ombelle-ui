import { expect, it } from 'vitest'
import { getCatalog } from '@ombelle/catalog'
import { supportedComponentIds } from '@ombelle/contracts'
import { compile, compileComponentRecipe } from '../src/index.js'
import { catalogRecipeFixtures } from '../../../tests/helpers/catalog-recipe-fixtures.js'
import { checkGeneratedTypes } from '../../../tests/helpers/generated-types.js'

it('typechecks every Base UI component with create-vite unused-binding checks', async () => {
  const result = await compile({
    preset: getCatalog('0.1.0').presets.flat, componentIds: supportedComponentIds,
    catalogRelease: '0.1.0', compilerVersion: '0.1.0', edition: 'base',
  })
  const checked = await checkGeneratedTypes(result.artifacts)
  expect(checked.code, checked.output).toBe(0)
})

it('typechecks every stable editor recipe with create-vite unused-binding checks', async () => {
  const results = await Promise.all(catalogRecipeFixtures().map(recipe => compileComponentRecipe({ recipe })))
  const checked = await checkGeneratedTypes(results.flatMap(result => result.artifacts))
  expect(checked.code, checked.output).toBe(0)
})

it('typechecks glass recipes with and without labeled controls', async () => {
  const preset = getCatalog('0.1.0').presets['liquid-glass']
  const results = await Promise.all(catalogRecipeFixtures().filter(recipe => ['badge', 'input'].includes(recipe.component))
    .map(recipe => compileComponentRecipe({ recipe: { ...recipe, presetRef: {
      id: preset.id, revision: preset.revision, catalogRelease: preset.catalogRelease, compilerVersion: preset.compilerVersion,
    } } })))
  const checked = await checkGeneratedTypes(results.flatMap(result => result.artifacts))
  expect(checked.code, checked.output).toBe(0)
})
