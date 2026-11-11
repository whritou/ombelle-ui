import { describe, expect, it } from 'vitest'
import { getCatalog } from '@ombelle/catalog'
import { componentRecipeFields, defaultRecipeFields, styleFamilies, validateComponentRecipe, type ComponentRecipe } from '@ombelle/contracts'
import { compileComponentRecipe, describeComponentRecipe } from '../src/index.js'
import { findShadowedNames } from './recipe-shadowing.js'

const parts = {
  spinner: ['Spinner'], kbd: ['Kbd', 'KbdGroup'], empty: ['Empty', 'EmptyContent', 'EmptyDescription', 'EmptyHeader', 'EmptyMedia', 'EmptyTitle'],
  field: ['Field', 'FieldControl', 'FieldDescription', 'FieldError', 'FieldLabel'], meter: ['Meter', 'MeterLabel', 'MeterValue'],
  stepper: ['Stepper', 'StepperDescription', 'StepperIndicator', 'StepperItem', 'StepperSeparator', 'StepperTitle'],
} as const
type Id = keyof typeof parts
const catalog = getCatalog('0.1.0')
const recipe = (component: Id, family: (typeof styleFamilies)[number], props: Record<string, unknown> = {}) => {
  const { id, revision, catalogRelease, compilerVersion } = family === 'liquid-glass' ? catalog.startingPresets['builtin-liquid-glass'] : catalog.presets[family]
  return validateComponentRecipe({ schemaVersion: '2.0', id: `display_${component}`, revision: 1, component,
    presetRef: { id, revision, catalogRelease, compilerVersion }, props, content: defaultRecipeFields(componentRecipeFields(component).content) })
}
const exports = (specimen: ReturnType<typeof describeComponentRecipe>): string[] => {
  const names = new Set<string>()
  const visit = (node: typeof specimen) => { if (/^[A-Z]/.test(node.tag)) names.add(node.tag); node.children.forEach(child => typeof child !== 'string' && visit(child)) }
  visit(specimen)
  return [...names].sort()
}

describe.each(styleFamilies)('%s display recipes', family => {
  it.each(Object.keys(parts) as Id[])('%s compiles deterministically with its parts and no shadowed names', async component => {
    const first = await compileComponentRecipe({ recipe: recipe(component, family) })
    const second = await compileComponentRecipe({ recipe: recipe(component, family) })
    expect(second.artifacts).toEqual(first.artifacts)
    const source = first.artifacts.find(artifact => artifact.logicalPath.endsWith(`/${component}.tsx`))!.content
    for (const name of parts[component]) expect(source).toContain(`function ${name}(`)
    expect(findShadowedNames(source)).toEqual([])
  })
})

describe('display specimens', () => {
  const describe_ = (component: Id, props: Record<string, unknown> = {}) => describeComponentRecipe(recipe(component, 'ombelle', props) as ComponentRecipe)
  it('describes each recipe with the parts the board shows', () => {
    expect(exports(describe_('meter'))).toEqual(['Meter', 'MeterLabel', 'MeterValue'])
    expect(exports(describe_('meter', { mode: 'labelled' }))).toEqual(['Meter', 'MeterLabel', 'MeterLegend', 'MeterLegendItem', 'MeterSegment', 'MeterValue'])
    expect(exports(describe_('stepper'))).toEqual([...parts.stepper].sort())
    expect(exports(describe_('field'))).toEqual([...parts.field].sort())
    expect(exports(describe_('empty', { media: 'none' }))).not.toContain('EmptyMedia')
  })

  it('passes the warning threshold as a fraction and marks the current step', () => {
    const meter = describe_('meter')
    expect(meter.props).toMatchObject({ value: 128, max: 200, segments: 10, warningAt: 0.6 })
    const items = describe_('stepper').children.filter(child => typeof child !== 'string' && child.tag === 'StepperItem')
    expect(items.map(item => typeof item !== 'string' && item.props.status)).toEqual(['complete', 'current', 'upcoming'])
  })
})
