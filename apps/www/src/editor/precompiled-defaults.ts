import { canonicalize } from '@ombelle/compiler'
import { resolveRecipePreset } from '@ombelle/catalog'
import { componentRecipeComponents, styleSupport, validateRecipe, type ComponentId, type ComponentRecipe, type Recipe, type StyleFamily } from '@ombelle/contracts'
import exampleRecipe from '../../../../examples/recipe.example.json' with { type: 'json' }
import { defaultSiteFamily } from '../snapshots/install-command'
import { changeCatalogFamily, createCatalogDraft } from './catalog-draft'
import { changeDraftFamily, type EditorDraft } from './model'

/**
 * The families whose default recipes are compiled at build time and bundled into the editor preview, which shows
 * one before the first compile: the family a fresh editor starts in. Another family's default is reached only by
 * an edit, which compiles anyway, or by a restored draft that is that default untouched.
 */
export const precompiledFamilies: readonly StyleFamily[] = [defaultSiteFamily]

/** The Button editor's starting draft: the example recipe in the site's first family. */
export const initialButtonDraft: EditorDraft = changeDraftFamily({ storageVersion: 1, recipe: validateRecipe(exampleRecipe) }, defaultSiteFamily)

/** The Button recipe a fresh editor shows in a family. */
export function defaultButtonRecipe(family: StyleFamily): Recipe {
  return changeDraftFamily(initialButtonDraft, family).recipe
}

/** The catalog recipe a fresh editor shows in a family. */
export function defaultCatalogRecipe(component: ComponentRecipe['component'], family: StyleFamily): ComponentRecipe {
  return changeCatalogFamily(createCatalogDraft(component).recipe, family)
}

/** Every component and family with a precompiled default, Button first. */
export function precompiledDefaults(): { component: ComponentId; family: StyleFamily }[] {
  return (['button', ...componentRecipeComponents] as ComponentId[]).flatMap(component => precompiledFamilies
    .filter(family => styleSupport(component, family) !== 'unavailable')
    .map(family => ({ component, family })))
}

function familyOf(presetRef: Recipe['presetRef']): StyleFamily | null {
  try { return resolveRecipePreset(presetRef).styleFamily } catch { return null }
}

/** The family whose precompiled default this Button recipe is, or null when it is not one. */
export function precompiledButtonFamily(recipe: Recipe): StyleFamily | null {
  const family = familyOf(recipe.presetRef)
  return family && precompiledFamilies.includes(family) && styleSupport('button', family) !== 'unavailable' &&
    canonicalize(recipe) === canonicalize(defaultButtonRecipe(family)) ? family : null
}

/** The family whose precompiled default this catalog recipe is, or null when it is not one. */
export function precompiledCatalogFamily(recipe: ComponentRecipe): StyleFamily | null {
  const family = familyOf(recipe.presetRef)
  return family && precompiledFamilies.includes(family) && styleSupport(recipe.component, family) !== 'unavailable' &&
    canonicalize(recipe) === canonicalize(defaultCatalogRecipe(recipe.component, family)) ? family : null
}
