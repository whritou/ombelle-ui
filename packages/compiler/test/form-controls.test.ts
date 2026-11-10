import { describe, expect, it } from 'vitest'
import { getCatalog } from '@ombelle/catalog'
import { componentRecipeFields, defaultRecipeFields, styleFamilies, validateComponentRecipe, type ComponentRecipe } from '@ombelle/contracts'
import { compileComponentRecipe, describeComponentRecipe, type RecipeSpecimen } from '../src/index.js'
import { findShadowedNames } from './recipe-shadowing.js'

const parts = {
  slider: ['Slider', 'SliderTicks'],
  'toggle-group': ['ToggleGroup', 'ToggleGroupItem'],
  chip: ['Chip', 'ChipGroup', 'ChipRemove'],
  'tag-input': ['TagInput', 'TagInputInput', 'TagInputList'],
  'input-otp': ['InputOTP', 'InputOTPGroup', 'InputOTPSeparator', 'InputOTPSlot'],
} as const
type Id = keyof typeof parts
const catalog = getCatalog('0.1.0')
const recipe = (component: Id, family: (typeof styleFamilies)[number], props: Record<string, unknown> = {}) => {
  const { id, revision, catalogRelease, compilerVersion } = family === 'liquid-glass' ? catalog.startingPresets['builtin-liquid-glass'] : catalog.presets[family]
  return validateComponentRecipe({ schemaVersion: '2.0', id: `form_${component.replace('-', '_')}`, revision: 1, component,
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

describe.each(styleFamilies)('%s form control recipes', family => {
  it.each(Object.keys(parts) as Id[])('%s compiles deterministically with its parts and no shadowed names', async component => {
    const first = await compileComponentRecipe({ recipe: recipe(component, family) })
    const second = await compileComponentRecipe({ recipe: recipe(component, family) })
    expect(second.artifacts).toEqual(first.artifacts)
    const source = first.artifacts.find(artifact => artifact.logicalPath.endsWith(`/${component}.tsx`))!.content
    for (const name of parts[component]) expect(source).toContain(`function ${name}(`)
    expect(findShadowedNames(source)).toEqual([])
  })
})

describe('form control specimens', () => {
  const describe_ = (component: Id, props: Record<string, unknown> = {}) => describeComponentRecipe(recipe(component, 'ombelle', props) as ComponentRecipe)

  it('draws a single slider named by its label, or a range with named thumbs and ticks', () => {
    expect(describe_('slider').props).toMatchObject({ defaultValue: [12], min: 0, max: 100, step: 1, 'aria-label': 'Border radius' })
    const range = describe_('slider', { mode: 'range', ticks: true })
    expect(tags(range)).toEqual(['Slider', 'SliderTicks'])
    expect(find(range, 'Slider')[0]!.props).toMatchObject({ defaultValue: [20, 80], thumbLabels: ['Minimum price', 'Maximum price'] })
    expect(find(range, 'SliderTicks')[0]!.props).toMatchObject({ values: [0, 25, 50, 75, 100], min: 0, max: 100 })
  })

  it('selects the toggle group items in the recipe selection', () => {
    expect(describe_('toggle-group').props).toMatchObject({ type: 'single', variant: 'segmented', defaultValue: 'week', 'aria-label': 'Calendar view' })
    expect(describe_('toggle-group', { type: 'multiple', selection: ['day', 'month'] }).props).toMatchObject({ type: 'multiple', defaultValue: ['day', 'month'] })
    expect(find(describe_('toggle-group'), 'ToggleGroupItem').map(item => item.props.value)).toEqual(['day', 'week', 'month'])
  })

  it('presses the selected chips, or gives each removable chip a remove button', () => {
    expect(find(describe_('chip'), 'Chip').map(chip => chip.props.defaultPressed)).toEqual([true, true, false])
    const removable = describe_('chip', { mode: 'removable' })
    expect(find(removable, 'ChipRemove')).toHaveLength(3)
    expect(find(removable, 'Chip').every(chip => chip.props.defaultPressed === undefined)).toBe(true)
  })

  it('labels the tag input and the code, and splits the code after the separator', () => {
    const tagInput = describe_('tag-input')
    expect(find(tagInput, 'TagInput')[0]!.props).toMatchObject({ defaultValue: ['design-tokens', 'glass'], max: 8 })
    expect(find(tagInput, 'label')[0]!.children).toEqual(['Topics'])
    const otp = describe_('input-otp')
    expect(otp.props).toMatchObject({ maxLength: 6, 'aria-label': 'Verification code' })
    expect(find(otp, 'InputOTPGroup').map(group => find(group, 'InputOTPSlot').length)).toEqual([3, 3])
    expect(find(describe_('input-otp', { separatorAfter: 0 }), 'InputOTPSeparator')).toHaveLength(0)
  })
})
