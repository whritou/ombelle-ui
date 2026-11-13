import { expect, it } from 'vitest'
import { catalog075InstallNotice, catalog075MinimumCli, componentRecipeInstallBlocked, displayCatalogMinimumCli, installableRecipeInstallNotice } from './install-command'

it.each(['spinner', 'kbd', 'empty', 'field', 'meter', 'stepper', 'slider', 'toggle-group', 'chip', 'tag-input', 'input-otp', 'combobox', 'command', 'hover-card', 'context-menu', 'calendar'] as const)('requires CLI 0.7.3 for %s recipes', component => {
  expect(displayCatalogMinimumCli).toBe('0.7.3')
  expect(componentRecipeInstallBlocked({ component, props: {} }, { version: '0.7.2' })).toBe(true)
  expect(componentRecipeInstallBlocked({ component, props: {} }, { version: '0.7.3' })).toBe(false)
  expect(installableRecipeInstallNotice({ schemaVersion: '2.0', component, props: {} } as never, { version: '0.7.2' })).toContain('0.7.3')
})

it.each(['toggle', 'collapsible', 'scroll-area', 'button-group', 'item', 'number-input', 'color-picker', 'code-block'] as const)('requires CLI 0.7.5 for %s recipes', component => {
  expect(catalog075MinimumCli).toBe('0.7.5')
  expect(componentRecipeInstallBlocked({ component, props: {} }, { version: '0.7.4' })).toBe(true)
  expect(componentRecipeInstallBlocked({ component, props: {} }, { version: '0.7.5' })).toBe(false)
  expect(installableRecipeInstallNotice({ schemaVersion: '2.0', component, props: {} } as never, { version: '0.7.4' })).toBe(catalog075InstallNotice)
})

it.each(['password-field', 'carousel', 'aspect-ratio', 'toolbar'] as const)('requires CLI 0.7.6 for %s recipes', async component => {
  const { catalog076InstallNotice, catalog076MinimumCli } = await import('./install-command')
  expect(catalog076MinimumCli).toBe('0.7.6')
  expect(componentRecipeInstallBlocked({ component, props: {} }, { version: '0.7.5' })).toBe(true)
  expect(componentRecipeInstallBlocked({ component, props: {} }, { version: '0.7.6' })).toBe(false)
  expect(installableRecipeInstallNotice({ schemaVersion: '2.0', component, props: {} } as never, { version: '0.7.5' })).toBe(catalog076InstallNotice)
})

it.each([
  ['field', { fieldset: 'default' }, { legend: 'x' }],
  ['field', { form: 'summary' }, {}],
  ['field', {}, { fields: ['Name'] }],
  ['checkbox', { group: 'parent' }, {}],
  ['checkbox', {}, { options: ['Dialog'] }],
] as const)('gates a %s recipe using %o %o at CLI 0.7.6', async (component, props, content) => {
  const { catalog076InstallNotice } = await import('./install-command')
  const recipe = { component, props, content } as never
  expect(componentRecipeInstallBlocked(recipe, { version: '0.7.5' })).toBe(true)
  expect(componentRecipeInstallBlocked(recipe, { version: '0.7.6' })).toBe(false)
  expect(installableRecipeInstallNotice({ ...(recipe as object), schemaVersion: '2.0' } as never, { version: '0.7.5' })).toBe(catalog076InstallNotice)
})

it.each(['field', 'checkbox'] as const)('leaves a %s recipe without 0.7.6 fields installable at 0.7.5', component => {
  expect(componentRecipeInstallBlocked({ component, props: {}, content: { label: 'Name' } } as never, { version: '0.7.5' })).toBe(false)
})
