import { normalizeRecipe, validateRecipe, type Recipe, type RecipeCompileResult } from '@ombelle/contracts'
import { canonicalize } from '@ombelle/compiler/light'

export function resultMatchesDraft(result: RecipeCompileResult | null, recipe: Recipe): boolean {
  if (!result) return false
  try {
    const normalized = normalizeRecipe(validateRecipe(recipe), result.preset.data.componentDefaults?.button)
    return canonicalize(normalized) === canonicalize(result.recipe.data)
  } catch {
    return false
  }
}
