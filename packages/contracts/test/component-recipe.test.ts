import { expect, it } from 'vitest'
import badge from '../../../examples/component-recipe.badge.json'
import button from '../../../examples/recipe.example.json'
import { validateComponentRecipe, validateInstallableRecipe } from '../src/index.js'

it('validates Badge and fills its omitted variant', () => {
  expect(validateComponentRecipe({ ...badge, props: {} })).toEqual({
    ...badge, props: { variant: 'default' },
  })
  expect(validateInstallableRecipe(button)).toEqual(button)
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
