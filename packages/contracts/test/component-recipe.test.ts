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
  const step = { title: 'Step', description: '' }
  expect(() => validateComponentRecipe(draft('stepper', {}, { steps: Array(7).fill(step) }))).toThrow()
  expect(() => validateComponentRecipe(draft('stepper', { current: 3 }, { steps: [step, step, step] })))
    .toThrow('Choose a step present in the recipe')
})
