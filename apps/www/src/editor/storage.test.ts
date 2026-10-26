import { describe, expect, it } from 'vitest'
import { createEditorDraft } from './model.js'
import { DRAFT_STORAGE_KEY, restoreDraft, serializeDraft, serializeRecipe } from './storage.js'

describe('Button editor draft storage', () => {
  it('uses the editor draft storage key', () => {
    expect(DRAFT_STORAGE_KEY).toBe('ombelle.button-editor.draft')
  })

  it('reports empty storage without a draft', () => {
    expect(restoreDraft(null)).toEqual({ status: 'empty' })
  })

  it('restores a valid v1 envelope', () => {
    const draft = createEditorDraft('minimalist')
    expect(restoreDraft(serializeDraft(draft))).toEqual({ status: 'restored', draft })
  })

  it('preserves malformed JSON exactly for recovery', () => {
    const raw = '{"storageVersion":1,\r\n broken ☃'
    expect(restoreDraft(raw)).toEqual({ status: 'recovery-required', recoveryText: raw })
  })

  it('rejects an invalid recipe and returns the original bytes', () => {
    const raw = JSON.stringify({ ...createEditorDraft('flat'), recipe: { ...createEditorDraft('flat').recipe, content: '' } })
    expect(restoreDraft(raw)).toEqual({ status: 'recovery-required', recoveryText: raw })
  })

  it('preserves unknown storage versions for recovery', () => {
    const raw = JSON.stringify({ ...createEditorDraft('flat'), storageVersion: 2 })
    expect(restoreDraft(raw)).toEqual({ status: 'recovery-required', recoveryText: raw })
  })

  it('rejects unsupported preset references on restore', () => {
    const draft = createEditorDraft('flat')
    const raw = JSON.stringify({ ...draft, recipe: { ...draft.recipe, presetRef: { ...draft.recipe.presetRef, id: 'unknown' } } })
    expect(restoreDraft(raw)).toEqual({ status: 'recovery-required', recoveryText: raw })
  })

  it('validates before serializing the storage envelope', () => {
    const draft = createEditorDraft('flat')
    expect(JSON.parse(serializeDraft(draft))).toEqual(draft)
    expect(() => serializeDraft({ ...draft, recipe: { ...draft.recipe, content: '' } })).toThrow()
  })

  it('exports plain recipe JSON accepted by the CLI', () => {
    const draft = createEditorDraft('neo-brutalism')
    expect(JSON.parse(serializeRecipe(draft))).toEqual(draft.recipe)
    expect(JSON.parse(serializeRecipe(draft))).not.toHaveProperty('storageVersion')
  })
})
