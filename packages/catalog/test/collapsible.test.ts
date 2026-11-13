import { describe, expect, it } from 'vitest'
import { createElement as h } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import * as radix from '../src/templates/collapsible.js'
import * as base from '../src/templates/base/collapsible.js'
import { getCatalog, getTemplate } from '../src/index.js'
import { expectComponentContract } from './new-component-contract.js'

const editions = [['radix', radix], ['base', base]] as const
const parts = ['Collapsible', 'CollapsibleTrigger', 'CollapsibleContent']

describe('Collapsible', () => {
  it('provides Collapsible, CollapsibleTrigger and CollapsibleContent, on Radix Collapsible and Base UI', () => {
    expectComponentContract('collapsible', { client: true, parts,
      slots: ['collapsible', 'collapsible-trigger', 'collapsible-icon', 'collapsible-content'],
      dependencies: [{ name: 'react', version: '19.3.1' }, { name: '@radix-ui/react-collapsible', version: '1.2.1' }, { name: 'clsx', version: '2.1.1' }, { name: 'tailwind-merge', version: '3.7.0' }, { name: 'lucide-react', version: '1.55.0' }],
      selectors: ["[data-slot='collapsible']", "[data-slot='collapsible-trigger']", "[data-slot='collapsible-icon']", "[data-slot='collapsible-content']"], glass: 'experimental' })
    expect(getTemplate(getCatalog('0.1.0'), 'collapsible', 'base').dependencies.map(d => d.name)).toContain('@base-ui/react')
  })

  it.each(editions)('%s renders an open collapsible with linked trigger and content', (_, ui) => {
    const html = renderToStaticMarkup(h(ui.Collapsible, { defaultOpen: true },
      h(ui.CollapsibleTrigger, null, 'Advanced shadow'), h(ui.CollapsibleContent, null, 'Offset X')))
    expect(html).toContain('data-slot="collapsible"')
    expect(html).toContain('data-state="open"')
    expect(html).toContain('aria-expanded="true"')
    const controls = /aria-controls="([^"]+)"/.exec(html)?.[1]
    expect(controls).toBeTruthy()
    expect(html).toMatch(new RegExp(`data-slot="collapsible-content"[^>]*id="${controls}"|id="${controls}"[^>]*data-slot="collapsible-content"`))
    expect(html).toMatch(/data-slot="collapsible-icon"[^>]*aria-hidden="true"|aria-hidden="true"[^>]*data-slot="collapsible-icon"/)
    expect(html).toContain('Offset X')
  })

  it.each(editions)('%s leaves closed content out of the page', (_, ui) => {
    const html = renderToStaticMarkup(h(ui.Collapsible, { defaultOpen: false },
      h(ui.CollapsibleTrigger, null, 'Advanced shadow'), h(ui.CollapsibleContent, null, h('a', { href: '#x' }, 'Offset X'))))
    expect(html).toContain('aria-expanded="false"')
    expect(html).toContain('data-state="closed"')
    expect(html).not.toContain('Offset X')
  })

  it('radix leaves the icon out when the trigger renders its child', () => {
    const html = renderToStaticMarkup(h(radix.Collapsible, null,
      h(radix.CollapsibleTrigger, { asChild: true }, h('a', { href: '#more' }, 'More'))))
    expect(html).not.toContain('collapsible-icon')
    expect(html).toContain('href="#more"')
  })

  it('base leaves the icon out when the trigger takes a render element', () => {
    const html = renderToStaticMarkup(h(base.Collapsible, null,
      h(base.CollapsibleTrigger, { render: h('a', { href: '#more' }), nativeButton: false }, 'More')))
    expect(html).not.toContain('collapsible-icon')
    expect(html).toContain('href="#more"')
  })
})
