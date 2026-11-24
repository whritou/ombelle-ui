// CMP-04 and CMP-05: every named font is checked against its role when a recipe is validated, and
// diagnostics point at the recipe's own fields, not at a preset's /design or at user input.
import { expect, it } from 'vitest'
import { validateComponentRecipe, validateRecipe } from '@ombelle/contracts'
import badge from '../../../examples/component-recipe.badge.json'
import button from '../../../examples/recipe.example.json'
import { compileComponentRecipe, compileRecipe } from '../src/index.js'

const spinner = { ...badge, id: 'spinner-fonts', component: 'spinner', props: {}, content: { label: 'Loading' } }

it.each([
  ['headingFontFamilyId', 'no-such-font'],
  ['monoFontFamilyId', 'zzz'],
  ['fontFamilyId', 'geist-mono'],
])('refuses %s %s on a component recipe, whatever slots the component has', async (field, id) => {
  const recipe = { ...spinner, appearance: { fonts: { [field]: id } } }
  expect(() => validateComponentRecipe(recipe)).toThrow(expect.objectContaining({ code: 'INVALID_DATA', path: '/appearance/fonts/' + field }))
  await expect(compileComponentRecipe({ recipe })).rejects.toMatchObject({ path: '/appearance/fonts/' + field })
})

it('still accepts registry fonts for a role the component has no slot for', async () => {
  const recipe = { ...spinner, appearance: { fonts: { headingFontFamilyId: 'fraunces', monoFontFamilyId: 'ibm-plex-mono' } } }
  expect(() => validateComponentRecipe(recipe)).not.toThrow()
})

it('refuses an unknown Button recipe font in validateRecipe, at the override pointer', () => {
  expect(() => validateRecipe({ ...button, overrides: { fontFamilyId: 'no-such-font' } }))
    .toThrow(expect.objectContaining({ code: 'INVALID_DATA', path: '/overrides/fontFamilyId' }))
})

it('keeps the dark selector out of the JSON pointer', async () => {
  await expect(compileRecipe({ recipe: button, darkSelector: '.dark .x' })).rejects.toMatchObject({
    code: 'UNSUPPORTED_PROJECT', path: '/darkSelector', message: expect.stringContaining('".dark .x"'),
  })
})
