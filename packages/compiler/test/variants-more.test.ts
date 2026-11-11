import { describe, expect, it } from 'vitest'
import { getCatalog } from '@ombelle/catalog'
import { componentRecipeFields, defaultRecipeFields, styleFamilies, validateComponentRecipe, type ComponentRecipe } from '@ombelle/contracts'
import { compileComponentRecipe, describeComponentRecipe, type RecipeSpecimen } from '../src/index.js'

const catalog = getCatalog('0.1.0')
type Id = 'tabs' | 'table' | 'input' | 'textarea' | 'input-group' | 'pagination' | 'select' | 'toast' | 'sheet'
const recipe = (component: Id, props: Record<string, unknown> = {}, family: (typeof styleFamilies)[number] = 'ombelle') => {
  const { id, revision, catalogRelease, compilerVersion } = family === 'liquid-glass' ? catalog.startingPresets['builtin-liquid-glass'] : catalog.presets[family]
  return validateComponentRecipe({ schemaVersion: '2.0', id: 'more_' + component.replace('-', '_'), revision: 1, component,
    presetRef: { id, revision, catalogRelease, compilerVersion }, props, content: defaultRecipeFields(componentRecipeFields(component).content) }) as ComponentRecipe
}
const specimen = (component: Id, props: Record<string, unknown> = {}) => describeComponentRecipe(recipe(component, props))
const all = (node: RecipeSpecimen | string): RecipeSpecimen[] => typeof node === 'string' ? [] : [node, ...node.children.flatMap(all)]
const find = (node: RecipeSpecimen, tag: string) => all(node).find(item => item.tag === tag)
const tags = (node: RecipeSpecimen) => all(node).map(item => item.tag)

describe('batch 6b and 6c specimens', () => {
  it('adds pill tabs with counts', () => {
    const tabs = specimen('tabs', { appearance: 'pills', counts: true })
    expect(find(tabs, 'TabsList')!.props).toMatchObject({ appearance: 'pills' })
    expect(tags(tabs).filter(tag => tag === 'TabsCount').length).toBeGreaterThan(1)
    expect(tags(specimen('tabs'))).not.toContain('TabsCount')
  })

  it('makes a sticky, sorted, loading table with an actions column', () => {
    const table = specimen('table', { stickyHeader: true, sortable: true, actions: true })
    expect(table.props).toMatchObject({ stickyHeader: true })
    expect(all(table).filter(item => item.tag === 'TableHead')[0]!.props).toMatchObject({ sort: 'descending' })
    expect(all(table).some(item => item.tag === 'TableHead' && item.props.actions === true)).toBe(true)
    const loading = specimen('table', { loading: true })
    expect(loading.props).toMatchObject({ loading: true })
    expect(tags(loading)).toContain('TableSkeletonRows')
  })

  it('sizes inputs and textareas', () => {
    expect(find(specimen('input', { size: 'sm' }), 'Input')!.props).toMatchObject({ size: 'sm' })
    expect(find(specimen('textarea', { size: 'lg' }), 'Textarea')!.props).toMatchObject({ size: 'lg' })
    expect(find(specimen('input'), 'Input')!.props).not.toHaveProperty('size', expect.anything())
  })

  it('adds Clear and a counter to an input group', () => {
    const group = specimen('input-group', { clearable: true, counter: true })
    expect(tags(group)).toEqual(expect.arrayContaining(['InputGroupClear', 'InputGroupCount']))
  })

  it('draws compact pagination with a page size', () => {
    const pages = specimen('pagination', { layout: 'compact', pageSize: true })
    expect(tags(pages)).toEqual(expect.arrayContaining(['PaginationCompact', 'PaginationPageSize']))
    expect(tags(pages)).not.toContain('PaginationContent')
  })

  it('makes a multiple Select with item icons', () => {
    const select = specimen('select', { multiple: true, icons: true })
    expect(find(select, 'Select')!.props).toMatchObject({ multiple: true })
    expect(Array.isArray(find(select, 'Select')!.props.defaultValue)).toBe(true)
    expect(all(select).filter(item => item.tag === 'SelectItem').every(item => item.props.icon !== undefined || item.children.length)).toBe(true)
  })

  it('shows a pending promise toast and a stack', () => {
    expect(all(specimen('toast', { mode: 'promise' })).some(item => item.props['data-slot'] === 'toast-spinner')).toBe(true)
    const stack = specimen('toast', { mode: 'stack' })
    expect(find(stack, 'ToastViewport')!.props).toMatchObject({ stack: true })
    expect(tags(stack).filter(tag => tag === 'Toast')).toHaveLength(3)
  })

  it('gives a bottom sheet a handle and a side sheet a resize grip, passing no unknown prop', () => {
    const bottom = specimen('sheet', { side: 'bottom', handle: true })
    expect(tags(bottom)).toContain('SheetHandle')
    expect(find(bottom, 'SheetContent')!.props).not.toHaveProperty('handle')
    expect(find(specimen('sheet', { resizable: true }), 'SheetContent')!.props).toMatchObject({ resizable: true })
  })

  describe.each(styleFamilies)('%s', family => {
    it.each([
      ['tabs', { appearance: 'pills', counts: true }], ['table', { stickyHeader: true, sortable: true, actions: true, loading: true }],
      ['input', { size: 'lg' }], ['input-group', { clearable: true, counter: true }], ['pagination', { layout: 'compact', pageSize: true }],
      ['select', { multiple: true, icons: true }], ['toast', { mode: 'stack' }], ['sheet', { handle: true, side: 'bottom' }],
    ] as const)('compiles a %s variant recipe deterministically', async (component, props) => {
      const first = await compileComponentRecipe({ recipe: recipe(component, props, family) })
      const second = await compileComponentRecipe({ recipe: recipe(component, props, family) })
      expect(second.artifacts).toEqual(first.artifacts)
    })
  })
})
