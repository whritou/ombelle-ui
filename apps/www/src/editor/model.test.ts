import { describe, expect, it } from 'vitest'
import { getCatalog } from '@ombelle/catalog'
import { styleFamilies, validateRecipe } from '@ombelle/contracts'
import {
  changeDraftFamily, createEditorDraft, draftFamily, experimentalNotice, recipeColor, updateDraftRecipe, withRecipeColor,
  type EditorView,
} from './model.js'
import { serializeRecipe } from './storage.js'

describe('Button editor model', () => {
  it.each(styleFamilies)('creates a valid %s draft with the exact built-in preset', (family) => {
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

  it('validates a liquid-glass draft and labels it experimental', () => {
    const draft = changeDraftFamily(createEditorDraft('flat'), 'liquid-glass')
    expect(draft.recipe.presetRef.id).toBe('builtin-liquid-glass')
    expect(validateRecipe(draft.recipe)).toEqual(draft.recipe)
    expect(draftFamily(draft.recipe)).toBe('liquid-glass')
    expect(experimentalNotice('liquid-glass')).toBe(
      'liquid-glass is experimental for button; see docs/components/liquid-glass.md for limitations',
    )
    expect(experimentalNotice('flat')).toBeNull()
    expect(draftFamily(createEditorDraft('minimalist').recipe)).toBe('minimalist')
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
  it('reads color overrides with the variant preset token as fallback', () => {
    const draft = createEditorDraft('flat')
    const preset = getCatalog('0.1.0').presets.flat
    expect(recipeColor(draft.recipe, 'light', 'background')).toEqual({ value: preset.modes.light.primary, overridden: false })
    const outline = { ...draft.recipe, props: { ...draft.recipe.props, variant: 'outline' as const } }
    expect(recipeColor(outline, 'dark', 'foreground')).toEqual({ value: preset.modes.dark.foreground, overridden: false })
    expect(recipeColor(outline, 'dark', 'border')).toEqual({ value: preset.modes.dark.border, overridden: false })
    const colored = withRecipeColor(outline, 'dark', 'foreground', '#123456')
    expect(recipeColor(colored, 'dark', 'foreground')).toEqual({ value: '#123456', overridden: true })
    expect(recipeColor(colored, 'light', 'foreground').overridden).toBe(false)
  })

  it('sets and clears color overrides without leaving empty groups', () => {
    const draft = createEditorDraft('neo-brutalism')
    const set = withRecipeColor(withRecipeColor(draft.recipe, 'light', 'background', '#ff0000'), 'dark', 'border', 'oklch(0.5 0.1 20)')
    expect(set.overrides).toEqual({ colors: { light: { background: '#ff0000' }, dark: { border: 'oklch(0.5 0.1 20)' } } })
    expect(updateDraftRecipe(draft, set).recipe.overrides).toEqual(set.overrides)
    const cleared = withRecipeColor(withRecipeColor(set, 'light', 'background', undefined), 'dark', 'border', undefined)
    expect(cleared.overrides).toEqual({})
    expect(draft.recipe.overrides).toEqual({})
    expect(() => updateDraftRecipe(draft, withRecipeColor(draft.recipe, 'light', 'border', 'oklch(0.5 0.9 20)')))
      .toThrow(expect.objectContaining({ path: '/overrides/colors/light/border' }))
  })
})
