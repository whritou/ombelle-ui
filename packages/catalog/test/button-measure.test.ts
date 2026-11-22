// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest'
import { act, createElement as h } from 'react'
import { createRoot } from 'react-dom/client'
import * as radix from '../src/templates/button.js'
import * as base from '../src/templates/base/button.js'

// CAT-16: every Button read its width after every render, to keep it while loading. Only a
// Button that takes a loading prop needs that layout read.
;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true
afterEach(() => { vi.restoreAllMocks(); document.body.innerHTML = '' })

describe.each([['radix', radix], ['base', base as unknown as typeof radix]] as const)('%s Button', (_, ui) => {
  it('measures itself only when it takes a loading prop', async () => {
    const measure = vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect')
    const container = document.body.appendChild(document.createElement('div'))
    const root = createRoot(container)
    await act(async () => { root.render(h(ui.Button, null, 'Save')) })
    await act(async () => { root.render(h(ui.Button, null, 'Saved')) })
    expect(measure).not.toHaveBeenCalled()
    await act(async () => { root.render(h(ui.Button, { loading: false }, 'Save')) })
    expect(measure).toHaveBeenCalled()
    await act(async () => { root.unmount() })
  })
})
