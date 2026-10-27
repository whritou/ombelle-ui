import { validateRecipe, type Recipe, type RecipeCompileResult } from '@ombelle/contracts'
import { canonicalize } from '@ombelle/compiler'

export function resultMatchesDraft(result: RecipeCompileResult | null, recipe: Recipe): boolean {
  if (!result) return false
  try {
    const raw = validateRecipe(recipe)
    const normalized = {
      ...raw,
      props: {
        variant: result.preset.data.componentDefaults?.button?.variant ?? 'default',
        size: result.preset.data.componentDefaults?.button?.size ?? 'default',
        type: 'button',
        disabled: false,
        loading: false,
        ...raw.props,
      },
    }
    return canonicalize(normalized) === canonicalize(result.recipe.data)
  } catch {
    return false
  }
}
