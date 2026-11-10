import { describe, expect, it } from 'vitest'
import { getCatalog } from '@ombelle/catalog'
import { componentRecipeFields, defaultRecipeFields, styleFamilies, validateComponentRecipe, type ComponentRecipe } from '@ombelle/contracts'
import { compileComponentRecipe, describeComponentRecipe } from '../src/index.js'
import { findShadowedNames } from './recipe-shadowing.js'

const catalog = getCatalog('0.1.0')
const recipe = (family: (typeof styleFamilies)[number], props: Record<string, unknown> = {}) => {
  const { id, revision, catalogRelease, compilerVersion } = family === 'liquid-glass' ? catalog.startingPresets['builtin-liquid-glass'] : catalog.presets[family]
  return validateComponentRecipe({ schemaVersion: '2.0', id: 'dates_calendar', revision: 1, component: 'calendar',
    presetRef: { id, revision, catalogRelease, compilerVersion }, props, content: defaultRecipeFields(componentRecipeFields('calendar').content) })
}

describe.each(styleFamilies)('%s calendar recipe', family => {
  it('compiles deterministically with both parts and no shadowed names', async () => {
    const first = await compileComponentRecipe({ recipe: recipe(family) })
    const second = await compileComponentRecipe({ recipe: recipe(family) })
    expect(second.artifacts).toEqual(first.artifacts)
    const source = first.artifacts.find(artifact => artifact.logicalPath.endsWith('/calendar.tsx'))!.content
    for (const name of ['Calendar', 'DatePicker']) expect(source).toContain(`function ${name}(`)
    expect(findShadowedNames(source)).toEqual([])
  })
})

describe('calendar specimen', () => {
  const specimen = (props: Record<string, unknown> = {}) => describeComponentRecipe(recipe('ombelle', props) as ComponentRecipe)

  it('draws November 2026 with the 12th chosen', () => {
    expect(specimen()).toMatchObject({ tag: 'Calendar', props: { mode: 'single', defaultMonth: '2026-11-01', selected: '2026-11-12', weekStartsOn: 0, 'aria-label': 'Pick a date' } })
    // The installed component keeps the real today, so disablePast keeps working after 2026.
    expect(specimen().props).not.toHaveProperty('today')
  })

  it('draws a range, ending on the 18th unless told otherwise', () => {
    expect(specimen({ mode: 'range' }).props).toMatchObject({ mode: 'range', selected: { from: '2026-11-12', to: '2026-11-18' } })
    expect(specimen({ mode: 'range', selectedTo: '2026-11-20' }).props).toMatchObject({ selected: { from: '2026-11-12', to: '2026-11-20' } })
  })

  it('draws a closed date picker and passes the calendar options through', () => {
    const picker = specimen({ mode: 'picker', disablePast: true, weekStartsOn: 1 })
    expect(picker.tag).toBe('DatePicker')
    expect(picker.props).toMatchObject({ defaultValue: '2026-11-12', placeholder: 'Choose a date', 'aria-label': 'Pick a date' })
    expect(picker.props.calendar).toEqual({ defaultMonth: '2026-11-01', weekStartsOn: 1, disablePast: true })
  })
})
