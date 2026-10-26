import { resolveRecipePreset } from '@ombelle/catalog'
import { validateRecipe, type Recipe } from '@ombelle/contracts'
import type { EditorDraft } from './model'

export const DRAFT_STORAGE_KEY = 'ombelle.button-editor.draft'
export const RECOVERY_STORAGE_KEY = 'ombelle.button-editor.recoveries'

type RecoveryStorage = Pick<Storage, 'getItem' | 'setItem'>

export function readRecoveries(storage: Pick<Storage, 'getItem'>): string[] {
  const raw = storage.getItem(RECOVERY_STORAGE_KEY)
  if (raw === null) return []
  const parsed: unknown = JSON.parse(raw)
  if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed) ||
    Object.keys(parsed).length !== 2 ||
    !('storageVersion' in parsed) || parsed.storageVersion !== 1 ||
    !('texts' in parsed) || !Array.isArray(parsed.texts) ||
    !parsed.texts.every((text: unknown) => typeof text === 'string'))
    throw new Error('Invalid recovery archive')
  return [...parsed.texts]
}

export function preserveRecovery(storage: RecoveryStorage, raw: string): string[] {
  const texts = readRecoveries(storage)
  if (texts.includes(raw)) return texts
  const next = [...texts, raw]
  const encoded = JSON.stringify({ storageVersion: 1, texts: next })
  storage.setItem(RECOVERY_STORAGE_KEY, encoded)
  if (storage.getItem(RECOVERY_STORAGE_KEY) !== encoded)
    throw new Error('Recovery archive could not be verified')
  return next
}

export function recipeFilename(recipe: Pick<Recipe, 'id' | 'revision'>): string {
  return `${recipe.id}-r${recipe.revision}.json`
}

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
