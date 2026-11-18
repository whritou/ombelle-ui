import { describe, expect, it } from 'vitest'
import { getCatalog } from '@ombelle/catalog'
import { componentRecipeFields, defaultRecipeFields, styleFamilies, validateComponentRecipe, type ComponentRecipe } from '@ombelle/contracts'
import { compileComponentRecipe, describeComponentRecipe, type RecipeSpecimen } from '../src/index.js'
import { findShadowedNames } from './recipe-shadowing.js'

const catalog = getCatalog('0.1.0')
type Id = 'prose' | 'navigation-menu' | 'sidebar' | 'resizable' | 'menubar' | 'data-table'
type Family = (typeof styleFamilies)[number]
const recipe = (component: Id, props: Record<string, unknown> = {}, content: Record<string, unknown> = {}, family: Family = 'ombelle') => {
  const { id, revision, catalogRelease, compilerVersion } = family === 'liquid-glass' ? catalog.startingPresets['builtin-liquid-glass'] : catalog.presets[family]
  const fields = componentRecipeFields(component)
  return validateComponentRecipe({ schemaVersion: '2.0', id: 's09_' + component.replace('-', '_'), revision: 1, component,
    presetRef: { id, revision, catalogRelease, compilerVersion },
    props: { ...defaultRecipeFields(fields.props), ...props },
    content: { ...defaultRecipeFields(fields.content), ...content } }) as ComponentRecipe
}
const specimen = (component: Id, props: Record<string, unknown> = {}, content: Record<string, unknown> = {}) => describeComponentRecipe(recipe(component, props, content))
const all = (node: RecipeSpecimen | string): RecipeSpecimen[] => typeof node === 'string' ? [] : [node, ...node.children.flatMap(all)]
const count = (node: RecipeSpecimen, tag: string) => all(node).filter(item => item.tag === tag).length
const find = (node: RecipeSpecimen, tag: string) => all(node).find(item => item.tag === tag)

const drafts: readonly [Id, readonly string[]][] = [
  ['prose', ['Prose', 'ProseLead']],
  ['navigation-menu', ['NavigationMenu', 'NavigationMenuList', 'NavigationMenuTrigger', 'NavigationMenuContent', 'NavigationMenuLink', 'NavigationMenuIndicator']],
  ['sidebar', ['SidebarProvider', 'Sidebar', 'SidebarMenuButton', 'SidebarTrigger', 'SidebarRail']],
  ['resizable', ['ResizablePanelGroup', 'ResizablePanel', 'ResizableHandle']],
  ['menubar', ['Menubar', 'MenubarMenu', 'MenubarTrigger', 'MenubarContent', 'MenubarItem', 'MenubarShortcut']],
  ['data-table', ['DataTable', 'DataTablePagination', 'DataTableFacetedFilter']],
]

describe('0.9 app shell specimens', () => {
  describe.each(styleFamilies)('%s', family => {
    it.each(drafts)('compiles the default %s recipe deterministically with its parts', async (component, parts) => {
      const first = await compileComponentRecipe({ recipe: recipe(component, {}, {}, family) })
      const second = await compileComponentRecipe({ recipe: recipe(component, {}, {}, family) })
      expect(second.artifacts).toEqual(first.artifacts)
      const source = first.artifacts.find(artifact => artifact.logicalPath.endsWith(`/${component}.tsx`))!.content
      for (const name of parts) expect(source).toMatch(new RegExp(`function ${name}[<(]`))
      expect(findShadowedNames(source)).toEqual([])
    })
  })

  it('sets the sidebar collapse, side and variant from the recipe, and a rail unless it never collapses', () => {
    expect(find(specimen('sidebar', { collapsible: 'icon', side: 'right', variant: 'floating' }), 'Sidebar')?.props).toMatchObject({ collapsible: 'icon', side: 'right', variant: 'floating' })
    expect(count(specimen('sidebar', { collapsible: 'none' }), 'SidebarRail')).toBe(0)
    expect(count(specimen('sidebar'), 'SidebarMenuButton')).toBe(6)
  })

  it('draws one resizable panel per label, with handles between them', () => {
    const three = specimen('resizable', { panels: 3 }, { labels: ['Files', 'Preview', 'Controls'] })
    expect(count(three, 'ResizablePanel')).toBe(3)
    expect(count(three, 'ResizableHandle')).toBe(2)
  })

  it('draws a navigation panel for items with links and a trigger-like link for the rest', () => {
    const menu = specimen('navigation-menu', { indicator: false })
    expect(count(menu, 'NavigationMenuTrigger')).toBe(2)
    expect(all(menu).filter(node => node.tag === 'NavigationMenuLink' && node.props.variant === 'trigger')).toHaveLength(1)
    expect(count(menu, 'NavigationMenuIndicator')).toBe(0)
  })

  it('shows menubar shortcuts only when asked', () => {
    expect(count(specimen('menubar'), 'MenubarShortcut')).toBe(9)
    expect(count(specimen('menubar', { shortcuts: false }), 'MenubarShortcut')).toBe(0)
  })

  it('turns the data table features on and off from the recipe', () => {
    expect(specimen('data-table').props).toMatchObject({ selectable: true, columnVisibility: true, pagination: true, facets: [{ column: 'status', title: 'Status' }] })
    expect(specimen('data-table', { selection: false, facets: false }).props).toMatchObject({ selectable: false, facets: [] })
  })

  it('keeps the prose measure', () => {
    expect(specimen('prose', { measure: 'narrow' }).props).toMatchObject({ measure: 'narrow' })
  })
})
