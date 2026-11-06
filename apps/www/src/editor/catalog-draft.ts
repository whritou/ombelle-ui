import { defaultGlassPresetId, getCatalog, resolveRecipePreset, type StartingPresetId } from '@ombelle/catalog'
import { validateComponentRecipe, type ComponentRecipe, type StyleFamily } from '@ombelle/contracts'

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

export function createCatalogDraft(component: ComponentRecipe['component']): CatalogDraft {
  return { storageVersion: 1, recipe: validateComponentRecipe({
    schemaVersion: '2.0', component, id: `catalog_${component.replaceAll('-', '_')}`,
    revision: 1, presetRef: catalogPresetRef('flat'), props: {}, content: { label: 'Badge' },
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
