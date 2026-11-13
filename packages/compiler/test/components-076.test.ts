import { describe, expect, it } from 'vitest'
import { getCatalog } from '@ombelle/catalog'
import { componentRecipeFields, defaultRecipeFields, styleFamilies, validateComponentRecipe, type ComponentRecipe } from '@ombelle/contracts'
import { compileComponentRecipe, describeComponentRecipe, type RecipeSpecimen } from '../src/index.js'
import defaults from './fixtures/components-076-default-specimens.json'
import { components076DefaultSpecimens } from './components-076-defaults.js'
import { findShadowedNames } from './recipe-shadowing.js'

const catalog = getCatalog('0.1.0')
type Id = 'password-field' | 'carousel' | 'aspect-ratio' | 'toolbar' | 'field' | 'checkbox'
type Family = (typeof styleFamilies)[number]
const recipe = (component: Id, props: Record<string, unknown> = {}, content: Record<string, unknown> = {}, family: Family = 'ombelle') => {
  const { id, revision, catalogRelease, compilerVersion } = family === 'liquid-glass' ? catalog.startingPresets['builtin-liquid-glass'] : catalog.presets[family]
  const fields = componentRecipeFields(component)
  return validateComponentRecipe({ schemaVersion: '2.0', id: 'c076_' + component.replace('-', '_'), revision: 1, component,
    presetRef: { id, revision, catalogRelease, compilerVersion },
    props: { ...defaultRecipeFields(fields.props), ...props },
    content: { ...defaultRecipeFields(fields.content), ...content } }) as ComponentRecipe
}
const specimen = (component: Id, props: Record<string, unknown> = {}, content: Record<string, unknown> = {}) =>
  describeComponentRecipe(recipe(component, props, content))
const all = (node: RecipeSpecimen | string): RecipeSpecimen[] => typeof node === 'string' ? [] : [node, ...node.children.flatMap(all)]
const find = (node: RecipeSpecimen, tag: string) => all(node).find(item => item.tag === tag)
const count = (node: RecipeSpecimen, tag: string) => all(node).filter(item => item.tag === tag).length

const drafts: readonly [Id, Record<string, unknown>, Record<string, unknown>, readonly string[]][] = [
  ['password-field', {}, {}, ['PasswordField', 'PasswordFieldControl', 'PasswordFieldInput', 'PasswordFieldToggle', 'PasswordFieldCapsLock', 'PasswordFieldStrength']],
  ['carousel', {}, {}, ['Carousel', 'CarouselContent', 'CarouselItem', 'CarouselPrevious', 'CarouselNext', 'CarouselDots', 'CarouselCounter']],
  ['aspect-ratio', {}, {}, ['AspectRatio']],
  ['toolbar', {}, {}, ['Toolbar', 'ToolbarToggleGroup', 'ToolbarToggleItem', 'ToolbarButton', 'ToolbarOverflow']],
  ['field', { form: 'summary', fieldset: 'default' }, { legend: 'Save preset', fields: ['Preset name', 'Radius'] }, ['Form', 'FormErrorSummary', 'FieldSet', 'FieldLegend']],
  ['checkbox', { group: 'parent' }, { legend: 'Overlays to install', options: ['Dialog', 'Popover', 'Sheet', 'Tooltip'] }, ['CheckboxGroup', 'CheckboxGroupParent', 'CheckboxGroupCount']],
]

describe('0.7.6 component specimens', () => {
  it('keeps the default Field and Checkbox specimens as they were before the parts', () => {
    expect(components076DefaultSpecimens()).toEqual(defaults)
  })

  describe.each(styleFamilies)('%s', family => {
    it.each(drafts)('compiles a %s recipe %o deterministically with its parts', async (component, props, content, parts) => {
      const first = await compileComponentRecipe({ recipe: recipe(component, props, content, family) })
      const second = await compileComponentRecipe({ recipe: recipe(component, props, content, family) })
      expect(second.artifacts).toEqual(first.artifacts)
      const source = first.artifacts.find(artifact => artifact.logicalPath.endsWith(`/${component}.tsx`))!.content
      for (const name of parts) expect(source).toContain(`function ${name}(`)
      expect(findShadowedNames(source)).toEqual([])
    })
  })

  it('draws a password field with the three checks, the Caps Lock notice and an optional confirm field', () => {
    const plain = specimen('password-field')
    expect(find(plain, 'PasswordFieldStrength')?.props.checks).toEqual([
      { label: 'at least 12 characters', match: '^.{12,}$' }, { label: 'a number', match: '\\d' }, { label: 'add a symbol', match: '[^A-Za-z0-9]' },
    ])
    expect(count(plain, 'PasswordFieldCapsLock')).toBe(1)
    expect(count(plain, 'PasswordField')).toBe(1)
    const confirm = specimen('password-field', { confirm: true, strength: false, capsLockNotice: false })
    expect(count(confirm, 'PasswordField')).toBe(2)
    expect(count(confirm, 'PasswordFieldStrength')).toBe(0)
    expect(count(confirm, 'PasswordFieldCapsLock')).toBe(0)
  })

  it('draws one carousel slide per entry, named by the label', () => {
    const carousel = specimen('carousel', { dots: false, counter: true, slidesPerView: 2 })
    expect(carousel.props).toMatchObject({ 'aria-label': 'UI kits', slidesPerView: 2 })
    expect(count(carousel, 'CarouselItem')).toBe(5)
    expect(count(carousel, 'CarouselDots')).toBe(0)
    expect(count(carousel, 'CarouselCounter')).toBe(1)
  })

  it('reads the aspect ratio from its enum', () => {
    expect(specimen('aspect-ratio', { ratio: '4/3' }).props.ratio).toBeCloseTo(4 / 3)
    expect(specimen('aspect-ratio').props.ratio).toBeCloseTo(16 / 9)
  })

  it('groups the toolbar toggles as asked', () => {
    const single = specimen('toolbar')
    expect(find(single, 'ToolbarToggleGroup')?.props.type).toBe('single')
    expect(count(single, 'ToolbarToggleItem')).toBe(2)
    expect(count(single, 'ToolbarButton')).toBe(2)
    expect(count(single, 'ToolbarOverflow')).toBe(1)
    const multiple = specimen('toolbar', { toggles: 'multiple', overflow: false })
    expect(count(multiple, 'ToolbarToggleItem')).toBe(3)
    expect(count(multiple, 'ToolbarOverflow')).toBe(0)
    expect(count(specimen('toolbar', { toggles: 'none' }), 'ToolbarToggleItem')).toBe(0)
  })

  it('draws a Field form with two errors and a disabled fieldset, and a Checkbox group half checked', () => {
    const form = specimen('field', { form: 'summary', fieldset: 'disabled' }, { legend: 'Save preset', fields: ['Preset name', 'Radius', 'Description'] })
    expect(form.tag).toBe('Form')
    expect(form.props.summaryAction).toBe('saving')
    expect(form.props.errors).toEqual({ 'field-1': 'Enter a value.', 'field-2': 'Enter a value.' })
    expect(find(form, 'FieldSet')?.props.disabled).toBe(true)
    expect(count(form, 'Field')).toBe(3)
    const group = specimen('checkbox', { group: 'parent' }, { legend: 'Overlays', options: ['Dialog', 'Popover', 'Sheet', 'Tooltip'] })
    expect(find(group, 'CheckboxGroup')?.props.defaultValue).toEqual(['option-1', 'option-2'])
    expect(count(group, 'CheckboxOption')).toBe(4)
    expect(find(group, 'CheckboxGroupParent')?.props.title).toBe('All')
  })
})
