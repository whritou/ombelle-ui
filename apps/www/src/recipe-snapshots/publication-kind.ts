import {
  validateInstallableRecipe,
  type InstallableRecipe,
  type InstallableRecipeCompileResult,
  type InstallableRecipeSnapshot,
} from '@ombelle/contracts'
import type { PublicationKind } from '../publication/kind'

// The compiler is loaded when a code is published or read back, not with the page.
const compiler = () => import('@ombelle/compiler')

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
    (await (await compiler()).normalizePublishedInstallableRecipe(recipe)).recipe,
  verify: async (input) => (await compiler()).verifyInstallableRecipeSnapshot(input),
}
