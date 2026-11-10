import { describe, expect, it } from 'vitest'
import { getCatalog } from '@ombelle/catalog'
import { componentRecipeFields, defaultRecipeFields, styleFamilies, validateComponentRecipe, type ComponentRecipe } from '@ombelle/contracts'
import { compileComponentRecipe, describeComponentRecipe, type RecipeSpecimen } from '../src/index.js'

const catalog = getCatalog('0.1.0')
type Id = 'badge' | 'alert' | 'card' | 'avatar' | 'accordion'
const recipe = (component: Id, props: Record<string, unknown> = {}, family: (typeof styleFamilies)[number] = 'ombelle') => {
  const { id, revision, catalogRelease, compilerVersion } = family === 'liquid-glass' ? catalog.startingPresets['builtin-liquid-glass'] : catalog.presets[family]
  return validateComponentRecipe({ schemaVersion: '2.0', id: 'variants_' + component, revision: 1, component,
    presetRef: { id, revision, catalogRelease, compilerVersion }, props, content: defaultRecipeFields(componentRecipeFields(component).content) }) as ComponentRecipe
}
const specimen = (component: Id, props: Record<string, unknown> = {}) => describeComponentRecipe(recipe(component, props))
const tags = (node: RecipeSpecimen | string): string[] => typeof node === 'string' ? [] : [node.tag, ...node.children.flatMap(tags)]
const find = (node: RecipeSpecimen | string, tag: string): RecipeSpecimen | undefined => typeof node === 'string' ? undefined
  : node.tag === tag ? node : node.children.map(child => find(child, tag)).find(Boolean)

describe('batch 6a specimens', () => {
  it('passes the Badge appearance only when the recipe sets it', () => {
    expect(specimen('badge').props).not.toHaveProperty('appearance', expect.anything())
    expect(specimen('badge', { appearance: 'soft', variant: 'warning' }).props).toMatchObject({ appearance: 'soft', variant: 'warning' })
  })

  it('adds a Dismiss button, actions and the compact layout to Alert', () => {
    expect(tags(specimen('alert'))).not.toContain('AlertDismiss')
    const alert = specimen('alert', { dismissible: true, actions: true, layout: 'compact' })
    expect(tags(alert)).toEqual(expect.arrayContaining(['AlertDismiss', 'AlertActions']))
    expect(alert.props).toMatchObject({ layout: 'compact' })
    expect(find(alert, 'AlertActions')!.children).toEqual([expect.objectContaining({ tag: 'button', children: ['Undo'] })])
  })

  it('draws a link card, an option group and a media card', () => {
    expect(tags(specimen('card'))).not.toEqual(expect.arrayContaining(['CardLink']))
    expect(find(specimen('card', { mode: 'link' }), 'CardLink')).toMatchObject({ props: { href: '#card' } })
    const group = specimen('card', { mode: 'options' })
    expect(group).toMatchObject({ tag: 'CardGroup', props: { name: 'plan', defaultValue: 'team' } })
    expect(group.children.map(child => typeof child === 'string' ? child : child.props.value)).toEqual(['starter', 'team', 'enterprise'])
    expect(tags(specimen('card', { mode: 'media' }))[1]).toBe('CardMedia')
  })

  it('draws a square avatar and an overflow group only when overflow is above 0', () => {
    expect(specimen('avatar', { shape: 'square' }).props).toMatchObject({ shape: 'square' })
    expect(specimen('avatar', { overflow: 0 }).tag).toBe('Avatar')
    const group = specimen('avatar', { overflow: 4 })
    expect(group).toMatchObject({ tag: 'AvatarGroup', props: { 'aria-label': 'Reviewers' } })
    expect(find(group, 'AvatarOverflow')).toMatchObject({ props: { count: 4 } })
  })

  it('passes the Accordion appearance and icon, leaving the family icon alone', () => {
    expect(specimen('accordion', { appearance: 'flush', icon: 'plus' }).props).toMatchObject({ appearance: 'flush', icon: 'plus' })
    expect(specimen('accordion', { icon: 'family' }).props).not.toHaveProperty('icon', expect.anything())
  })

  describe.each(styleFamilies)('%s', family => {
    it.each([
      ['badge', { appearance: 'soft', variant: 'success' }],
      ['alert', { dismissible: true, actions: true }],
      ['card', { mode: 'options' }],
      ['avatar', { shape: 'square', overflow: 3 }],
      ['accordion', { appearance: 'flush', icon: 'plus' }],
    ] as const)('compiles a %s variant recipe deterministically', async (component, props) => {
      const first = await compileComponentRecipe({ recipe: recipe(component, props, family) })
      const second = await compileComponentRecipe({ recipe: recipe(component, props, family) })
      expect(second.artifacts).toEqual(first.artifacts)
    })
  })
})
