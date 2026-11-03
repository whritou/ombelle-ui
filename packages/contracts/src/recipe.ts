import Ajv2020 from 'ajv/dist/2020.js'
import type { FromSchema } from 'json-schema-to-ts'
import { recipeSchema } from './recipe-schema.js'
import { FoundationError } from './diagnostics.js'
import { assertColorValue } from './validate.js'
import type { Preset } from './types.js'
export type Recipe = FromSchema<typeof recipeSchema>
export type RecipeButtonVariant = NonNullable<Recipe['props']['variant']>
export type RecipeColorMode = 'light' | 'dark'
export type RecipeColorRole = 'background' | 'foreground' | 'border'
export const recipeColorModes = ['light', 'dark'] as const
export const recipeColorRoles = ['background', 'foreground', 'border'] as const
/**
 * The preset color token each recipe color override replaces, by variant.
 * Overrides are written into the scoped light/dark token blocks, so hover and
 * active rules derived from these tokens (for example color-mix on --primary)
 * follow them in both modes. Because families paint ghost/link backgrounds
 * transparent, link text from different tokens and borders from --border,
 * --input or the variant color, the compiler also paints each overridden role
 * on the selected variant from its mapped token: ghost/link `background`,
 * link `color`, and `border-color` for every variant. Once a role is painted,
 * a mode without its own override shows that mode's preset token. Outline and
 * ghost hover/active states keep the family's --accent colors.
 */
export const recipeColorTokens: Record<
  RecipeButtonVariant,
  Record<RecipeColorRole, keyof Preset['modes']['light']>
> = {
  default: { background: 'primary', foreground: 'primaryForeground', border: 'border' },
  secondary: { background: 'secondary', foreground: 'secondaryForeground', border: 'border' },
  destructive: { background: 'destructive', foreground: 'destructiveForeground', border: 'border' },
  outline: { background: 'background', foreground: 'foreground', border: 'border' },
  ghost: { background: 'background', foreground: 'foreground', border: 'border' },
  link: { background: 'background', foreground: 'foreground', border: 'border' },
}
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
  const colors = recipe.overrides.colors
  if (colors)
    for (const mode of recipeColorModes)
      for (const role of recipeColorRoles) {
        const value = colors[mode]?.[role]
        if (value !== undefined)
          assertColorValue(value, `/overrides/colors/${mode}/${role}`)
      }
  return structuredClone(recipe)
}
