import { describe, expect, it } from 'vitest'
import { createElement as h } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import * as radix from '../src/templates/empty.js'
import * as base from '../src/templates/base/empty.js'
import { expectComponentContract } from './new-component-contract.js'

const slots = ['empty', 'empty-header', 'empty-media', 'empty-title', 'empty-description', 'empty-content']

describe('Empty State', () => {
  it('provides the Empty parts with their slots', () => {
    expectComponentContract('empty', { client: false, parts: ['Empty', 'EmptyHeader', 'EmptyMedia', 'EmptyTitle', 'EmptyDescription', 'EmptyContent'],
      slots, dependencies: [{ name: 'react', version: '19.3.1' }, { name: 'clsx', version: '2.1.1' }, { name: 'tailwind-merge', version: '3.7.0' },
        { name: '@radix-ui/react-slot', version: '1.5.0' }],
      selectors: slots.map(slot => `[data-slot='${slot}']`), glass: 'experimental' })
  })

  it.each([['radix', radix], ['base', base]] as const)('%s renders a structure whose title level the app chooses', (_, ui) => {
    const html = renderToStaticMarkup(h(ui.Empty, null, h(ui.EmptyHeader, null,
      h(ui.EmptyMedia, { variant: 'icon' }, 'icon'), h(ui.EmptyTitle, null, 'No presets yet'),
      h(ui.EmptyDescription, null, 'Start from a built-in family.')), h(ui.EmptyContent, null, 'actions')))
    for (const slot of slots) expect(html).toContain(`data-slot="${slot}"`)
    expect(html).toMatch(/<div[^>]*data-slot="empty-title"[^>]*>No presets yet<\/div>/)
    expect(html).toMatch(/<p[^>]*data-slot="empty-description"/)
    expect(html).toContain('data-variant="icon"')
  })

  it('renders the title as the heading the app passes', () => {
    expect(renderToStaticMarkup(h(radix.EmptyTitle, { asChild: true }, h('h2', null, 'No presets yet'))))
      .toMatch(/^<h2[^>]*data-slot="empty-title"/)
    expect(renderToStaticMarkup(h(base.EmptyTitle, { render: h('h2') }, 'No presets yet')))
      .toMatch(/^<h2[^>]*data-slot="empty-title"/)
  })
})
