import { describe, expect, it } from 'vitest'
import { createEditorDraft, type EditorView } from './model.js'
import { recordDraft, redo, undo, type EditorHistory } from './history.js'

const initial = (): EditorHistory => ({ past: [], present: createEditorDraft('flat'), future: [] })
const withContent = (state: EditorHistory, content: string) => ({ ...state.present.recipe, content })

describe('Button editor history', () => {
  it('undoes and redoes a recipe edit in one step', () => {
    const start = initial()
    const edited = recordDraft(start, withContent(start, 'Save'), { groupKey: 'content', at: 1000 })
    expect(undo(edited).present.recipe.content).toBe('Save changes')
    expect(redo(undo(edited)).present.recipe.content).toBe('Save')
    expect(start.present.recipe.content).toBe('Save changes')
  })

  it('clears redo when a new recipe edit follows undo', () => {
    const start = initial()
    const first = recordDraft(start, withContent(start, 'First'), { groupKey: 'content', at: 1000 })
    const undone = undo(first)
    const next = recordDraft(undone, withContent(undone, 'Other'), { groupKey: 'content', at: 2000 })
    expect(next.future).toEqual([])
    expect(redo(next).present.recipe.content).toBe('Other')
  })

  it('keeps at most 100 undo snapshots', () => {
    let state = initial()
    for (let index = 1; index <= 105; index++) {
      state = recordDraft(state, withContent(state, `Edit ${index}`), { groupKey: 'content', at: index * 1000 })
    }
    expect(state.past).toHaveLength(100)
    for (let index = 0; index < 100; index++) state = undo(state)
    expect(state.present.recipe.content).toBe('Edit 5')
    expect(undo(state).present.recipe.content).toBe('Edit 5')
  })

  it('groups adjacent same-field edits within 500 ms', () => {
    const start = initial()
    const a = recordDraft(start, withContent(start, 'S'), { groupKey: 'content', at: 1000 })
    const b = recordDraft(a, withContent(a, 'Sa'), { groupKey: 'content', at: 1500 })
    const c = recordDraft(b, withContent(b, 'Save'), { groupKey: 'content', at: 1700 })
    expect(c.past).toHaveLength(1)
    expect(undo(c).present.recipe.content).toBe('Save changes')
    const d = recordDraft(c, withContent(c, 'Saved'), { groupKey: 'content', at: 2201 })
    expect(d.past).toHaveLength(2)
    expect(undo(d).present.recipe.content).toBe('Save')
  })

  it('starts a new undo step when the edited field changes', () => {
    const start = initial()
    const a = recordDraft(start, withContent(start, 'Save'), { groupKey: 'content', at: 1000 })
    const b = recordDraft(a, { ...a.present.recipe, props: { ...a.present.recipe.props, disabled: true } }, { groupKey: 'disabled', at: 1100 })
    expect(b.past).toHaveLength(2)
    expect(undo(b).present.recipe.props.disabled).toBe(false)
  })

  it('ignores unchanged recipes and view-only changes', () => {
    const start = initial()
    const view: EditorView = { mode: 'light', viewport: 'wide', panel: 'preview', forcedState: 'none' }
    const nextView: EditorView = { ...view, mode: 'dark', viewport: 'narrow', forcedState: 'hover' }
    expect(nextView.mode).toBe('dark')
    const unchanged = recordDraft(start, structuredClone(start.present.recipe), { groupKey: 'mode', at: 1000 })
    expect(unchanged).toBe(start)
    expect(unchanged.past).toEqual([])
  })

  it('takes immutable snapshots of edited recipes', () => {
    const start = initial()
    const recipe = withContent(start, 'Save')
    const edited = recordDraft(start, recipe, { groupKey: 'content', at: 1000 })
    recipe.content = 'Mutated later'
    expect(edited.present.recipe.content).toBe('Save')
  })
})
