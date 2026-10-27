import { expect, it } from 'vitest'
import { createPresetDraft, setPresetEdit } from './model'
import {
  createPresetHistory,
  recordPresetDraft,
  undoPreset,
  redoPreset,
} from './history'

it('coalesces only same-field edits within 500 ms and ignores no-ops', () => {
  const start = createPresetHistory(createPresetDraft('flat'))
  const first = recordPresetDraft(
    start,
    setPresetEdit(start.present, '/design/radiusRem', '1'),
    { key: 'radius', at: 0, coalesce: true },
  )
  const second = setPresetEdit(first.present, '/design/radiusRem', 'invalid')
  expect(
    recordPresetDraft(first, second, { key: 'radius', at: 499, coalesce: true })
      .past,
  ).toHaveLength(1)
  expect(
    recordPresetDraft(first, second, { key: 'radius', at: 501, coalesce: true })
      .past,
  ).toHaveLength(2)
  expect(
    recordPresetDraft(first, second, {
      key: 'family',
      at: 100,
      coalesce: false,
    }).past,
  ).toHaveLength(2)
  expect(
    recordPresetDraft(first, first.present, {
      key: 'radius',
      at: 100,
      coalesce: true,
    }),
  ).toEqual(first)
})

it('bounds snapshots and preserves invalid strings through undo and redo', () => {
  let history = createPresetHistory(createPresetDraft('flat'))
  for (let n = 0; n < 105; n++)
    history = recordPresetDraft(
      history,
      setPresetEdit(history.present, '/design/radiusRem', String(n)),
      { key: 'radius', at: n * 1000, coalesce: true },
    )
  expect(history.past).toHaveLength(100)
  const invalid = recordPresetDraft(
    history,
    setPresetEdit(history.present, '/design/radiusRem', '-'),
    { key: 'radius', at: 999999, coalesce: true },
  )
  expect(
    redoPreset(undoPreset(invalid)).present.edits['/design/radiusRem'],
  ).toBe('-')
  const branch = recordPresetDraft(
    undoPreset(invalid),
    createPresetDraft('minimalist'),
    { key: 'family', at: 1000000, coalesce: false },
  )
  expect(branch.future).toHaveLength(0)
  expect(history.present.edits['/design/radiusRem']).toBe('104')
})
