import Ajv2020 from 'ajv/dist/2020.js'
import type { FromSchema } from 'json-schema-to-ts'
import { componentRecipeSchema } from './component-recipe-schema.js'
import { FoundationError } from './diagnostics.js'
import { validateRecipe, type Recipe } from './recipe.js'

export type ComponentRecipe = FromSchema<typeof componentRecipeSchema>
export type InstallableRecipe = Recipe | ComponentRecipe

const check = new Ajv2020({ allErrors: true, strict: true }).compile(componentRecipeSchema)

export function validateComponentRecipe(input: unknown): ComponentRecipe {
  if (!check(input)) {
    const error = check.errors![0]
    const field = error.keyword === 'additionalProperties' ? error.params.additionalProperty
      : error.keyword === 'required' ? error.params.missingProperty : undefined
    throw new FoundationError('INVALID_DATA', error.message ?? 'Invalid component recipe',
      error.instancePath + (field ? '/' + field : ''))
  }
  const recipe = structuredClone(input as ComponentRecipe)
  recipe.props.variant ??= 'default'
  return recipe
}

export function validateInstallableRecipe(input: unknown): InstallableRecipe {
  const version = input && typeof input === 'object' && 'schemaVersion' in input
    ? input.schemaVersion : undefined
  if (version === '2.0') return validateComponentRecipe(input)
  if (typeof version === 'string' && version !== '1.0')
    throw new FoundationError('UNSUPPORTED_RELEASE', 'Unsupported recipe schema version', '/schemaVersion')
  return validateRecipe(input)
}
