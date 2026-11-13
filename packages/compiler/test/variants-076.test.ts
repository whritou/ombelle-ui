import { describe, expect, it } from 'vitest'
import { getCatalog } from '@ombelle/catalog'
import { componentRecipeFields, defaultRecipeFields, styleFamilies, validateComponentRecipe, type ComponentRecipe } from '@ombelle/contracts'
import { compileComponentRecipe, describeComponentRecipe, type RecipeSpecimen } from '../src/index.js'
import { renderRecipeSpecimen } from '../src/recipe-specimen.js'
import defaults from './fixtures/variants-076-default-specimens.json'
import { checkGeneratedTypes } from '../../../tests/helpers/generated-types.js'
import { findShadowedNames } from './recipe-shadowing.js'
import { variants076DefaultSpecimens } from './variants-076-defaults.js'

const catalog = getCatalog('0.1.0')
type Id = 'sheet' | 'card' | 'slider' | 'progress' | 'meter' | 'code-block' | 'tooltip'
type Family = (typeof styleFamilies)[number]
const recipe = (component: Id, props: Record<string, unknown> = {}, content: Record<string, unknown> = {}, family: Family = 'ombelle') => {
  const { id, revision, catalogRelease, compilerVersion } = family === 'liquid-glass' ? catalog.startingPresets['builtin-liquid-glass'] : catalog.presets[family]
  return validateComponentRecipe({ schemaVersion: '2.0', id: 'v076_' + component.replace('-', '_'), revision: 1, component,
    presetRef: { id, revision, catalogRelease, compilerVersion }, props,
    content: { ...defaultRecipeFields(componentRecipeFields(component).content), ...content } }) as ComponentRecipe
}
const specimen = (component: Id, props: Record<string, unknown> = {}, content: Record<string, unknown> = {}) =>
  describeComponentRecipe(recipe(component, props, content))
const all = (node: RecipeSpecimen | string): RecipeSpecimen[] => typeof node === 'string' ? [] : [node, ...node.children.flatMap(all)]
const find = (node: RecipeSpecimen, tag: string) => all(node).find(item => item.tag === tag)
const tags = (node: RecipeSpecimen) => all(node).map(item => item.tag)
// The board's diff, as in apps/preview projects.tsx, the preset gallery and the audit: context lines start with a space.
const boardDiff = ' :root {\n-  --radius: 0.5rem;\n+  --radius: 0.75rem;\n+  --shadow-offset: 3px;\n }\n'

const variantRecipes = [
  ['sheet', { side: 'bottom', handle: true, snapPoints: 'half-full' }, {}, ['SheetContent', 'SheetHandle']],
  ['sheet', { side: 'bottom', snapPoints: 'third-half-full' }, {}, ['SheetContent']],
  ['card', { action: true }, {}, ['CardAction']],
  ['card', { action: true, density: 'dense' }, {}, ['CardAction']],
  ['slider', { valueDisplay: 'readout' }, {}, ['Slider', 'SliderValue']],
  ['slider', { valueDisplay: 'editable', ticks: true }, {}, ['Slider', 'SliderValue', 'SliderTicks']],
  ['slider', { mode: 'range', valueDisplay: 'readout' }, {}, ['Slider', 'SliderValue']],
  ['progress', { shape: 'circle', size: 'lg', showValue: true }, {}, ['Progress', 'ProgressValue']],
  ['progress', { shape: 'circle', size: 'sm' }, {}, ['Progress']],
  ['meter', { shape: 'circle' }, {}, ['Meter']],
  ['code-block', { diff: true }, { code: boardDiff, title: 'ui-style.css' }, ['CodeBlock', 'diffLines']],
  ['tooltip', {}, { shortcut: 'Ctrl+Z' }, ['TooltipShortcut', 'TooltipContent']],
] as const

describe('0.7.6 variant specimens', () => {
  it('keeps every default specimen as it was before the variants', () => {
    expect(variants076DefaultSpecimens()).toEqual(defaults)
  })

  it('gives a bottom sheet its snap points', () => {
    expect(find(specimen('sheet', { side: 'bottom', handle: true, snapPoints: 'half-full' }), 'SheetContent')!.props)
      .toMatchObject({ snapPoints: [0.5, 0.9] })
    expect(find(specimen('sheet', { side: 'bottom', snapPoints: 'third-half-full' }), 'SheetContent')!.props)
      .toMatchObject({ snapPoints: [0.33, 0.5, 0.9] })
    expect(find(specimen('sheet', { side: 'bottom', snapPoints: 'none' }), 'SheetContent')!.props).not.toHaveProperty('snapPoints')
    expect(find(specimen('sheet', { side: 'bottom' }), 'SheetContent')!.props).not.toHaveProperty('snapPoints')
  })

  it('adds a named action button at the end of a card header', () => {
    const card = specimen('card', { action: true })
    const header = find(card, 'CardHeader')!
    const action = header.children.at(-1) as RecipeSpecimen
    expect(action.tag).toBe('CardAction')
    const button = action.children[0] as RecipeSpecimen
    expect(button).toMatchObject({ tag: 'button', props: { type: 'button', 'aria-label': 'More actions for Project' } })
    expect(button.children).toEqual([{ tag: 'span', props: { 'aria-hidden': 'true' }, children: ['⋯'] }])
    expect(tags(specimen('card', { action: false }))).not.toContain('CardAction')
  })

  it('shows a slider value beside a label, readout or editable', () => {
    const readout = specimen('slider', { valueDisplay: 'readout' })
    const slider = find(readout, 'Slider')!
    expect(slider.props).not.toHaveProperty('aria-label')
    expect(slider.props['aria-labelledby']).toEqual({ localId: '-label' })
    const [label, value] = slider.children as RecipeSpecimen[]
    expect(label).toMatchObject({ tag: 'span', props: { id: { localId: '-label' } }, children: ['Border radius'] })
    expect(value.tag).toBe('SliderValue')
    expect(value.props).not.toHaveProperty('editable', expect.anything())
    expect(find(specimen('slider', { valueDisplay: 'editable' }), 'SliderValue')!.props).toMatchObject({ editable: true })
    expect(tags(specimen('slider', { valueDisplay: 'none' }))).not.toContain('SliderValue')
    expect(find(specimen('slider', { valueDisplay: 'none' }), 'Slider')!.props).toHaveProperty('aria-label', 'Border radius')
  })

  it('keeps a range slider\'s thumb labels with a readout and adds no label', () => {
    const slider = find(specimen('slider', { mode: 'range', valueDisplay: 'readout' }), 'Slider')!
    expect(slider.props).toMatchObject({ thumbLabels: ['Minimum price', 'Maximum price'] })
    expect(slider.props).not.toHaveProperty('aria-labelledby')
    expect(slider.children.map(child => (child as RecipeSpecimen).tag)).toEqual(['SliderValue'])
  })

  it('draws progress and meter as rings', () => {
    expect(specimen('progress', { shape: 'circle', size: 'lg', showValue: true }).props).toMatchObject({ shape: 'circle', size: 'lg' })
    expect(specimen('progress', { shape: 'bar' }).props).not.toHaveProperty('shape', expect.anything())
    expect(specimen('meter', { shape: 'circle' }).props).toMatchObject({ shape: 'circle' })
    expect(specimen('meter', { shape: 'bar' }).props).not.toHaveProperty('shape', expect.anything())
    expect(specimen('meter', { mode: 'labelled', shape: 'circle' }).props).toMatchObject({ shape: 'circle' })
  })

  it('shows a code block diff', () => {
    expect(specimen('code-block', { diff: true }, { code: boardDiff }).props).toMatchObject({ diff: true, code: boardDiff })
    expect(specimen('code-block', { diff: false }).props).not.toHaveProperty('diff', expect.anything())
  })

  it('adds a tooltip shortcut and announces it once on the trigger', () => {
    const tooltip = specimen('tooltip', {}, { shortcut: 'Ctrl+Z' })
    const content = find(tooltip, 'TooltipContent')!
    expect(content.props).not.toHaveProperty('shortcut')
    expect(content.children[0]).toBe('View project details')
    expect(content.children[1]).toEqual({ tag: 'TooltipShortcut', props: { keys: ['Ctrl', 'Z'] }, children: [] })
    expect(find(tooltip, 'TooltipTrigger')!.props).toMatchObject({ 'aria-keyshortcuts': 'Control+Z' })
    expect(find(specimen('tooltip', {}, { shortcut: '⌘+Shift+k' }), 'TooltipTrigger')!.props)
      .toMatchObject({ 'aria-keyshortcuts': 'Meta+Shift+K' })
    const plain = specimen('tooltip', {}, { shortcut: '' })
    expect(tags(plain)).not.toContain('TooltipShortcut')
    expect(find(plain, 'TooltipTrigger')!.props).not.toHaveProperty('aria-keyshortcuts')
  })

  describe.each(styleFamilies)('%s', family => {
    it.each(variantRecipes)('compiles a %s variant recipe %j deterministically with its parts', async (component, props, content, parts) => {
      const first = await compileComponentRecipe({ recipe: recipe(component, props, content, family) })
      const second = await compileComponentRecipe({ recipe: recipe(component, props, content, family) })
      expect(second.artifacts).toEqual(first.artifacts)
      const source = first.artifacts.find(artifact => artifact.logicalPath.endsWith(`/${component}.tsx`))!.content
      for (const name of parts) expect(source).toContain(`function ${name}(`)
      expect(findShadowedNames(source)).toEqual([])
      expect(renderRecipeSpecimen(describeComponentRecipe(recipe(component, props, content, family)))).not.toContain('shortcut=')
    })
  })

  it('typechecks every variant recipe with create-vite unused-binding checks', async () => {
    const results = await Promise.all(variantRecipes.map(([component, props, content], index) =>
      compileComponentRecipe({ recipe: { ...recipe(component, props, content), id: `v076_variant_${index}` } })))
    const checked = await checkGeneratedTypes(results.flatMap(result => result.artifacts))
    expect(checked.code, checked.output).toBe(0)
  }, 180000)
})
