import { getCatalog, resolveRecipePreset } from '@ombelle/catalog'
import { validateRecipe, type Recipe, type StyleFamily } from '@ombelle/contracts'

export type EditorDraft = { storageVersion: 1; recipe: Recipe }

export type EditorView = {
  mode: 'light' | 'dark'
  viewport: 'wide' | 'narrow'
  panel: 'preview' | 'customize' | 'code'
  forcedState: 'none' | 'focus' | 'hover'
}

function presetRefFor(family: StyleFamily): Recipe['presetRef'] {
  const preset = getCatalog('0.1.0').presets[family]
  return {
    id: preset.id,
    revision: preset.revision,
    catalogRelease: preset.catalogRelease,
    compilerVersion: preset.compilerVersion,
  }
}

export function createEditorDraft(family: StyleFamily): EditorDraft {
  return {
    storageVersion: 1,
    recipe: validateRecipe({
      schemaVersion: '1.0',
      id: 'button_recipe',
      revision: 1,
      component: 'button',
      presetRef: presetRefFor(family),
      props: { variant: 'default', size: 'default', type: 'button', disabled: false, loading: false },
      content: 'Save changes',
      overrides: {},
    }),
  }
}

export function updateDraftRecipe(draft: EditorDraft, recipe: unknown): EditorDraft {
  const validated = validateRecipe(recipe)
  validated.id = draft.recipe.id
  validated.revision = draft.recipe.revision
  resolveRecipePreset(validated.presetRef)
  return { storageVersion: draft.storageVersion, recipe: validated }
}

export function changeDraftFamily(draft: EditorDraft, family: StyleFamily): EditorDraft {
  return updateDraftRecipe(draft, { ...draft.recipe, presetRef: presetRefFor(family) })
}
