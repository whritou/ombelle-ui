import type { Recipe } from '@ombelle/contracts'
import { updateDraftRecipe, type EditorDraft } from './model'

export const HISTORY_LIMIT = 100
const GROUP_WINDOW_MS = 500

export type EditorHistory = {
  past: EditorDraft[]
  present: EditorDraft
  future: EditorDraft[]
  lastGroup?: { key: string; at: number }
}

function snapshot(draft: EditorDraft): EditorDraft {
  return structuredClone(draft)
}

export function recordDraft(
  state: EditorHistory,
  recipe: Recipe,
  change: { groupKey: string; at: number },
): EditorHistory {
  const next = updateDraftRecipe(state.present, recipe)
  if (JSON.stringify(next.recipe) === JSON.stringify(state.present.recipe)) return state

  const grouped = state.lastGroup?.key === change.groupKey &&
    change.at >= state.lastGroup.at &&
    change.at - state.lastGroup.at <= GROUP_WINDOW_MS
  const past = grouped
    ? state.past
    : [...state.past, snapshot(state.present)].slice(-HISTORY_LIMIT)
  return {
    past,
    present: next,
    future: [],
    lastGroup: { key: change.groupKey, at: change.at },
  }
}

export function undo(state: EditorHistory): EditorHistory {
  if (state.past.length === 0) return state
  return {
    past: state.past.slice(0, -1),
    present: snapshot(state.past[state.past.length - 1]!),
    future: [snapshot(state.present), ...state.future].slice(0, HISTORY_LIMIT),
  }
}

export function redo(state: EditorHistory): EditorHistory {
  if (state.future.length === 0) return state
  return {
    past: [...state.past, snapshot(state.present)].slice(-HISTORY_LIMIT),
    present: snapshot(state.future[0]!),
    future: state.future.slice(1),
  }
}
