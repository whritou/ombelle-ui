import { canonicalize } from '@ombelle/compiler'
import { validateDraftEnvelope, type PresetEditorDraft } from './model.js'

export type PresetHistory = { past: PresetEditorDraft[]; present: PresetEditorDraft; future: PresetEditorDraft[]; lastEdit: { key: string; at: number } | null }
export function createPresetHistory(draft: PresetEditorDraft): PresetHistory { return { past: [], present: validateDraftEnvelope(draft), future: [], lastEdit: null } }
export function recordPresetDraft(history: PresetHistory, input: PresetEditorDraft, edit: { key: string; at: number; coalesce: boolean }): PresetHistory {
  const draft = validateDraftEnvelope(input)
  if (canonicalize(history.present) === canonicalize(draft)) return history
  const coalesced = edit.coalesce && history.lastEdit?.key === edit.key && edit.at >= history.lastEdit.at && edit.at - history.lastEdit.at < 500
  return { past: (coalesced ? history.past : [...history.past, history.present]).slice(-100), present: draft, future: [], lastEdit: edit.coalesce ? { key: edit.key, at: edit.at } : null }
}
export function undoPreset(history: PresetHistory): PresetHistory {
  if (!history.past.length) return history
  return { past: history.past.slice(0, -1), present: history.past.at(-1)!, future: [history.present, ...history.future].slice(0, 100), lastEdit: null }
}
export function redoPreset(history: PresetHistory): PresetHistory {
  if (!history.future.length) return history
  return { past: [...history.past, history.present].slice(-100), present: history.future[0], future: history.future.slice(1), lastEdit: null }
}
