import {
  validateInstallableRecipe,
  type InstallableRecipe,
  type InstallableRecipeCompileResult,
  type InstallableRecipeSnapshot,
} from '@ombelle/contracts'
import {
  normalizePublishedInstallableRecipe,
  verifyInstallableRecipeSnapshot,
} from '@ombelle/compiler'
import type { PublicationKind } from '../publication/kind'

export type RecipePublicationTypes = {
  field: 'recipe'
  hashField: 'recipeHash'
  data: InstallableRecipe
  snapshot: InstallableRecipeSnapshot
  resolved: InstallableRecipeCompileResult['recipe']
}

export const recipePublication: PublicationKind<RecipePublicationTypes> = {
  noun: 'recipe',
  endpoint: '/api/v1/recipes',
  field: 'recipe',
  hashField: 'recipeHash',
  storageKey: 'ombelle:recipe-editor:publication:v1',
  validate: validateInstallableRecipe,
  release: (recipe) => recipe.presetRef,
  normalize: async (recipe) =>
    (await normalizePublishedInstallableRecipe(recipe)).recipe,
  verify: (input) => verifyInstallableRecipeSnapshot(input),
}
