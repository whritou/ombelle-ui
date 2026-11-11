import { describe, expect, it } from 'vitest'
import { getCatalog } from '@ombelle/catalog'
import { componentRecipeFields, defaultRecipeFields, styleFamilies, validateComponentRecipe, type ComponentRecipe } from '@ombelle/contracts'
import { compileComponentRecipe, describeComponentRecipe, type RecipeSpecimen } from '../src/index.js'
import { findShadowedNames } from './recipe-shadowing.js'

const parts = {
  combobox: ['Combobox', 'ComboboxContent', 'ComboboxCreate', 'ComboboxEmpty', 'ComboboxInput', 'ComboboxItem', 'ComboboxList'],
  command: ['Command', 'CommandEmpty', 'CommandGroup', 'CommandInput', 'CommandItem', 'CommandList', 'CommandSeparator', 'CommandShortcut'],
  'hover-card': ['HoverCard', 'HoverCardArrow', 'HoverCardContent', 'HoverCardTrigger'],
  'context-menu': ['ContextMenu', 'ContextMenuContent', 'ContextMenuItem', 'ContextMenuSeparator', 'ContextMenuShortcut', 'ContextMenuSub', 'ContextMenuSubContent', 'ContextMenuSubTrigger', 'ContextMenuTrigger'],
} as const
type Id = keyof typeof parts
const catalog = getCatalog('0.1.0')
const recipe = (component: Id, family: (typeof styleFamilies)[number], props: Record<string, unknown> = {}) => {
  const { id, revision, catalogRelease, compilerVersion } = family === 'liquid-glass' ? catalog.startingPresets['builtin-liquid-glass'] : catalog.presets[family]
  return validateComponentRecipe({ schemaVersion: '2.0', id: `overlay_${component.replace('-', '_')}`, revision: 1, component,
    presetRef: { id, revision, catalogRelease, compilerVersion }, props, content: defaultRecipeFields(componentRecipeFields(component).content) })
}
const tags = (specimen: RecipeSpecimen): string[] => {
  const names = new Set<string>()
  const visit = (node: RecipeSpecimen) => { if (/^[A-Z]/.test(node.tag)) names.add(node.tag); node.children.forEach(child => typeof child !== 'string' && visit(child)) }
  visit(specimen)
  return [...names].sort()
}
const find = (specimen: RecipeSpecimen, tag: string): RecipeSpecimen[] => [
  ...(specimen.tag === tag ? [specimen] : []),
  ...specimen.children.flatMap(child => typeof child === 'string' ? [] : find(child, tag)),
]

describe.each(styleFamilies)('%s overlay and search recipes', family => {
  it.each(Object.keys(parts) as Id[])('%s compiles deterministically with its parts and no shadowed names', async component => {
    const first = await compileComponentRecipe({ recipe: recipe(component, family) })
    const second = await compileComponentRecipe({ recipe: recipe(component, family) })
    expect(second.artifacts).toEqual(first.artifacts)
    const source = first.artifacts.find(artifact => artifact.logicalPath.endsWith(`/${component}.tsx`))!.content
    for (const name of parts[component]) expect(source).toContain(`function ${name}(`)
    expect(findShadowedNames(source)).toEqual([])
  })
})

describe('overlay and search specimens', () => {
  const describe_ = (component: Id, props: Record<string, unknown> = {}, content?: Record<string, unknown>) => {
    const base = recipe(component, 'ombelle', props) as ComponentRecipe
    return describeComponentRecipe((content ? { ...base, content: { ...base.content, ...content } } : base) as ComponentRecipe)
  }

  it('labels the combobox, starts it filtered on "gla" and offers Create only when creatable', () => {
    const combobox = describe_('combobox')
    expect(find(combobox, 'Combobox')[0]!.props).toMatchObject({ multiple: false, defaultValue: '', defaultQuery: 'gla' })
    expect(find(combobox, 'ComboboxInput')[0]!.props).toMatchObject({ 'aria-labelledby': { localId: '-label' }, placeholder: 'Search presets' })
    expect(find(combobox, 'ComboboxItem').map(item => item.props.value)).toEqual(['liquid-glass', 'liquid-glass-givre', 'liquid-glass-prism', 'ombelle'])
    expect(find(combobox, 'ComboboxCreate')).toHaveLength(1)
    expect(find(describe_('combobox', { creatable: false }), 'ComboboxCreate')).toHaveLength(0)
    expect(find(describe_('combobox', { mode: 'multiple', selection: ['ombelle'] }), 'Combobox')[0]!.props).toMatchObject({ multiple: true, defaultValue: ['ombelle'] })
  })

  it('groups combobox options that name a group', () => {
    const items = [{ id: 'a', label: 'Alpha', group: 'Built-in' }, { id: 'b', label: 'Beta', group: 'Built-in' }, { id: 'c', label: 'Gamma', group: '' }]
    const grouped = describe_('combobox', {}, { items })
    expect(find(grouped, 'ComboboxGroup').map(group => group.props.heading)).toEqual(['Built-in'])
    expect(find(find(grouped, 'ComboboxGroup')[0]!, 'ComboboxItem')).toHaveLength(2)
  })

  it('draws the command inline with its search, groups and shortcuts, or behind a trigger as a dialog', () => {
    const inline = describe_('command')
    expect(inline.tag).toBe('Command')
    expect(inline.props).toMatchObject({ defaultSearch: 'add' })
    expect(find(inline, 'CommandGroup').map(group => group.props.heading)).toEqual(['Components', 'Theme'])
    expect(find(inline, 'CommandShortcut').map(shortcut => shortcut.children)).toEqual([['↵'], ['Ctrl+T']])
    const dialog = describe_('command', { presentation: 'dialog' })
    expect(find(dialog, 'CommandDialog')).toHaveLength(1)
    expect(find(dialog, 'CommandDialogTrigger')[0]!.children).toEqual(['Open command menu'])
  })

  it('previews the hover card from a link, with the arrow only when asked', () => {
    const card = describe_('hover-card')
    expect(find(card, 'HoverCardTrigger')[0]!.props).toMatchObject({ href: '#' })
    expect(find(card, 'HoverCardTrigger')[0]!.children).toEqual(['@ombelle'])
    expect(find(card, 'HoverCardContent')[0]!.props).toMatchObject({ side: 'bottom' })
    expect(find(card, 'HoverCardArrow')).toHaveLength(1)
    expect(find(describe_('hover-card', { arrow: false }), 'HoverCardArrow')).toHaveLength(0)
  })

  it('opens the context menu from a focusable zone, with a submenu, a separator and a destructive item', () => {
    const menu = describe_('context-menu')
    expect(find(menu, 'ContextMenuTrigger')[0]!.props).toMatchObject({ tabIndex: 0, 'aria-label': 'Right-click or Shift+F10 on a layer' })
    expect(find(menu, 'ContextMenuSubTrigger')[0]!.children).toEqual(['Apply preset'])
    expect(find(find(menu, 'ContextMenuSubContent')[0]!, 'ContextMenuItem').map(item => item.children[0])).toEqual(['Ombelle', 'Liquid glass'])
    expect(find(menu, 'ContextMenuSeparator')).toHaveLength(1)
    expect(find(menu, 'ContextMenuItem').at(-1)!.props).toMatchObject({ variant: 'destructive' })
    expect(find(find(menu, 'ContextMenuItem')[0]!, 'ContextMenuShortcut')[0]!.children).toEqual(['Ctrl+D'])
  })
})
