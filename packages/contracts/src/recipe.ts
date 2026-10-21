import Ajv2020 from 'ajv/dist/2020.js'
import type { FromSchema } from 'json-schema-to-ts'
import { recipeSchema } from './recipe-schema.js'
import { FoundationError } from './diagnostics.js'
export type Recipe = FromSchema<typeof recipeSchema>
export type NormalizedRecipe = Omit<Recipe, 'props'> & {
  props: Required<Recipe['props']>
}
const check = new Ajv2020({ allErrors: true, strict: true }).compile(
  recipeSchema,
)
export function validateRecipe(input: unknown): Recipe {
  if (!check(input)) {
    const e = check.errors![0]
    const suffix =
      e.keyword === 'additionalProperties'
        ? '/' + e.params.additionalProperty
        : e.keyword === 'required'
          ? '/' + e.params.missingProperty
          : ''
    throw new FoundationError(
      'INVALID_DATA',
      e.message ?? 'Invalid recipe',
      e.instancePath + suffix,
    )
  }
  const recipe = input as Recipe
  for (const [pointer, n] of [
    ['/revision', recipe.revision],
    ['/presetRef/revision', recipe.presetRef.revision],
  ] as const)
    if (!Number.isSafeInteger(n))
      throw new FoundationError(
        'INVALID_DATA',
        'Revision must be a safe integer',
        pointer,
      )
  return structuredClone(recipe)
}
