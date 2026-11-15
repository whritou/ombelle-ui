import { defaultGlassPresetId, getCatalog, resolveRecipePreset, styleFamilyFonts, type StartingPresetId } from '@ombelle/catalog'
import { componentRecipeFields, defaultRecipeFields, validateComponentRecipe, type ComponentRecipe, type StyleFamily } from '@ombelle/contracts'
import { defaultSiteFamily } from '../snapshots/install-command'

export type CatalogDraft = { storageVersion: 1; recipe: ComponentRecipe }

export function catalogDraftKey(component: ComponentRecipe['component']): string {
  return `ombelle.component-editor.${component}.draft`
}

export function catalogPresetRef(family: StyleFamily, presetId: StartingPresetId = defaultGlassPresetId): ComponentRecipe['presetRef'] {
  const catalog = getCatalog('0.1.0')
  const { id, revision, catalogRelease, compilerVersion } = family === 'liquid-glass'
    ? catalog.startingPresets[presetId] : catalog.presets[family]
  return { id, revision, catalogRelease, compilerVersion }
}

/**
 * A style's own fonts, which a recipe carries until someone picks others. The compiler imports and installs
 * only the roles the component has a slot for, so every role is written here.
 */
export function styleFonts(family: StyleFamily): NonNullable<NonNullable<ComponentRecipe['appearance']>['fonts']> {
  const { body, display, mono } = styleFamilyFonts[family]
  return { fontFamilyId: body, headingFontFamilyId: display, monoFontFamilyId: mono }
}

/** Moves the recipe to a style; its fonts follow the style unless someone picked others. */
export function changeCatalogFamily(recipe: ComponentRecipe, family: StyleFamily, presetId?: StartingPresetId): ComponentRecipe {
  const previous = styleFonts(resolveRecipePreset(recipe.presetRef).styleFamily)
  const fonts = recipe.appearance?.fonts
  const own = !fonts || (Object.keys(previous) as (keyof typeof previous)[]).every(key => fonts[key] === undefined || fonts[key] === previous[key])
  return { ...recipe, presetRef: catalogPresetRef(family, presetId),
    ...(own ? { appearance: { ...recipe.appearance, fonts: styleFonts(family) } } : {}) }
}

export function createCatalogDraft(component: ComponentRecipe['component']): CatalogDraft {
  const fields = componentRecipeFields(component)
  return { storageVersion: 1, recipe: validateComponentRecipe({
    schemaVersion: '2.0', component, id: `catalog_${component.replaceAll('-', '_')}`,
    revision: 1, presetRef: catalogPresetRef(defaultSiteFamily), props: {}, content: defaultRecipeFields(fields.content),
    appearance: { fonts: styleFonts(defaultSiteFamily) },
  }) }
}

export function restoreCatalogDraft(component: ComponentRecipe['component'], raw: string | null):
  { status: 'empty' } | { status: 'restored'; draft: CatalogDraft } | { status: 'recovery-required'; recoveryText: string } {
  if (raw === null) return { status: 'empty' }
  try {
    const value = JSON.parse(raw)
    if (!value || value.storageVersion !== 1 || Object.keys(value).length !== 2)
      throw new Error('Unsupported draft')
    const recipe = validateComponentRecipe(value.recipe)
    if (recipe.component !== component) throw new Error('Draft component differs')
    resolveRecipePreset(recipe.presetRef)
    return { status: 'restored', draft: { storageVersion: 1, recipe } }
  } catch {
    return { status: 'recovery-required', recoveryText: raw }
  }
}
