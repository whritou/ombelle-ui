import { compileInstallableRecipe, verifyInstallableRecipeSnapshot } from '@ombelle/compiler'
import type { InstallableRecipeCompileResult, InstallableRecipeSnapshot } from '@ombelle/contracts'

/**
 * The compiled preview of a published recipe, verified and compiled on the server so the page loads
 * no compiler. Null when either step fails; the page then shows the verified JSON without a preview.
 */
export async function prepareRecipePreview(snapshot: InstallableRecipeSnapshot): Promise<InstallableRecipeCompileResult | null> {
  try {
    const verified = await verifyInstallableRecipeSnapshot(snapshot)
    return await compileInstallableRecipe({ recipe: verified.recipe, preset: verified.preset })
  } catch {
    return null
  }
}
