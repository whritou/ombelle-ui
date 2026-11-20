// @vitest-environment jsdom
import { act, createElement } from 'react'
import { createRoot } from 'react-dom/client'
import { expect, it } from 'vitest'
import type { Preset } from '@ombelle/contracts'
import { createPresetDraft, setPresetEdit, type PresetEditorDraft } from './model'
import { useLivePreset } from './use-live-preset'

;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

function run(drafts: PresetEditorDraft[]) {
  const seen: { preset: Preset | null; lastValid: Preset | null }[] = []
  let draft = drafts[0]
  function Probe({ value }: { value: PresetEditorDraft }) {
    seen.push(useLivePreset(value))
    return null
  }
  const root = createRoot(document.createElement('div'))
  act(() => root.render(createElement(Probe, { value: draft })))
  for (const next of drafts.slice(1)) {
    draft = next
    act(() => root.render(createElement(Probe, { value: draft })))
  }
  act(() => root.unmount())
  return seen
}
const radius = (draft: PresetEditorDraft, value: string) => setPresetEdit(draft, '/design/radiusRem', value)

it('returns the materialized draft and keeps the last valid preset when an edit is invalid', () => {
  const base = createPresetDraft('flat')
  for (const bad of ['', 'abc', '9']) {
    const good = radius(base, '0.5')
    const [first, second, third] = run([base, good, radius(base, bad)])
    expect(first.preset).not.toBeNull()
    expect(first.lastValid).toBe(first.preset)
    expect(second.preset?.design.radiusRem).toBe(0.5)
    expect(third.preset).toBeNull()
    expect(third.lastValid).toBe(second.preset)
  }
})
it('has no preset at all when the first draft is invalid', () => {
  const [only] = run([radius(createPresetDraft('flat'), '')])
  expect(only).toEqual({ preset: null, lastValid: null })
})
