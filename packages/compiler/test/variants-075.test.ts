import { describe, expect, it } from 'vitest'
import { getCatalog } from '@ombelle/catalog'
import { componentRecipeFields, defaultRecipeFields, styleFamilies, validateComponentRecipe, type ComponentRecipe } from '@ombelle/contracts'
import { compileComponentRecipe, describeComponentRecipe, type RecipeSpecimen } from '../src/index.js'
import defaults from './fixtures/variants-075-default-specimens.json'
import { findShadowedNames } from './recipe-shadowing.js'
import { variants075DefaultSpecimens } from './variants-075-defaults.js'

const catalog = getCatalog('0.1.0')
type Id = 'checkbox' | 'switch' | 'progress' | 'popover' | 'dialog' | 'alert-dialog' | 'breadcrumb'
type Family = (typeof styleFamilies)[number]
const recipe = (component: Id, props: Record<string, unknown> = {}, content: Record<string, unknown> = {}, family: Family = 'ombelle') => {
  const { id, revision, catalogRelease, compilerVersion } = family === 'liquid-glass' ? catalog.startingPresets['builtin-liquid-glass'] : catalog.presets[family]
  return validateComponentRecipe({ schemaVersion: '2.0', id: 'v075_' + component.replace('-', '_'), revision: 1, component,
    presetRef: { id, revision, catalogRelease, compilerVersion }, props,
    content: { ...defaultRecipeFields(componentRecipeFields(component).content), ...content } }) as ComponentRecipe
}
const specimen = (component: Id, props: Record<string, unknown> = {}, content: Record<string, unknown> = {}) =>
  describeComponentRecipe(recipe(component, props, content))
const all = (node: RecipeSpecimen | string): RecipeSpecimen[] => typeof node === 'string' ? [] : [node, ...node.children.flatMap(all)]
const find = (node: RecipeSpecimen, tag: string) => all(node).find(item => item.tag === tag)
const tags = (node: RecipeSpecimen) => all(node).map(item => item.tag)

describe('0.7.5 variant specimens', () => {
  it('keeps every default specimen as it was before the variants', () => {
    expect(variants075DefaultSpecimens()).toEqual(defaults)
  })

  it('lays out a checkbox as a row or a card option with its description', () => {
    const card = specimen('checkbox', { option: 'card', checked: 'checked', disabled: true }, { description: 'Adds sample files' })
    const option = find(card, 'CheckboxOption')!
    expect(option.props).toMatchObject({ appearance: 'card', title: 'Accept terms', description: 'Adds sample files', defaultChecked: true, disabled: true })
    expect(tags(card)).not.toContain('Checkbox')
    expect(find(specimen('checkbox', { option: 'row' }), 'CheckboxOption')!.props).toMatchObject({ appearance: 'row' })
    expect(find(specimen('checkbox', { option: 'row' }), 'CheckboxOption')!.props).not.toHaveProperty('description', expect.anything())
    expect(tags(specimen('checkbox', { option: 'none' }, { description: 'Ignored' }))).not.toContain('CheckboxOption')
  })

  it('sizes a switch', () => {
    expect(find(specimen('switch', { size: 'sm' }), 'Switch')!.props).toMatchObject({ size: 'sm' })
    expect(find(specimen('switch', { size: 'default' }), 'Switch')!.props).not.toHaveProperty('size', expect.anything())
  })

  it('gives a progress bar its size, tone, label and value', () => {
    const bar = specimen('progress', { size: 'lg', tone: 'success', showLabel: true, showValue: true })
    expect(bar.props).toMatchObject({ size: 'lg', tone: 'success' })
    expect(bar.props).not.toHaveProperty('aria-label')
    expect(find(bar, 'ProgressLabel')!.children).toEqual(['Upload progress'])
    expect(tags(bar)).toContain('ProgressValue')
    const plain = specimen('progress', { size: 'default', tone: 'default', showLabel: false, showValue: false })
    expect(plain.props).toMatchObject({ 'aria-label': 'Upload progress' })
    expect(plain.props).not.toHaveProperty('size', expect.anything())
    expect(plain.props).not.toHaveProperty('tone', expect.anything())
    expect(tags(specimen('progress', { showValue: true }))).not.toContain('ProgressLabel')
  })

  it('adds an arrow to a popover, passing no unknown prop', () => {
    const popover = specimen('popover', { arrow: true })
    const content = find(popover, 'PopoverContent')!
    expect(content.props).not.toHaveProperty('arrow')
    expect(content.children.some(child => typeof child !== 'string' && child.tag === 'PopoverArrow')).toBe(true)
    expect(tags(specimen('popover', { arrow: false }))).not.toContain('PopoverArrow')
  })

  describe.each(styleFamilies)('%s', family => {
    it.each([
      ['checkbox', { option: 'card' }, { description: 'Adds sample files' }, ['Checkbox', 'CheckboxOption']],
      ['switch', { size: 'sm' }, {}, ['Switch']],
      ['progress', { size: 'sm', tone: 'warning', showLabel: true, showValue: true }, {}, ['Progress', 'ProgressLabel', 'ProgressValue']],
      ['popover', { arrow: true }, {}, ['PopoverArrow', 'PopoverContent']],
    ] as const)('compiles a %s variant recipe deterministically with its parts', async (component, props, content, parts) => {
      const first = await compileComponentRecipe({ recipe: recipe(component, props, content, family) })
      const second = await compileComponentRecipe({ recipe: recipe(component, props, content, family) })
      expect(second.artifacts).toEqual(first.artifacts)
      const source = first.artifacts.find(artifact => artifact.logicalPath.endsWith(`/${component}.tsx`))!.content
      for (const name of parts) expect(source).toContain(`function ${name}(`)
      expect(findShadowedNames(source)).toEqual([])
    })
  })
})
