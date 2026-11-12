import { describe, expect, it } from 'vitest'
import { getCatalog } from '@ombelle/catalog'
import { componentRecipeFields, defaultRecipeFields, styleFamilies, validateComponentRecipe, type ComponentRecipe } from '@ombelle/contracts'
import { compileComponentRecipe, describeComponentRecipe, type RecipeSpecimen } from '../src/index.js'
import { findShadowedNames } from './recipe-shadowing.js'

const parts = {
  toggle: ['Toggle'],
  collapsible: ['Collapsible', 'CollapsibleContent', 'CollapsibleTrigger'],
  'scroll-area': ['ScrollArea', 'ScrollBar'],
  'button-group': ['ButtonGroup', 'ButtonGroupSeparator', 'ButtonGroupText'],
  item: ['Item', 'ItemActions', 'ItemContent', 'ItemDescription', 'ItemGroup', 'ItemMedia', 'ItemSeparator', 'ItemTitle'],
} as const
type Id = keyof typeof parts
const catalog = getCatalog('0.1.0')
const recipe = (component: Id, family: (typeof styleFamilies)[number], props: Record<string, unknown> = {}) => {
  const { id, revision, catalogRelease, compilerVersion } = family === 'liquid-glass' ? catalog.startingPresets['builtin-liquid-glass'] : catalog.presets[family]
  return validateComponentRecipe({ schemaVersion: '2.0', id: `prim_${component.replace('-', '_')}`, revision: 1, component,
    presetRef: { id, revision, catalogRelease, compilerVersion }, props, content: defaultRecipeFields(componentRecipeFields(component).content) })
}
const find = (specimen: RecipeSpecimen, tag: string): RecipeSpecimen[] => [
  ...(specimen.tag === tag ? [specimen] : []),
  ...specimen.children.flatMap(child => typeof child === 'string' ? [] : find(child, tag)),
]

describe.each(styleFamilies)('%s 0.7.5 primitive recipes', family => {
  it.each(Object.keys(parts) as Id[])('%s compiles deterministically with its parts and no shadowed names', async component => {
    const first = await compileComponentRecipe({ recipe: recipe(component, family) })
    const second = await compileComponentRecipe({ recipe: recipe(component, family) })
    expect(second.artifacts).toEqual(first.artifacts)
    const source = first.artifacts.find(artifact => artifact.logicalPath.endsWith(`/${component}.tsx`))!.content
    for (const name of parts[component]) expect(source).toContain(`function ${name}(`)
    expect(findShadowedNames(source)).toEqual([])
  })
})

describe('0.7.5 primitive specimens', () => {
  const d = (component: Id, props: Record<string, unknown> = {}) => describeComponentRecipe(recipe(component, 'ombelle', props) as ComponentRecipe)

  it('draws a toggle pressed by default, or its initial named by the label when icon only', () => {
    const toggle = d('toggle')
    expect(toggle.props).toMatchObject({ variant: 'default', size: 'default', defaultPressed: true })
    expect(toggle.children).toEqual(['Show grid'])
    const icon = d('toggle', { iconOnly: true })
    expect(icon.props['aria-label']).toBe('Show grid')
    expect(find(icon, 'span')[0]!.children).toEqual(['S'])
  })

  it('draws a collapsible with a paragraph per row', () => {
    const c = d('collapsible')
    expect(c.props).toMatchObject({ defaultOpen: true })
    expect(find(c, 'p').map(p => p.children[0])).toEqual(['Offset X', 'Offset Y'])
  })

  it('sizes the scroll area and adds a horizontal bar when it scrolls sideways', () => {
    const v = d('scroll-area')
    expect(v.props).toMatchObject({ 'aria-label': 'Components', style: { blockSize: '200px' } })
    expect(find(v, 'ScrollBar')).toHaveLength(0)
    expect(find(v, 'div')[0]!.children).toHaveLength(12)
    expect(find(d('scroll-area', { orientation: 'both' }), 'ScrollBar')[0]!.props.orientation).toBe('horizontal')
  })

  it('marks the native children of each button group mode', () => {
    const split = d('button-group')
    expect(find(split, 'button').map(b => [b.props['data-button-group-button'], b.props['aria-label']])).toEqual([['', undefined], ['', 'More install options']])
    expect(find(d('button-group', { mode: 'input' }), 'input')[0]!.props).toMatchObject({ 'data-button-group-input': '', 'aria-label': 'Install actions' })
    expect(find(d('button-group', { mode: 'toolbar' }), 'button')).toHaveLength(2)
  })

  it('draws an item with media, content and an action', () => {
    const item = d('item')
    expect(find(item, 'ItemMedia')[0]!.props.variant).toBe('icon')
    expect(find(item, 'button')[0]!.props).toMatchObject({ 'data-item-action': '' })
    const bare = d('item', { media: 'none', actions: false })
    expect(find(bare, 'ItemMedia')).toHaveLength(0)
    expect(find(bare, 'ItemActions')).toHaveLength(0)
    expect(find(d('item', { media: 'image' }), 'img')[0]!.props.alt).toBe('')
  })
})
