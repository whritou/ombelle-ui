import { expect, it } from 'vitest'
import { getCatalog, getTemplate, componentEditions } from '@ombelle/catalog'
import { styleFamilies, validateComponentRecipe, validatePreset } from '@ombelle/contracts'
import badge from '../../../examples/component-recipe.badge.json'
import { compile, compileComponentRecipe } from '../src/index.js'
import { describeComponentRecipe } from '../src/recipe-specimen.js'
import { catalogRecipeFixtures } from '../../../tests/helpers/catalog-recipe-fixtures.js'

const ids = ['input-group', 'sheet', 'alert-dialog', 'breadcrumb', 'pagination', 'toast'] as const

it.each([
  ['inline-start', ['InputGroupAddon', 'InputGroupInput']],
  ['block-start', ['InputGroupAddon', 'InputGroupInput']],
  ['inline-end', ['InputGroupInput', 'InputGroupAddon']],
  ['block-end', ['InputGroupInput', 'InputGroupAddon']],
] as const)('keeps %s actions in visual reading order in exported Input Groups', (align, expected) => {
  const recipe = catalogRecipeFixtures().find(item => item.component === 'input-group')!
  const specimen = describeComponentRecipe(validateComponentRecipe({ ...recipe,
    props: { ...recipe.props, align }, content: { ...recipe.content, action: 'Check' } }))
  const group = specimen.children[1]
  expect(typeof group).toBe('object')
  if (typeof group === 'string') throw new Error('Expected composed group')
  expect(group.children.map(child => typeof child === 'string' ? child : child.tag)).toEqual(expected)
})

it.each(ids)('compiles standalone %s in every family and edition', async id => {
  const catalog = getCatalog('0.1.0')
  expect(componentEditions(id)).toEqual(['radix', 'base'])
  for (const edition of ['radix', 'base'] as const) {
    for (const family of styleFamilies) {
      const input = { preset: catalog.presets[family], componentIds: [id], edition,
        catalogRelease: '0.1.0', compilerVersion: '0.1.0' }
      const result = await compile(input)
      expect(await compile(input)).toEqual(result)
      const source = result.artifacts.find(a => a.logicalPath === `components/ui/${id}.tsx`)!.content
      const css = result.artifacts.find(a => a.logicalPath === `components/ui/${id}.css`)!.content
      expect(source).toContain(`import './${id}.css'`)
      expect(source).not.toContain(edition === 'base' ? '@radix-ui/' : '@base-ui/')
      expect(css).toContain('forced-colors: active')
      expect(result.artifacts.find(a => a.logicalPath === `examples/${id}.tsx`)!.content)
        .toContain(`from '@/components/ui/${id}'`)
      expect(result.dependencies).toEqual([...getTemplate(catalog, id, edition).dependencies].sort((a, b) => a.name.localeCompare(b.name)))
    }
  }
})

it('accepts optional semantic status pairs without changing older presets', async () => {
  const preset = structuredClone(getCatalog('0.1.0').presets.flat)
  expect(validatePreset(preset)).toEqual(preset)
  const custom = validatePreset({ ...preset, modes: { ...preset.modes, light: { ...preset.modes.light,
    success: '#166534', successForeground: '#ffffff', warning: '#fef3c7', warningForeground: '#78350f', info: '#1e40af', infoForeground: '#ffffff',
  } } })
  const result = await compile({ preset: custom, componentIds: ['alert'], catalogRelease: '0.1.0', compilerVersion: '0.1.0' })
  const tokens = result.artifacts.find(a => a.logicalPath === 'styles/ui-tokens.css')!.content
  expect(tokens).toContain('--success: #166534')
  expect(tokens).toContain('--warning-foreground: #78350f')
})

it.each([
  ['card', { appearance: 'outlined', density: 'dense' }, { title: 'Project', description: '', body: '' }, 'appearance={"outlined"}'],
  ['badge', { size: 'sm', dot: true }, { label: 'Active' }, 'BadgeDot'],
  ['table', { density: 'compact', striped: true }, { caption: 'Projects', columns: [{ id: 'name', label: 'Name' }], rows: [{ id: 'one', cells: ['First'] }] }, 'striped={true}'],
  ['alert', { variant: 'success' }, { title: 'Saved', description: 'Ready.' }, 'variant={"success"}'],
] as const)('exports %s additions in component recipes', async (component, props, content, marker) => {
  const result = await compileComponentRecipe({ recipe: { ...badge, component, props, content } })
  expect(result.artifacts.find(a => a.logicalPath.endsWith(`/${component}.tsx`))!.content.replaceAll("'", '"')).toContain(marker)
})

it('validates and exports underline Tabs appearance through recipes', async () => {
  const recipe = validateComponentRecipe({ ...badge, component: 'tabs',
    props: { selection: 'overview', orientation: 'vertical', appearance: 'underline' },
    content: { items: [{ id: 'overview', label: 'Overview', body: 'Current projects.' }] } })
  const result = await compileComponentRecipe({ recipe })
  const source = result.artifacts.find(a => a.logicalPath.endsWith('/tabs.tsx'))!.content
  expect(source.replaceAll("'", '"')).toContain('appearance={"underline"}')
  expect(source.replaceAll("'", '"')).toContain('orientation={"vertical"}')
  expect(() => validateComponentRecipe({ ...recipe, props: { ...recipe.props, appearance: 'unknown' } })).toThrow()
})
