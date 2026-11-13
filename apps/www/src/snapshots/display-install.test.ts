import { expect, it } from 'vitest'
import { catalog075InstallNotice, catalog075MinimumCli, componentRecipeInstallBlocked, displayCatalogMinimumCli, installableRecipeInstallNotice } from './install-command'

it.each(['spinner', 'kbd', 'empty', 'field', 'meter', 'stepper', 'slider', 'toggle-group', 'chip', 'tag-input', 'input-otp', 'combobox', 'command', 'hover-card', 'context-menu', 'calendar'] as const)('requires CLI 0.7.3 for %s recipes', component => {
  expect(displayCatalogMinimumCli).toBe('0.7.3')
  expect(componentRecipeInstallBlocked({ component, props: {} }, { version: '0.7.2' })).toBe(true)
  expect(componentRecipeInstallBlocked({ component, props: {} }, { version: '0.7.3' })).toBe(false)
  expect(installableRecipeInstallNotice({ schemaVersion: '2.0', component, props: {} } as never, { version: '0.7.2' })).toContain('0.7.3')
})

it.each(['toggle', 'collapsible', 'scroll-area', 'button-group', 'item', 'number-input', 'color-picker'] as const)('requires CLI 0.7.5 for %s recipes', component => {
  expect(catalog075MinimumCli).toBe('0.7.5')
  expect(componentRecipeInstallBlocked({ component, props: {} }, { version: '0.7.4' })).toBe(true)
  expect(componentRecipeInstallBlocked({ component, props: {} }, { version: '0.7.5' })).toBe(false)
  expect(installableRecipeInstallNotice({ schemaVersion: '2.0', component, props: {} } as never, { version: '0.7.4' })).toBe(catalog075InstallNotice)
})
