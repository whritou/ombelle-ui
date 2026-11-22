import { validateInstallableRecipe, type InstallableRecipe } from '@ombelle/contracts'
import { readJsonFile } from './json-file.js'
export async function readRecipeFile(file: string): Promise<InstallableRecipe> {
  return validateInstallableRecipe(await readJsonFile(file, 'Recipe', 65536))
}
