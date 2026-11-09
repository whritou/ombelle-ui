import { expect, it } from 'vitest'
import { componentRecipeFields, defaultRecipeFields, validateComponentRecipe, type ComponentRecipe } from '@ombelle/contracts'
import { getCatalog } from '@ombelle/catalog'
import { compileComponentRecipe, describeComponentRecipe } from '../src/index.js'

// Installed recipes lay out a label and its control themselves: the label never touches the control.
const recipe = (component: ComponentRecipe['component']) => {
  const { id, revision, catalogRelease, compilerVersion } = getCatalog('0.1.0').presets.ombelle
  return validateComponentRecipe({ schemaVersion: '2.0', id: 'layout_probe', revision: 1, component,
    presetRef: { id, revision, catalogRelease, compilerVersion }, props: {}, content: defaultRecipeFields(componentRecipeFields(component).content) })
}

it.each(['checkbox', 'switch'] as const)('%s sits beside its label with a gap', component => {
  expect(describeComponentRecipe(recipe(component)).props.className).toBe('flex items-center gap-2')
})

it.each(['input', 'textarea', 'label', 'native-select', 'select', 'input-group', 'radio-group'] as const)('%s stacks its label above the control with a gap', component => {
  expect(describeComponentRecipe(recipe(component)).props.className).toBe('grid gap-2')
})

it('writes the layout into the installed recipe source', async () => {
  const result = await compileComponentRecipe({ recipe: recipe('checkbox') })
  expect(result.artifacts.find(artifact => artifact.logicalPath.endsWith('/checkbox.tsx'))!.content)
    .toMatch(/className=\{?['"]flex items-center gap-2['"]\}?/)
})
