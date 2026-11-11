import { expect, it } from 'vitest'
import badge from '../../../examples/component-recipe.badge.json'
import button from '../../../examples/recipe.example.json'
import { componentRecipeComponents, componentRecipeFields, defaultRecipeFields, supportedComponentIds, validateComponentRecipe, validateInstallableRecipe } from '../src/index.js'

it('validates Badge and fills its omitted variant', () => {
  expect(validateComponentRecipe({ ...badge, props: {} })).toEqual({
    ...badge, props: { variant: 'default' },
  })
  expect(validateInstallableRecipe(button)).toEqual(button)
})

it('has one versioned recipe definition for every catalog component outside Button', () => {
  expect([...componentRecipeComponents].sort()).toEqual(supportedComponentIds.filter(id => id !== 'button').sort())
})

it.each([
  { content: { label: '   ' } },
  { content: { label: 'x'.repeat(201) } },
  { content: { label: 'Ready', extra: true } },
  { props: { variant: 'unknown' } },
  { props: { className: 'unknown' } },
  { revision: Number.MAX_SAFE_INTEGER + 1 },
])('rejects invalid Badge recipe data %#', (override) => {
  expect(() => validateInstallableRecipe({ ...badge, ...override })).toThrow()
})

it('rejects dangling and duplicate IDs independently of the editor', () => {
  const recipe = { ...badge, component: 'native-select', props: { selection: 'team' },
    content: { label: 'Plan', options: [{ id: 'starter', label: 'Starter' }] } }
  expect(() => validateComponentRecipe(recipe)).toThrow('Choose an item present')
  recipe.content.options.push({ id: 'starter', label: 'Other' })
  expect(() => validateComponentRecipe(recipe)).toThrow('Item IDs must be unique')
})

it('rejects multiple starting items in single expansion mode and nonrectangular tables', () => {
  expect(() => validateComponentRecipe({ ...badge, component: 'accordion',
    props: { type: 'single', expanded: ['one', 'two'] }, content: { items: [
      { id: 'one', label: 'One', body: '' }, { id: 'two', label: 'Two', body: '' },
    ] } })).toThrow('Single expansion accepts at most one item')
  expect(() => validateComponentRecipe({ ...badge, component: 'table', props: {},
    content: { caption: 'Projects', columns: [{ id: 'name', label: 'Name' }, { id: 'owner', label: 'Owner' }],
      rows: [{ id: 'one', cells: ['First'] }] } })).toThrow('Every row must have one cell per column')
})

it('rejects invalid paging, unsafe breadcrumb links and undescribed toast actions', () => {
  expect(() => validateComponentRecipe({ ...badge, component: 'pagination', props: { page: 3, totalPages: 2 },
    content: { label: 'Pages', previous: 'Previous', next: 'Next' } })).toThrow('Current page must not exceed total pages')
  expect(() => validateComponentRecipe({ ...badge, component: 'breadcrumb', props: {}, content: { label: 'Location', items: [
    { id: 'home', label: 'Home', href: 'javascript:alert(1)' }, { id: 'current', label: 'Current', href: '' },
  ] } })).toThrow()
  expect(() => validateComponentRecipe({ ...badge, component: 'breadcrumb', props: {}, content: { label: 'Location', items: [
    { id: 'home', label: 'Home', href: '' }, { id: 'current', label: 'Current', href: '' },
  ] } })).toThrow('Ancestor pages require a link')
  expect(() => validateComponentRecipe({ ...badge, component: 'toast', props: {}, content: {
    title: 'Saved', description: '', action: 'Undo', actionAltText: '', close: 'Dismiss',
  } })).toThrow('Toast actions require an alternative description')
})

it.each([
  ['input-group', { label: 'Website', placeholder: '', initialText: '', addon: '', action: '   ' }],
  ['toast', { title: 'Saved', description: '', action: '   ', actionAltText: 'Undo saving', close: 'Dismiss' }],
])('rejects whitespace-only optional action labels in %s', (component, content) => {
  expect(() => validateComponentRecipe({ ...badge, component, props: {}, content }))
    .toThrow(expect.objectContaining({ path: '/content/action' }))
})

const displayComponents = ['spinner', 'kbd', 'empty', 'field', 'meter', 'stepper'] as const
const draft = (component: (typeof displayComponents)[number], props: Record<string, unknown> = {}, content?: Record<string, unknown>) => ({
  ...badge, component, props,
  content: content ?? defaultRecipeFields(componentRecipeFields(component).content),
})

it.each(displayComponents)('accepts the default %s recipe', component => {
  expect(componentRecipeComponents).toContain(component)
  expect(validateComponentRecipe(draft(component)).component).toBe(component)
})

it.each([
  ['meter', { segments: 1 }],
  ['meter', { warningPercent: 150 }],
  ['meter', { max: 0 }],
  ['stepper', { current: 6 }],
  ['field', { control: 'select' }],
] as const)('rejects %s with %o', (component, props) => {
  expect(() => validateComponentRecipe(draft(component, props))).toThrow()
})

it('rejects a stepper with seven steps or a current step past the last', () => {
  const steps = (count: number) => Array.from({ length: count }, (_, index) => ({ id: `step-${index}`, title: 'Step', description: '' }))
  expect(() => validateComponentRecipe(draft('stepper', {}, { steps: steps(7) }))).toThrow()
  expect(() => validateComponentRecipe(draft('stepper', { current: 3 }, { steps: steps(3) })))
    .toThrow('Choose a step present in the recipe')
})

const formControls = ['slider', 'toggle-group', 'chip', 'tag-input', 'input-otp'] as const
const formDraft = (component: (typeof formControls)[number], props: Record<string, unknown> = {}, content?: Record<string, unknown>) => ({
  ...badge, component, props,
  content: content ?? defaultRecipeFields(componentRecipeFields(component).content),
})

it.each(formControls)('accepts the default %s recipe', component => {
  expect(componentRecipeComponents).toContain(component)
  expect(validateComponentRecipe(formDraft(component)).component).toBe(component)
})

it.each([
  ['slider', { value: 101 }, '/props/value'],
  ['slider', { min: 50, max: 50 }, '/props/max'],
  ['slider', { mode: 'range', rangeStart: 90, rangeEnd: 10 }, '/props/rangeStart'],
  ['slider', { mode: 'range', rangeEnd: 120 }, '/props/rangeEnd'],
  ['toggle-group', { selection: ['year'] }, '/props/selection'],
  ['toggle-group', { type: 'single', selection: ['day', 'week'] }, '/props/selection'],
  ['chip', { selection: ['archived'] }, '/props/selection'],
  ['tag-input', { max: 1 }, '/content/tags'],
  ['input-otp', { length: 4, separatorAfter: 4 }, '/props/separatorAfter'],
] as const)('rejects %s with %o at %s', (component, props, path) => {
  expect(() => validateComponentRecipe(formDraft(component, props))).toThrow(expect.objectContaining({ path }))
})

it.each([
  ['input-otp', { length: 9 }],
  ['toggle-group', { variant: 'pill' }],
] as const)('rejects %s with %o by schema', (component, props) => {
  expect(() => validateComponentRecipe(formDraft(component, props))).toThrow()
})

it('gives every editable item list an id, as the editor adds one to each new item', () => {
  for (const component of componentRecipeComponents)
    for (const [key, field] of Object.entries(componentRecipeFields(component).content))
      if (field.type === 'array' && field.items?.properties)
        expect(Object.keys(field.items.properties), `${component} ${key}`).toContain('id')
})

const overlays = ['combobox', 'command', 'hover-card', 'context-menu'] as const
const overlayDraft = (component: (typeof overlays)[number], props: Record<string, unknown> = {}, content?: Record<string, unknown>) => ({
  ...badge, component, props,
  content: content ?? defaultRecipeFields(componentRecipeFields(component).content),
})
const menuItems = (...kinds: string[]) => kinds.map((kind, index) => ({ id: `item-${index}`, label: 'Item', shortcut: '', kind }))

it.each(overlays)('accepts the default %s recipe', component => {
  expect(componentRecipeComponents).toContain(component)
  expect(validateComponentRecipe(overlayDraft(component)).component).toBe(component)
})

it.each([
  ['combobox', { selection: ['missing'] }, undefined, '/props/selection'],
  ['combobox', { mode: 'single', selection: ['liquid-glass', 'ombelle'] }, undefined, '/props/selection'],
  ['command', {}, { placeholder: 'Search', emptyText: 'None', groups: [{ id: 'empty', heading: 'Empty', items: [] }] }, '/content/groups'],
  ['context-menu', {}, { zoneText: 'Zone', items: menuItems('separator', 'item') }, '/content/items'],
  ['context-menu', {}, { zoneText: 'Zone', items: menuItems('item', 'separator') }, '/content/items'],
  ['context-menu', {}, { zoneText: 'Zone', items: menuItems('separator') }, '/content/items'],
] as const)('rejects %s with %o %o at %s', (component, props, content, path) => {
  expect(() => validateComponentRecipe(overlayDraft(component, props, content))).toThrow(expect.objectContaining({ path }))
})

it('accepts a multiple combobox with several selections', () => {
  expect(validateComponentRecipe(overlayDraft('combobox', { mode: 'multiple', selection: ['liquid-glass', 'ombelle'] })).component).toBe('combobox')
})

const calendarDraft = (props: Record<string, unknown> = {}) => ({
  ...badge, component: 'calendar', props,
  content: defaultRecipeFields(componentRecipeFields('calendar').content),
})

it('accepts the default calendar recipe and a range with an end date', () => {
  expect(componentRecipeComponents).toContain('calendar')
  expect(validateComponentRecipe(calendarDraft()).component).toBe('calendar')
  expect(validateComponentRecipe(calendarDraft({ mode: 'range', selectedFrom: '2026-11-12', selectedTo: '2026-11-18' })).component).toBe('calendar')
})

it.each([
  [{ selectedFrom: '2026-02-30' }, '/props/selectedFrom'],
  [{ mode: 'range', selectedTo: '2026-13-01' }, '/props/selectedTo'],
  [{ mode: 'range', selectedFrom: '2026-11-18', selectedTo: '2026-11-12' }, '/props/selectedTo'],
  [{ mode: 'single', selectedTo: '2026-11-18' }, '/props/selectedTo'],
  [{ mode: 'picker', selectedTo: '2026-11-18' }, '/props/selectedTo'],
] as const)('rejects the calendar recipe %o at %s', (props, path) => {
  expect(() => validateComponentRecipe(calendarDraft(props))).toThrow(expect.objectContaining({ path }))
})
