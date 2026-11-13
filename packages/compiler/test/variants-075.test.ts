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

  it('sizes a dialog and gives it a scrolling body and a footer, passing no unknown prop', () => {
    const dialog = specimen('dialog', { size: 'lg', scrollingBody: true, footer: true })
    const content = find(dialog, 'DialogContent')!
    expect(content.props).toMatchObject({ size: 'lg' })
    expect(content.props).not.toHaveProperty('footer')
    expect(find(dialog, 'DialogBody')!.children.filter(child => typeof child !== 'string')).toHaveLength(8)
    const footer = find(dialog, 'DialogFooter')!
    expect(all(footer).find(item => item.tag === 'DialogClose')!.children).toContain('Cancel')
    expect(all(footer).some(item => item.children.includes('Save changes'))).toBe(true)
    const plain = specimen('dialog', { size: 'default', scrollingBody: false, footer: false })
    expect(tags(plain)).not.toEqual(expect.arrayContaining(['DialogBody']))
    expect(tags(plain)).not.toContain('DialogFooter')
    expect(find(plain, 'DialogContent')!.props).not.toHaveProperty('size', expect.anything())
  })

  it('adds media and a typed confirmation to an alert dialog', () => {
    const alert = specimen('alert-dialog', { media: 'destructive' }, { confirmText: 'ombelle-site' })
    const header = find(alert, 'AlertDialogHeader')!
    expect((header.children[0] as RecipeSpecimen).tag).toBe('AlertDialogMedia')
    expect((header.children[0] as RecipeSpecimen).props).toMatchObject({ tone: 'destructive' })
    expect(find(alert, 'AlertDialogConfirmInput')!.props).toMatchObject({ expected: 'ombelle-site' })
    expect(tags(specimen('alert-dialog', { media: 'none' }, { confirmText: '' }))).not.toEqual(expect.arrayContaining(['AlertDialogMedia']))
    expect(tags(specimen('alert-dialog', {}, { confirmText: '' }))).not.toContain('AlertDialogConfirmInput')
  })

  it('collapses a breadcrumb', () => {
    expect(find(specimen('breadcrumb', { collapse: 'auto' }), 'Breadcrumb')!.props).toMatchObject({ collapse: 'auto' })
    expect(find(specimen('breadcrumb', { collapse: 'none' }), 'Breadcrumb')!.props).not.toHaveProperty('collapse', expect.anything())
  })

  describe.each(styleFamilies)('%s', family => {
    it.each([
      ['checkbox', { option: 'card' }, { description: 'Adds sample files' }, ['Checkbox', 'CheckboxOption']],
      ['switch', { size: 'sm' }, {}, ['Switch']],
      ['progress', { size: 'sm', tone: 'warning', showLabel: true, showValue: true }, {}, ['Progress', 'ProgressLabel', 'ProgressValue']],
      ['popover', { arrow: true }, {}, ['PopoverArrow', 'PopoverContent']],
      ['dialog', { size: 'fullscreen', scrollingBody: true, footer: true }, {}, ['DialogBody', 'DialogFooter', 'DialogContent']],
      ['alert-dialog', { media: 'default' }, { confirmText: 'delete' }, ['AlertDialogMedia', 'AlertDialogConfirmInput', 'AlertDialogAction']],
      ['breadcrumb', { collapse: 'auto' }, {}, ['Breadcrumb', 'BreadcrumbList', 'BreadcrumbEllipsis']],
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
