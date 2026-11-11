import { expect, it } from 'vitest'
import { compileComponentRecipe, compileRecipe } from '@ombelle/compiler'
import { validateComponentRecipe, validateRecipe, type ComponentRecipe } from '@ombelle/contracts'
import badge from '../../../../examples/component-recipe.badge.json'
import button from '../../../../examples/recipe.example.json'
import { artifactChanges, changesSummary } from './artifact-diff'

const compileBadge = (recipe: unknown) => compileComponentRecipe({ recipe: validateComponentRecipe(recipe) })
const base = badge as unknown as ComponentRecipe

it('same recipe, other scope, no changes', async () => {
  const reference = await compileBadge(base)
  const renamed = await compileBadge({ ...base, id: 'catalog_badge_copy', revision: 3 })
  expect(renamed.scope).not.toBe(reference.scope)
  expect(changesSummary(artifactChanges(renamed, reference))).toBe('Same as the catalog default.')
})

it('an override shows in CSS', async () => {
  const reference = await compileBadge(base)
  const edited = await compileBadge({ ...base, appearance: { parts: { badge: { colors: { light: { background: '#123456' } } } } } })
  const changes = artifactChanges(edited, reference)
  const style = changes.find((change) => change.kind === 'style')!
  expect(style.added).toBeGreaterThanOrEqual(1)
  expect(style.lines.some((line) => line.kind === 'add' && line.text.toLowerCase().includes('#123456'))).toBe(true)
  expect(changesSummary(changes)).toMatch(/^Changes from the catalog default: \d+ files?, \+\d+ −\d+$/)
})

it('a content change shows in the recipe', async () => {
  const reference = await compileBadge(base)
  const edited = await compileBadge({ ...base, content: { label: 'Beta' } })
  const recipe = artifactChanges(edited, reference).find((change) => change.kind === 'recipe')!
  expect(recipe).toMatchObject({ added: 1, removed: 1 })
})

it('the Button pairs too', async () => {
  const reference = await compileRecipe({ recipe: validateRecipe(button) })
  const edited = await compileRecipe({ recipe: validateRecipe({ ...button, props: { ...button.props, variant: 'outline' } }) })
  const changes = artifactChanges(edited, reference)
  expect(changes.map((change) => change.kind)).toEqual(expect.arrayContaining(['component', 'style', 'recipe']))
  const changed = changes.filter((change) => change.added + change.removed > 0).length
  expect(changed).toBeGreaterThanOrEqual(1)
  expect(changed).toBeLessThanOrEqual(3)
})
