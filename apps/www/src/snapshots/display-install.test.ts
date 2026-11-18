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

it.each(['prose', 'navigation-menu', 'sidebar', 'resizable', 'menubar', 'data-table'] as const)('requires CLI 0.9.0 for %s recipes', async component => {
  const { catalog09InstallNotice, catalog09MinimumCli } = await import('./install-command')
  expect(catalog09MinimumCli).toBe('0.9.0')
  expect(componentRecipeInstallBlocked({ component, props: {} } as never, { version: '0.8.3' })).toBe(true)
  expect(componentRecipeInstallBlocked({ component, props: {} } as never, { version: '0.9.0' })).toBe(false)
  expect(installableRecipeInstallNotice({ schemaVersion: '2.0', component, props: {} } as never, { version: '0.8.3' })).toBe(catalog09InstallNotice)
  expect(installableRecipeInstallNotice({ schemaVersion: '2.0', component, props: {} } as never, { version: '0.9.0' })).toBeUndefined()
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

it.each([
  ['fontFamilyId', { fonts: { fontFamilyId: 'inter' } }],
  ['headingFontFamilyId', { fonts: { headingFontFamilyId: 'inter' } }],
  ['monoFontFamilyId', { fonts: { monoFontFamilyId: 'jetbrains-mono' } }],
] as const)('gates a catalog recipe with appearance.fonts %s at CLI 0.8.0', async (_name, appearance) => {
  const { recipeFontsMinimumCli, recipeFontsInstallNotice } = await import('./install-command')
  expect(recipeFontsMinimumCli).toBe('0.8.0')
  for (const component of ['badge', 'toggle', 'password-field', 'button', 'card'] as const) {
    const recipe = { component, props: {}, appearance } as never
    expect(componentRecipeInstallBlocked(recipe, { version: '0.7.8' })).toBe(true)
    expect(componentRecipeInstallBlocked(recipe, { version: '0.8.0' })).toBe(false)
    expect(installableRecipeInstallNotice({ ...(recipe as object), schemaVersion: '2.0' } as never, { version: '0.7.8' })).toBe(recipeFontsInstallNotice)
  }
  expect(recipeFontsInstallNotice).toBe('This recipe uses fonts and requires CLI 0.8.0. Download the JSON or use the repository CLI until a compatible public release is available.')
})

it('gates a catalog recipe whose appearance has only an empty fonts object, which older schemas reject', () => {
  expect(componentRecipeInstallBlocked({ component: 'badge', props: {}, appearance: { fonts: {} } } as never, { version: '0.7.8' })).toBe(true)
})

it('leaves catalog recipes without appearance.fonts exactly as before', () => {
  for (const appearance of [undefined, {}, { parts: { root: {} } }]) {
    const recipe = { component: 'badge', props: {}, appearance } as never
    expect(componentRecipeInstallBlocked(recipe, { version: '0.7.8' })).toBe(false)
    expect(installableRecipeInstallNotice({ ...(recipe as object), schemaVersion: '2.0' } as never, { version: '0.7.8' })).toBeUndefined()
  }
})

it('gates a Button recipe with overrides.fontFamilyId at CLI 0.8.0', async () => {
  const { recipeFontsInstallNotice } = await import('./install-command')
  const recipe = { schemaVersion: '1.0', presetRef: { id: 'builtin-ombelle-light' }, props: {}, overrides: { fontFamilyId: 'inter' } } as never
  expect(installableRecipeInstallNotice(recipe, { version: '0.7.8' })).toBe(recipeFontsInstallNotice)
  expect(installableRecipeInstallNotice(recipe, { version: '0.8.0' })).toBeUndefined()
})

it('leaves a Button recipe without overrides.fontFamilyId installable at 0.7.8', () => {
  const recipe = { schemaVersion: '1.0', presetRef: { id: 'builtin-ombelle-light' }, props: {}, overrides: { radius: 4 } } as never
  expect(installableRecipeInstallNotice(recipe, { version: '0.7.8' })).toBeUndefined()
})
