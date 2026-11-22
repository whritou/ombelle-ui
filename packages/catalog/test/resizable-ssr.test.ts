// @vitest-environment jsdom
import { afterEach, describe, expect, it } from 'vitest'
import { act, createElement as h } from 'react'
import { renderToString } from 'react-dom/server'
import { hydrateRoot } from 'react-dom/client'
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from '../src/templates/resizable.js'

// CAT-06: with autoSaveId, a server-rendered page carried the default sizes and hydration kept
// them, so the saved layout came back only in client-rendered apps.
;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true
// jsdom has no layout: give every element a 1000 by 500 box and report it to observers, so the
// library measures the group as a browser would.
const box = { x: 0, y: 0, top: 0, left: 0, right: 1000, bottom: 500, width: 1000, height: 500, toJSON() {} }
HTMLElement.prototype.getBoundingClientRect = () => box as DOMRect
for (const key of ['offsetWidth', 'clientWidth', 'scrollWidth'] as const) Object.defineProperty(HTMLElement.prototype, key, { configurable: true, get: () => 1000 })
for (const key of ['offsetHeight', 'clientHeight', 'scrollHeight'] as const) Object.defineProperty(HTMLElement.prototype, key, { configurable: true, get: () => 500 })
globalThis.ResizeObserver = class {
  constructor(private callback: ResizeObserverCallback) {}
  observe(target: Element) {
    const size = [{ inlineSize: 1000, blockSize: 500 }]
    queueMicrotask(() => this.callback([{ target, contentRect: box, borderBoxSize: size, contentBoxSize: size, devicePixelContentBoxSize: size } as unknown as ResizeObserverEntry], this as unknown as ResizeObserver))
  }
  unobserve() {}
  disconnect() {}
} as unknown as typeof ResizeObserver
afterEach(() => { localStorage.clear(); document.body.innerHTML = '' })

const page = () => h(ResizablePanelGroup, { autoSaveId: 'ssr-split' },
  h(ResizablePanel, { id: 'a', defaultSize: 50 }, 'A'),
  h(ResizableHandle, { 'aria-label': 'Resize' }),
  h(ResizablePanel, { id: 'b', defaultSize: 50 }, 'B'))

describe('Resizable autoSaveId on a server-rendered page', () => {
  it('applies the saved layout after hydration', async () => {
    // Rendered while storage is empty, as on a server.
    const html = renderToString(page())
    localStorage.setItem('ssr-split', JSON.stringify({ a: 75, b: 25 }))
    const container = document.createElement('div')
    container.innerHTML = html
    document.body.append(container)
    await act(async () => { hydrateRoot(container, page()) })
    await act(async () => { await new Promise(resolve => setTimeout(resolve, 20)) })
    const handle = container.querySelector('[data-slot="resizable-handle"]')!
    expect(handle.getAttribute('aria-valuenow')).toBe('75')
  })
})
