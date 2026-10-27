import { canonicalize } from '@ombelle/compiler'
import { createPresetDraft, validateDraftEnvelope } from './model'
import { createPresetHistory, type PresetHistory } from './history'

export const draftStorageKey = 'ombelle:preset-editor:draft:v1'
export const historyStorageKey = 'ombelle:preset-editor:history:v1'
export type PresetStorage = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>
const budget = 256 * 1024
const bytes = (value: string) => new TextEncoder().encode(value).length
function validateHistory(
  input: unknown,
  present: PresetHistory['present'],
): PresetHistory {
  if (typeof input !== 'object' || input === null || Array.isArray(input))
    throw new Error('Invalid history')
  const value = input as Record<string, unknown>
  if (
    Object.keys(value).length !== 4 ||
    !Array.isArray(value.past) ||
    !Array.isArray(value.future) ||
    value.past.length + value.future.length > 100
  )
    throw new Error('Invalid history')
  const current = validateDraftEnvelope(value.present)
  if (canonicalize(current) !== canonicalize(present))
    throw new Error('History does not match draft')
  const last = value.lastEdit as PresetHistory['lastEdit']
  if (
    last !== null &&
    (typeof last !== 'object' ||
      Object.keys(last).length !== 2 ||
      typeof last.key !== 'string' ||
      last.key.length > 100 ||
      !Number.isFinite(last.at))
  )
    throw new Error('Invalid edit grouping')
  return {
    past: value.past.map(validateDraftEnvelope),
    present: current,
    future: value.future.map(validateDraftEnvelope),
    lastEdit: last,
  }
}
export function loadPresetSession(storage: PresetStorage): {
  history: PresetHistory
  recoveryRaw: string | null
  warning: string | null
} {
  const fallback = createPresetHistory(createPresetDraft('flat'))
  let raw: string | null
  try {
    raw = storage.getItem(draftStorageKey)
  } catch {
    return {
      history: fallback,
      recoveryRaw: null,
      warning: 'Browser storage is unavailable. Edits are kept in memory.',
    }
  }
  if (raw === null)
    return { history: fallback, recoveryRaw: null, warning: null }
  let history: PresetHistory
  try {
    if (bytes(raw) > budget) throw new Error('Draft exceeds storage budget')
    history = createPresetHistory(validateDraftEnvelope(JSON.parse(raw)))
  } catch {
    return {
      history: fallback,
      recoveryRaw: raw,
      warning: 'Saved draft needs recovery. Download it before resetting.',
    }
  }
  try {
    const rawHistory = storage.getItem(historyStorageKey)
    if (rawHistory !== null) {
      if (bytes(raw + rawHistory) > budget)
        throw new Error('History exceeds budget')
      history = validateHistory(JSON.parse(rawHistory), history.present)
    }
    return { history, recoveryRaw: null, warning: null }
  } catch {
    return {
      history,
      recoveryRaw: null,
      warning: 'Saved history could not be restored; your draft is intact.',
    }
  }
}
export function savePresetSession(
  storage: PresetStorage,
  input: PresetHistory,
): { saved: boolean; warning: string | null } {
  try {
    const existing = storage.getItem(draftStorageKey)
    if (existing !== null) {
      if (bytes(existing) > budget) throw new Error('Draft needs recovery')
      validateDraftEnvelope(JSON.parse(existing))
    }
    const history = validateHistory(input, input.present)
    const raw = JSON.stringify(history.present)
    if (bytes(raw) > budget) throw new Error('Draft exceeds storage budget')
    let rawHistory = JSON.stringify(history)
    while (
      bytes(raw + rawHistory) > budget &&
      (history.past.length || history.future.length)
    ) {
      if (history.past.length) history.past.shift()
      else history.future.pop()
      rawHistory = JSON.stringify(history)
    }
    storage.setItem(draftStorageKey, raw)
    if (bytes(raw + rawHistory) <= budget)
      storage.setItem(historyStorageKey, rawHistory)
    else storage.removeItem(historyStorageKey)
    return { saved: true, warning: null }
  } catch {
    return {
      saved: false,
      warning:
        'Draft could not be saved. Edits remain in memory; download your preset or recovery data.',
    }
  }
}
