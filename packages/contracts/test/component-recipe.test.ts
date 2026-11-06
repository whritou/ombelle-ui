import { expect, it } from 'vitest'
import badge from '../../../examples/component-recipe.badge.json'
import button from '../../../examples/recipe.example.json'
import { componentRecipeComponents, supportedComponentIds, validateComponentRecipe, validateInstallableRecipe } from '../src/index.js'

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
