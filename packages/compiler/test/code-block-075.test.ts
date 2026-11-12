import { describe, expect, it } from 'vitest'
import { getCatalog, getTemplate } from '@ombelle/catalog'
import { componentRecipeFields, defaultRecipeFields, styleFamilies, validateComponentRecipe, type ComponentRecipe } from '@ombelle/contracts'
import { compileComponentRecipe, describeComponentRecipe, scopeRecipeTemplate } from '../src/index.js'
import { findShadowedNames } from './recipe-shadowing.js'

const catalog = getCatalog('0.1.0')
const recipe = (family: (typeof styleFamilies)[number], props: Record<string, unknown> = {}, content: Record<string, unknown> = {}) => {
  const { id, revision, catalogRelease, compilerVersion } = family === 'liquid-glass' ? catalog.startingPresets['builtin-liquid-glass'] : catalog.presets[family]
  const fields = componentRecipeFields('code-block')
  return validateComponentRecipe({ schemaVersion: '2.0', id: 'blocks_code_block', revision: 1, component: 'code-block',
    presetRef: { id, revision, catalogRelease, compilerVersion }, props: { ...defaultRecipeFields(fields.props), ...props },
    content: { ...defaultRecipeFields(fields.content), ...content } })
}
const parts = ['CodeBlock', 'CodeBlockCommand', 'CodeBlockRoot', 'CodeBlockHeader', 'CodeBlockTitle', 'CodeBlockCopy', 'CodeBlockCode']

describe.each(styleFamilies)('%s code block recipes', family => {
  it.each([['file', {}], ['command', { mode: 'command' }]] as const)('%s draft compiles deterministically with its parts and no shadowed names', async (_name, props) => {
    const first = await compileComponentRecipe({ recipe: recipe(family, props) })
    const second = await compileComponentRecipe({ recipe: recipe(family, props) })
    expect(second.artifacts).toEqual(first.artifacts)
    const source = first.artifacts.find(artifact => artifact.logicalPath.endsWith('/code-block.tsx'))!.content
    for (const name of parts) expect(source).toContain(`function ${name}(`)
    expect(findShadowedNames(source)).toEqual([])
  })
})

describe('code block scoped primitives', () => {
  it.each(['radix', 'base'] as const)('%s returns highlightCode and drops the type re-export', edition => {
    const source = scopeRecipeTemplate(getTemplate(catalog, 'code-block', edition), '@/lib/utils')
    const returned = source.match(/return \{ ([^}]*) \}\n\}\n$/)?.[1]?.split(', ')
    expect(returned).toEqual(expect.arrayContaining(['highlightCode', 'packageCommand', 'commandRunners', ...parts]))
    expect(source).not.toMatch(/export type \{/)
    // Only the factory itself is exported.
    expect(source.match(/^export .*$/gm)).toEqual(['export function createScopedPrimitives(recipeScope: string, recipeInstance?: string) {'])
  })
})

describe('code block specimen', () => {
  const d = (props: Record<string, unknown> = {}, content: Record<string, unknown> = {}) => describeComponentRecipe(recipe('ombelle', props, content) as ComponentRecipe)
  it('draws a file block from the recipe fields', () => {
    const specimen = d()
    expect(specimen.tag).toBe('CodeBlock')
    expect(specimen.props).toMatchObject({ language: 'tsx', title: 'button.tsx', lineNumbers: true })
    expect(typeof specimen.props.code).toBe('string')
    expect(d({ lineNumbers: false, language: 'css' }).props).toMatchObject({ language: 'css', lineNumbers: false })
  })
  it('draws a command block from its args', () => {
    const specimen = d({ mode: 'command' })
    expect(specimen.tag).toBe('CodeBlockCommand')
    expect(specimen.props).toEqual({ args: '@ombelle-ui/cli add button' })
  })
})
