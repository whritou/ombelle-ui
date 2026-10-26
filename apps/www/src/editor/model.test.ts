import { describe, expect, it } from 'vitest'
import { getCatalog } from '@ombelle/catalog'
import { supportedStyleFamilies, validateRecipe } from '@ombelle/contracts'
import { changeDraftFamily, createEditorDraft, updateDraftRecipe, type EditorView } from './model.js'
import { serializeRecipe } from './storage.js'

describe('Button editor model', () => {
  it.each(supportedStyleFamilies)('creates a valid %s draft with the exact built-in preset', (family) => {
    const draft = createEditorDraft(family)
    const preset = getCatalog('0.1.0').presets[family]
    expect(draft).toEqual({
      storageVersion: 1,
      recipe: {
        schemaVersion: '1.0', id: 'button_recipe', revision: 1, component: 'button',
        presetRef: { id: preset.id, revision: preset.revision, catalogRelease: '0.1.0', compilerVersion: '0.1.0' },
        props: { variant: 'default', size: 'default', type: 'button', disabled: false, loading: false },
        content: 'Save changes', overrides: {},
      },
    })
    expect(validateRecipe(draft.recipe)).toEqual(draft.recipe)
  })

  it('changes only the exact preset reference when family changes', () => {
    const original = createEditorDraft('flat')
    const next = changeDraftFamily(original, 'neo-brutalism')
    expect(next.recipe.presetRef).toEqual({
      id: 'builtin-neo-brutalism', revision: 1, catalogRelease: '0.1.0', compilerVersion: '0.1.0',
    })
    expect({ ...next.recipe, presetRef: original.recipe.presetRef }).toEqual(original.recipe)
    expect(original.recipe.presetRef.id).toBe('builtin-flat')
  })

  it('rejects recipe updates outside the recipe schema', () => {
    const draft = createEditorDraft('flat')
    expect(() => updateDraftRecipe(draft, { ...draft.recipe, content: '' })).toThrow()
    expect(draft.recipe.content).toBe('Save changes')
  })

  it('rejects a schema-valid reference that is not a pinned built-in preset', () => {
    const draft = createEditorDraft('flat')
    expect(() => updateDraftRecipe(draft, {
      ...draft.recipe,
      presetRef: { ...draft.recipe.presetRef, id: 'unknown' },
    })).toThrow()
  })

  it('preserves the existing recipe ID and revision through updates and export', () => {
    const initial = createEditorDraft('flat')
    const draft = { ...initial, recipe: { ...initial.recipe, id: 'saved_recipe', revision: 3 } }
    const updated = updateDraftRecipe(draft, {
      ...draft.recipe, id: 'replacement_recipe', revision: 4, content: 'Updated label',
    })
    expect(updated.recipe).toMatchObject({ id: 'saved_recipe', revision: 3, content: 'Updated label' })
    expect(JSON.parse(serializeRecipe(updated))).toMatchObject({ id: 'saved_recipe', revision: 3 })
    expect(draft.recipe).toMatchObject({ id: 'saved_recipe', revision: 3, content: 'Save changes' })
  })

  it('keeps presentation state outside recipe data', () => {
    const draft = createEditorDraft('flat')
    const before = JSON.stringify(draft.recipe)
    const view: EditorView = { mode: 'light', viewport: 'wide', panel: 'preview', forcedState: 'none' }
    const darkNarrowFocus: EditorView = { ...view, mode: 'dark', viewport: 'narrow', forcedState: 'focus' }
    expect(darkNarrowFocus).toMatchObject({ mode: 'dark', viewport: 'narrow', forcedState: 'focus' })
    expect(JSON.stringify(draft.recipe)).toBe(before)
    expect(Object.keys(draft)).toEqual(['storageVersion', 'recipe'])
  })
})
