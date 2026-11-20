import fs from 'node:fs/promises'
import { compileComponentRecipe, compileRecipe } from '@ombelle/compiler'
import { defaultButtonRecipe, defaultCatalogRecipe, precompiledDefaults } from '../apps/www/src/editor/precompiled-defaults.js'

/**
 * Compiles each component editor's default recipe in each precompiled family, as the editor's first compile
 * would, for the editor preview to show before that compile arrives. One JSON file per component and family.
 */
export async function writeEditorDefaults(directory: string) {
  await fs.rm(directory, { recursive: true, force: true })
  for (const { component, family } of precompiledDefaults()) {
    const result = component === 'button'
      ? await compileRecipe({ recipe: defaultButtonRecipe(family) })
      : await compileComponentRecipe({ recipe: defaultCatalogRecipe(component, family) })
    await fs.mkdir(`${directory}/${component}`, { recursive: true })
    await fs.writeFile(`${directory}/${component}/${family}.json`, JSON.stringify(result) + '\n')
  }
}
