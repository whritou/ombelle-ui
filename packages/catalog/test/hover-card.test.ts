import { describe, expect, it } from 'vitest'
import { createElement as h } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { getCatalog, getTemplate } from '../src/index.js'
import * as radix from '../src/templates/hover-card.js'
import * as base from '../src/templates/base/hover-card.js'
import { expectComponentContract } from './new-component-contract.js'

type Ui = typeof radix

describe('Hover Card', () => {
  it('provides its parts, with the Radix hover card in the Radix edition only', () => {
    expectComponentContract('hover-card', { client: true, parts: ['HoverCard', 'HoverCardTrigger', 'HoverCardContent', 'HoverCardArrow'],
      slots: ['hover-card', 'hover-card-trigger', 'hover-card-content', 'hover-card-arrow'],
      dependencies: [{ name: '@radix-ui/react-hover-card', version: '1.2.1' }, { name: 'react', version: '19.3.1' }, { name: 'clsx', version: '2.1.1' }, { name: 'tailwind-merge', version: '3.7.0' }],
      selectors: ["[data-slot='hover-card-trigger']", "[data-slot='hover-card-content']", "[data-slot='hover-card-arrow']"], glass: 'experimental' })
    const baseDependencies = getTemplate(getCatalog('0.1.0'), 'hover-card', 'base').dependencies.map(d => d.name)
    expect(baseDependencies).toContain('@base-ui/react')
    expect(baseDependencies.some(name => name.startsWith('@radix-ui/'))).toBe(false)
  })

  it.each([['radix', radix], ['base', base as unknown as Ui]] as const)('%s renders the trigger as a working link', (_, ui) => {
    const html = renderToStaticMarkup(h(ui.HoverCard, null, h(ui.HoverCardTrigger, { href: '/team/ombelle' }, '@ombelle'),
      h(ui.HoverCardContent, null, 'Card', h(ui.HoverCardArrow))))
    expect(html).toMatch(/^<a[^>]*href="\/team\/ombelle"/)
    expect(html).toContain('data-slot="hover-card-trigger"')
    expect(html).toContain('>@ombelle</a>')
  })
})
