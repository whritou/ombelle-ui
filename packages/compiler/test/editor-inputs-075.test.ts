import { describe, expect, it } from 'vitest'
import { getCatalog } from '@ombelle/catalog'
import { componentRecipeFields, defaultRecipeFields, styleFamilies, validateComponentRecipe, type ComponentRecipe } from '@ombelle/contracts'
import { compileComponentRecipe, describeComponentRecipe, type RecipeSpecimen } from '../src/index.js'
import { findShadowedNames } from './recipe-shadowing.js'

const parts = {
  'number-input': ['NumberInput'],
  'color-picker': ['ColorPicker', 'ColorPickerPair', 'ColorPickerSwatches'],
} as const
type Id = keyof typeof parts
const catalog = getCatalog('0.1.0')
const recipe = (component: Id, family: (typeof styleFamilies)[number], props: Record<string, unknown> = {}, content: Record<string, unknown> = {}) => {
  const { id, revision, catalogRelease, compilerVersion } = family === 'liquid-glass' ? catalog.startingPresets['builtin-liquid-glass'] : catalog.presets[family]
  const fields = componentRecipeFields(component)
  return validateComponentRecipe({ schemaVersion: '2.0', id: `inputs_${component.replace('-', '_')}`, revision: 1, component,
    presetRef: { id, revision, catalogRelease, compilerVersion }, props: { ...defaultRecipeFields(fields.props), ...props },
    content: { ...defaultRecipeFields(fields.content), ...content } })
}
const find = (specimen: RecipeSpecimen, tag: string): RecipeSpecimen[] => [
  ...(specimen.tag === tag ? [specimen] : []),
  ...specimen.children.flatMap(child => typeof child === 'string' ? [] : find(child, tag)),
]

describe.each(styleFamilies)('%s editor input recipes', family => {
  it.each(Object.keys(parts) as Id[])('%s compiles deterministically with its parts and no shadowed names', async component => {
    const first = await compileComponentRecipe({ recipe: recipe(component, family) })
    const second = await compileComponentRecipe({ recipe: recipe(component, family) })
    expect(second.artifacts).toEqual(first.artifacts)
    const source = first.artifacts.find(artifact => artifact.logicalPath.endsWith(`/${component}.tsx`))!.content
    for (const name of parts[component]) expect(source).toContain(`function ${name}(`)
    expect(findShadowedNames(source)).toEqual([])
  })
})

describe('editor input specimens', () => {
  const d = (component: Id, props: Record<string, unknown> = {}, content: Record<string, unknown> = {}) =>
    describeComponentRecipe(recipe(component, 'ombelle', props, content) as ComponentRecipe)

  it('draws a labelled number input with its range, unit and hint', () => {
    const specimen = d('number-input')
    const input = find(specimen, 'NumberInput')[0]!
    expect(input.props).toMatchObject({ min: 0, max: 32, step: 1, unit: 'px', defaultValue: 12 })
    expect(find(specimen, 'label')[0]!.children).toEqual(['Border radius'])
    expect(find(specimen, 'label')[0]!.props.htmlFor).toEqual(input.props.id)
    expect(find(specimen, 'p')[0]!.children).toEqual(['Arrow keys step by 1, Shift + arrow by 10.'])
    expect(input.props['aria-describedby']).toEqual(find(specimen, 'p')[0]!.props.id)
    expect(find(d('number-input', { unit: 'none' }), 'NumberInput')[0]!.props.unit).toBeUndefined()
  })

  it('draws a paired picker with swatches and contrast, or one picker', () => {
    const pair = d('color-picker')
    expect(pair.tag).toBe('ColorPickerPair')
    expect(pair.props.label).toBe('Primary')
    const [light, dark] = find(pair, 'ColorPicker')
    expect(light!.props).toMatchObject({ mode: 'light', defaultValue: 'oklch(0.55 0.22 6)', defaultFormat: 'oklch', eyeDropper: true,
      contrastWith: 'oklch(0.99 0 0)', contrastLabel: 'Primary foreground' })
    expect(dark!.props).toMatchObject({ mode: 'dark', defaultValue: 'oklch(0.7 0.18 6)', contrastWith: 'oklch(0.16 0.01 275)' })
    expect((light!.props.swatches as readonly { label: string }[]).map(s => s.label)).toEqual(['Rose', 'Blue', 'Green', 'Amber', 'Ink'])
    const single = d('color-picker', { paired: false, contrast: false, swatches: 8, format: 'hex', eyeDropper: false }, { darkValue: undefined })
    expect(single.tag).toBe('ColorPicker')
    expect(single.props).toMatchObject({ label: 'Primary', defaultFormat: 'hex', eyeDropper: false })
    expect(single.props.contrastWith).toBeUndefined()
    expect((single.props.swatches as readonly unknown[])).toHaveLength(8)
    expect(d('color-picker', { swatches: 0 }).children.every(child => typeof child !== 'string' && child.props.swatches === undefined)).toBe(true)
  })
})
