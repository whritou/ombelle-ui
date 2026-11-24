import { expect, it } from 'vitest'
import { compareCliVersions, minimumCliForPreset, minimumCliForRecipe, minimumCliTable } from '../src/index.js'
import flat from '../../catalog/src/presets/flat.json'
import papier from '../../catalog/src/presets/papier.json'
import recipe from '../../../examples/recipe.example.json'

// PUB-05: one table of the first CLI that reads each document feature, for the site and other tools.
it('names the first CLI for preset features', () => {
  expect(minimumCliForPreset(flat)).toEqual({ version: '0.1.0', feature: 'preset' })
  expect(minimumCliForPreset(papier)).toEqual({ version: '0.8.0', feature: 'styleFamily papier' })
  expect(minimumCliForPreset({ ...flat, styleFamily: 'retro-futurism' }).version).toBe('0.8.2')
  expect(minimumCliForPreset({ ...flat, schemaVersion: '1.1' })).toEqual({ version: '0.7.8', feature: 'schemaVersion 1.1 (font pairs)' })
  expect(minimumCliForPreset({ ...flat, modes: { light: { success: '#00aa00' } } }).version).toBe('0.7.2')
  expect(minimumCliForPreset({ ...flat, styleFamily: 'liquid-glass', design: { glassHalo: 0 } }).version).toBe('0.5.0')
  // The highest requirement wins.
  expect(minimumCliForPreset({ ...papier, schemaVersion: '1.1' }).version).toBe('0.8.0')
})
it('names the first CLI for Button and component recipe features', () => {
  expect(minimumCliForRecipe(recipe).version).toBe('0.1.0')
  expect(minimumCliForRecipe({ ...recipe, props: { variant: 'link-destructive' } }).version).toBe('0.7.3')
  expect(minimumCliForRecipe({ ...recipe, overrides: { fontFamilyId: 'inter' } })).toEqual({ version: '0.8.0', feature: 'overrides.fontFamilyId' })
  const component = (id: string, props = {}, content = {}) => ({ schemaVersion: '2.0', component: id, props, content })
  expect(minimumCliForRecipe(component('badge'))).toEqual({ version: '0.6.0', feature: 'component recipe' })
  expect(minimumCliForRecipe(component('sidebar'))).toEqual({ version: '0.9.0', feature: 'component sidebar' })
  expect(minimumCliForRecipe(component('badge', { size: 'sm' })).version).toBe('0.7.2')
  expect(minimumCliForRecipe(component('badge', { variant: 'success' })).version).toBe('0.7.3')
  expect(minimumCliForRecipe(component('dialog', {}, { footer: 'x' })).version).toBe('0.7.5')
  expect(minimumCliForRecipe(component('tabs', { counts: true })).version).toBe('0.7.3')
  expect(minimumCliForRecipe(component('meter', { shape: 'circle' })).version).toBe('0.7.6')
  expect(minimumCliForRecipe({ ...component('card'), appearance: { fonts: {} } }).version).toBe('0.8.0')
})
it('keeps every version in the table a valid x.y.z', () => {
  const versions: string[] = []
  const walk = (value: unknown) => {
    if (typeof value === 'string' && /^\d/.test(value)) versions.push(value)
    else if (value && typeof value === 'object') Object.values(value).forEach(walk)
  }
  walk(minimumCliTable)
  expect(versions.length).toBeGreaterThan(40)
  for (const version of versions) expect(() => compareCliVersions(version, '0.0.0')).not.toThrow()
})
