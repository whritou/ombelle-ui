import { expect, test, type Locator } from '@playwright/test'
import { compileComponentRecipe } from '../../packages/compiler/src/index.js'
import { getCatalog } from '../../packages/catalog/src/index.js'
import { componentRecipeFields, defaultRecipeFields, validateComponentRecipe, type ComponentRecipeId } from '../../packages/contracts/src/index.js'

const scenarios = ['card-outlined', 'card-subtle', 'tabs', 'table', 'alert', 'toast'] as const
for (const family of ['ombelle', 'liquid-glass'] as const)
  for (const scenario of scenarios)
    test(`${family}/${scenario}: explicit recipe overrides win over appearance defaults`, async ({ page }) => {
      const catalog = getCatalog('0.1.0')
      const preset = family === 'liquid-glass' ? catalog.startingPresets['builtin-liquid-glass-cristal'] : catalog.presets.ombelle
      const component: ComponentRecipeId = scenario.startsWith('card-') ? 'card' : scenario as Exclude<typeof scenario, 'card-outlined' | 'card-subtle'>
      const colors = { light: { background: '#123456', foreground: '#ffffff' }, dark: { background: '#123456', foreground: '#ffffff' } }
      const props = component === 'card' ? { appearance: scenario.slice(5) }
        : component === 'tabs' ? { appearance: 'underline', orientation: 'vertical', selection: 'summary' }
        : component === 'table' ? { density: 'compact', striped: true }
        : { variant: 'success' }
      const parts = component === 'card' ? { card: { borderWidthPx: 3, colors } }
        : component === 'tabs' ? { 'tabs-list': { paddingXPx: 19 }, 'tabs-trigger': { fontSizePx: 22 } }
        : component === 'table' ? { 'table-cell': { paddingXPx: 22 } }
        : { [component]: { colors } }
      const content = defaultRecipeFields(componentRecipeFields(component).content)
      if (component === 'tabs') content.items = [{ id: 'summary', label: 'Summary', body: 'Summary' }, { id: 'history', label: 'History', body: 'History' }]
      const recipe = validateComponentRecipe({ schemaVersion: '2.0', id: 'appearance_probe', revision: 1, component,
        presetRef: { id: preset.id, revision: preset.revision, catalogRelease: preset.catalogRelease, compilerVersion: preset.compilerVersion },
        props, content, appearance: { parts } })
      const result = await compileComponentRecipe({ recipe })
      await page.goto(`/editions/${family}/radix/?mode=light`)
      await expect(page.locator('main')).toHaveAttribute('data-ready', 'true')
      let target: Locator
      if (component === 'card') target = page.locator(`[data-expansion="surfaces"] [data-appearance="${scenario.slice(5)}"]`)
      else if (component === 'tabs') target = page.getByRole('tablist', { name: 'Expansion vertical tabs' }).locator('..')
      else if (component === 'table') target = page.getByRole('table', { name: 'Compact projects' }).locator('..')
      else if (component === 'alert') target = page.locator('[data-expansion="alerts"] [data-variant="success"]')
      else {
        await page.getByRole('button', { name: 'Show expansion notification' }).click()
        target = page.locator('[data-expansion="toast-content"]')
      }
      await target.evaluate((root, scope) => {
        for (const element of [root, ...root.querySelectorAll('*')]) {
          const slot = element.getAttribute('data-slot')
          if (!slot) continue
          element.setAttribute('data-slot', 'recipe-' + slot)
          element.setAttribute('data-ombelle-recipe', scope)
        }
      }, result.scope)
      await page.addStyleTag({ content: result.artifacts.find(artifact => artifact.kind === 'style')!.content })
      if (component === 'card') {
        await expect(target).toHaveCSS('background-color', 'rgb(18, 52, 86)')
        await expect(target).toHaveCSS('color', 'rgb(255, 255, 255)')
        await expect(target).toHaveCSS('border-top-width', '3px')
      } else if (component === 'tabs') {
        await expect(target.getByRole('tablist')).toHaveCSS('padding-inline-start', '19px')
        await expect(target.getByRole('tab').first()).toHaveCSS('font-size', '22px')
      } else if (component === 'table') {
        await expect(target.getByRole('cell').first()).toHaveCSS('padding-inline-start', '22px')
      } else {
        await expect(target).toHaveCSS('background-color', 'rgb(18, 52, 86)')
        await expect(target.locator(`[data-slot="recipe-${component}-description"]`)).toHaveCSS('color', 'rgb(255, 255, 255)')
      }
    })
