import { expect, it } from 'vitest'
import { createPresetDraft, editablePaths, setPresetEdit } from './model'
import { createPresetHistory, recordPresetDraft } from './history'
import {
  loadPresetSession,
  savePresetSession,
  draftStorageKey,
  historyStorageKey,
  type PresetStorage,
} from './storage'

function memory() {
  const values = new Map<string, string>([
    ['ombelle.button-editor.draft', 'untouched'],
  ])
  const storage: PresetStorage = {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => {
      values.set(key, value)
    },
    removeItem: (key) => {
      values.delete(key)
    },
  }
  return { values, storage }
}
it('round-trips raw draft and history independently of the recipe editor', () => {
  const { storage, values } = memory()
  const first = createPresetHistory(createPresetDraft('flat'))
  const history = recordPresetDraft(
    first,
    setPresetEdit(first.present, '/design/radiusRem', '-'),
    { key: 'radius', at: 1, coalesce: true },
  )
  expect(savePresetSession(storage, history).saved).toBe(true)
  expect(loadPresetSession(storage).history).toEqual(history)
  expect(values.get('ombelle.button-editor.draft')).toBe('untouched')
  expect(draftStorageKey).toBe('ombelle:preset-editor:draft:v1')
  expect(historyStorageKey).toBe('ombelle:preset-editor:history:v1')
})
it.each([
  '{broken',
  '{"storageVersion":99}',
  JSON.stringify({ ...createPresetDraft('flat'), edits: { '/unknown': 'x' } }),
])('preserves original corrupt bytes: %s', (raw) => {
  const { storage, values } = memory()
  values.set(draftStorageKey, raw)
  expect(loadPresetSession(storage).recoveryRaw).toBe(raw)
  expect(
    savePresetSession(storage, createPresetHistory(createPresetDraft('flat')))
      .saved,
  ).toBe(false)
  expect(values.get(draftStorageKey)).toBe(raw)
})
it('discards inconsistent history without losing the authoritative valid draft', () => {
  const { storage, values } = memory()
  savePresetSession(
    storage,
    createPresetHistory(createPresetDraft('minimalist')),
  )
  values.set(
    historyStorageKey,
    JSON.stringify(createPresetHistory(createPresetDraft('flat'))),
  )
  const loaded = loadPresetSession(storage)
  expect(loaded.history.present.family).toBe('minimalist')
  expect(loaded.warning).toBeTruthy()
  expect(loaded.recoveryRaw).toBeNull()
})
it('trims oldest history by UTF-8 bytes and tolerates access and partial-write failure', () => {
  const { storage, values } = memory()
  let draft = createPresetDraft('flat')
  for (const path of editablePaths)
    draft = setPresetEdit(draft, path, 'é'.repeat(80))
  let history = createPresetHistory(draft)
  for (let n = 0; n < 100; n++)
    history = recordPresetDraft(
      history,
      { ...draft, identity: { ...draft.identity, revision: String(n + 1) } },
      { key: 'id', at: n, coalesce: false },
    )
  expect(savePresetSession(storage, history).saved).toBe(true)
  expect(
    new TextEncoder().encode(
      values.get(draftStorageKey)! + values.get(historyStorageKey)!,
    ).length,
  ).toBeLessThanOrEqual(256 * 1024)
  expect(loadPresetSession(storage).history.past.length).toBeLessThan(99)
  expect(
    loadPresetSession({
      ...storage,
      getItem() {
        throw new Error('denied')
      },
    }).warning,
  ).toBeTruthy()
  expect(
    savePresetSession(
      {
        ...storage,
        setItem() {
          throw new Error('denied')
        },
      },
      history,
    ).saved,
  ).toBe(false)
  const partial = {
    ...storage,
    setItem(key: string, value: string) {
      if (key === historyStorageKey) throw new Error('quota')
      storage.setItem(key, value)
    },
  }
  expect(
    savePresetSession(
      partial,
      createPresetHistory(createPresetDraft('neo-brutalism')),
    ).saved,
  ).toBe(false)
  expect(loadPresetSession(storage).history.present.family).toBe(
    'neo-brutalism',
  )
})
