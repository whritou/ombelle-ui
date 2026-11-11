import { expect, it } from 'vitest'
import { componentRecipeInstallBlocked, displayCatalogMinimumCli, installableRecipeInstallNotice } from './install-command'

it.each(['spinner', 'kbd', 'empty', 'field', 'meter', 'stepper', 'slider', 'toggle-group', 'chip', 'tag-input', 'input-otp', 'combobox', 'command', 'hover-card', 'context-menu'] as const)('requires CLI 0.7.3 for %s recipes', component => {
  expect(displayCatalogMinimumCli).toBe('0.7.3')
  expect(componentRecipeInstallBlocked({ component, props: {} }, { version: '0.7.2' })).toBe(true)
  expect(componentRecipeInstallBlocked({ component, props: {} }, { version: '0.7.3' })).toBe(false)
  expect(installableRecipeInstallNotice({ schemaVersion: '2.0', component, props: {} } as never, { version: '0.7.2' })).toContain('0.7.3')
})
