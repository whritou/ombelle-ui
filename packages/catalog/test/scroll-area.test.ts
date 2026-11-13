import { describe, expect, it } from 'vitest'
import { createElement as h } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import * as radix from '../src/templates/scroll-area.js'
import * as base from '../src/templates/base/scroll-area.js'
import { getCatalog, getTemplate } from '../src/index.js'
import { expectComponentContract } from './new-component-contract.js'

const editions = [['radix', radix], ['base', base]] as const
const count = (html: string, needle: string) => html.split(needle).length - 1

describe('Scroll Area', () => {
  it('provides ScrollArea, ScrollBar and useOverflowFocus, on Radix Scroll Area and Base UI', () => {
    expectComponentContract('scroll-area', { client: true, parts: ['ScrollArea', 'ScrollBar', 'useOverflowFocus'],
      slots: ['scroll-area', 'scroll-area-viewport', 'scroll-area-scrollbar', 'scroll-area-thumb', 'scroll-area-corner'],
      dependencies: [{ name: 'react', version: '19.3.1' }, { name: '@radix-ui/react-scroll-area', version: '1.4.0' }, { name: 'clsx', version: '2.1.1' }, { name: 'tailwind-merge', version: '3.7.0' }],
      selectors: ["[data-slot='scroll-area']", "[data-slot='scroll-area-viewport']", "[data-slot='scroll-area-scrollbar']", "[data-slot='scroll-area-thumb']", "[data-slot='scroll-area-corner']"], glass: 'experimental' })
    expect(getTemplate(getCatalog('0.1.0'), 'scroll-area', 'base').dependencies.map(d => d.name)).toContain('@base-ui/react')
  })

  it.each(editions)('%s renders a named region viewport with one vertical scrollbar and no tabindex before measuring', (_, ui) => {
    const html = renderToStaticMarkup(h(ui.ScrollArea, { 'aria-label': 'Components' }, h('p', null, 'Accordion')))
    const viewport = /<div[^>]*data-slot="scroll-area-viewport"[^>]*>/.exec(html)?.[0] ?? ''
    expect(viewport).toContain('role="region"')
    expect(viewport).toContain('aria-label="Components"')
    expect(viewport).not.toContain('tabindex')
    expect(html).toContain('Accordion')
    expect(html).toContain('data-slot="scroll-area"')
    expect(count(html, 'data-slot="scroll-area-scrollbar"')).toBe(1)
    expect(html).toContain('data-orientation="vertical"')
    expect(html).toContain('data-slot="scroll-area-thumb"')
    // The bar is in the server markup but hidden: it shows on hover or while scrolling, never on first paint.
    const bar = /<div[^>]*data-slot="scroll-area-scrollbar"[^>]*>/.exec(html)?.[0] ?? ''
    expect(bar).toContain('data-state="hidden"')
    expect(html).not.toContain('data-state="visible"')
  })

  it.each(editions)('%s names the viewport from aria-labelledby', (_, ui) => {
    const html = renderToStaticMarkup(h(ui.ScrollArea, { 'aria-labelledby': 'title' }, 'x'))
    expect(html).toMatch(/data-slot="scroll-area-viewport"[^>]*aria-labelledby="title"|aria-labelledby="title"[^>]*data-slot="scroll-area-viewport"/)
  })

  it.each(editions)('%s adds a second scrollbar for the horizontal axis', (_, ui) => {
    const html = renderToStaticMarkup(h(ui.ScrollArea, null, h(ui.ScrollBar, { orientation: 'horizontal' })))
    expect(count(html, 'data-slot="scroll-area-scrollbar"')).toBe(2)
    expect(html).toContain('data-orientation="horizontal"')
  })
})
