import { resolveRecipePreset } from '@ombelle/catalog'
import { validateRecipe } from '@ombelle/contracts'
import type { EditorDraft } from './model.js'

export const DRAFT_STORAGE_KEY = 'ombelle.button-editor.draft'

export type RestoreResult =
  | { status: 'empty' }
  | { status: 'restored'; draft: EditorDraft }
  | { status: 'recovery-required'; recoveryText: string }

function validateDraft(input: unknown): EditorDraft {
  if (
    typeof input !== 'object' || input === null || Array.isArray(input) ||
    Object.keys(input).length !== 2 ||
    !Object.hasOwn(input, 'storageVersion') ||
    !Object.hasOwn(input, 'recipe') ||
    (input as Record<string, unknown>).storageVersion !== 1
  ) throw new Error('Unsupported editor draft envelope')

  const recipe = validateRecipe((input as Record<string, unknown>).recipe)
  resolveRecipePreset(recipe.presetRef)
  return { storageVersion: 1, recipe }
}

export function restoreDraft(raw: string | null): RestoreResult {
  if (raw === null) return { status: 'empty' }
  try {
    return { status: 'restored', draft: validateDraft(JSON.parse(raw) as unknown) }
  } catch {
    return { status: 'recovery-required', recoveryText: raw }
  }
}

export function serializeDraft(draft: EditorDraft): string {
  return JSON.stringify(validateDraft(draft))
}

export function serializeRecipe(draft: EditorDraft): string {
  return JSON.stringify(validateDraft(draft).recipe)
}
