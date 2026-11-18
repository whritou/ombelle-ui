import { describe, expect, it } from 'vitest'
import { createElement as h } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { getCatalog, getTemplate } from '../src/index.js'
import { ResizableHandle, ResizablePanel, ResizablePanelGroup, readSavedLayout } from '../src/templates/resizable.js'
import { expectComponentContract } from './new-component-contract.js'

const tag = (html: string, pattern: string) => html.match(new RegExp(`<[^>]*${pattern}[^>]*>`))?.[0] ?? ''

describe('Resizable', () => {
  it('provides one template for both editions over react-resizable-panels', () => {
    expectComponentContract('resizable', { client: true, parts: ['ResizablePanelGroup', 'ResizablePanel', 'ResizableHandle'],
      slots: ['resizable-panel-group', 'resizable-panel', 'resizable-handle', 'resizable-handle-grip'],
      dependencies: [{ name: 'react', version: '19.3.1' }, { name: 'react-resizable-panels', version: '4.17.0' }, { name: 'clsx', version: '2.1.1' }, { name: 'tailwind-merge', version: '3.7.0' }],
      selectors: ["[data-slot='resizable-panel-group']", "[data-slot='resizable-handle']", "[data-slot='resizable-handle-grip']"], glass: 'experimental' })
    const catalog = getCatalog('0.1.0')
    expect(getTemplate(catalog, 'resizable', 'base').content).toBe(getTemplate(catalog, 'resizable', 'radix').content)
  })

  it('renders the handle as a separator with a grip on request', () => {
    const html = renderToStaticMarkup(h(ResizablePanelGroup, { direction: 'horizontal' },
      h(ResizablePanel, { defaultSize: 60 }, 'Preview'), h(ResizableHandle, { withHandle: true }), h(ResizablePanel, { defaultSize: 40 }, 'Controls')))
    expect(tag(html, 'data-slot="resizable-panel-group"')).toContain('data-direction="horizontal"')
    expect(tag(html, 'data-slot="resizable-handle"')).toContain('role="separator"')
    expect(html).toContain('data-slot="resizable-handle-grip"')
  })

  it('ignores a saved layout that is malformed or out of range', () => {
    const storage = (value: string | null) => ({ getItem: () => value, setItem: () => {} })
    expect(readSavedLayout(storage('{bad'), 'k')).toBeNull()
    expect(readSavedLayout(storage(JSON.stringify({ a: 150, b: 100 })), 'k')).toBeNull()
    expect(readSavedLayout(storage(JSON.stringify({ a: 'wide', b: 40 })), 'k')).toBeNull()
    expect(readSavedLayout(storage(null), 'k')).toBeNull()
    expect(readSavedLayout(storage(JSON.stringify({ a: 60, b: 40 })), 'k')).toBe(JSON.stringify({ a: 60, b: 40 }))
    expect(readSavedLayout({ getItem: () => { throw new Error('blocked') }, setItem: () => {} }, 'k')).toBeNull()
  })
})
