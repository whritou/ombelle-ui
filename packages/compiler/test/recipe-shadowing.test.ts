import { describe, expect, it } from 'vitest'
import { getCatalog } from '@ombelle/catalog'
import { componentRecipeComponents, componentRecipeFields, defaultRecipeFields, styleFamilies, validateComponentRecipe } from '@ombelle/contracts'
import { compileComponentRecipe } from '../src/index.js'
import { findShadowedNames } from './recipe-shadowing.js'

describe('findShadowedNames', () => {
  it('reports a template prop that shadows a factory parameter', () => {
    expect(findShadowedNames("export function createScopedPrimitives(recipeScope: string, recipeInstance?: string) { function TableHead({ recipeScope = 'col' }) { return null } return { TableHead } }"))
      .toEqual([{ name: 'recipeScope', line: 1, reason: 'factory' }])
  })

  it('accepts a prop that does not reuse a factory name', () => {
    expect(findShadowedNames("export function createScopedPrimitives(recipeScope: string, recipeInstance?: string) { function TableHead({ scope = 'col' }) { return null } return { TableHead } }"))
      .toEqual([])
  })

  it('reports a wrapper name redeclared in the module', () => {
    expect(findShadowedNames("const scope = 'a'\nexport function X() { const scope = 1; return null }"))
      .toEqual([{ name: 'scope', line: 2, reason: 'wrapper' }])
  })
})

const catalog = getCatalog('0.1.0')
const presetRef = (family: (typeof styleFamilies)[number]) => {
  const { id, revision, catalogRelease, compilerVersion } = family === 'liquid-glass'
    ? catalog.startingPresets['builtin-liquid-glass'] : catalog.presets[family]
  return { id, revision, catalogRelease, compilerVersion }
}

describe.each(styleFamilies)('%s recipe sources', family => {
  it.each(componentRecipeComponents)('%s declares nothing that shadows its scope', async component => {
    const recipe = validateComponentRecipe({ schemaVersion: '2.0', id: `audit_${component.replaceAll('-', '_')}`, revision: 1,
      component, presetRef: presetRef(family), props: {}, content: defaultRecipeFields(componentRecipeFields(component).content) })
    const result = await compileComponentRecipe({ recipe })
    const source = result.artifacts.find(artifact => artifact.logicalPath.endsWith(`/${component}.tsx`))!.content
    expect(findShadowedNames(source), `${family}/${component}`).toEqual([])
  })
})
