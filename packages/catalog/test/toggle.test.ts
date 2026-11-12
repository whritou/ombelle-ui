import { describe, expect, it } from 'vitest'
import { createElement as h } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import * as radix from '../src/templates/toggle.js'
import * as base from '../src/templates/base/toggle.js'
import { getCatalog, getTemplate } from '../src/index.js'
import { expectComponentContract } from './new-component-contract.js'

const editions = [['radix', radix], ['base', base]] as const

describe('Toggle', () => {
  it('provides Toggle, on Radix Toggle and Base UI', () => {
    expectComponentContract('toggle', { client: true, parts: ['Toggle'], slots: ['toggle'],
      dependencies: [{ name: 'react', version: '19.3.1' }, { name: '@radix-ui/react-toggle', version: '1.2.1' }, { name: 'clsx', version: '2.1.1' }, { name: 'tailwind-merge', version: '3.7.0' }],
      selectors: ["[data-slot='toggle']"], glass: 'experimental' })
    expect(getTemplate(getCatalog('0.1.0'), 'toggle', 'base').dependencies.map(d => d.name)).toContain('@base-ui/react')
  })

  it.each(editions)('%s renders a pressed button with its state, variant and size', (_, ui) => {
    const html = renderToStaticMarkup(h(ui.Toggle, { defaultPressed: true, 'aria-label': 'Show grid' }))
    expect(html).toContain('type="button"')
    expect(html).toContain('aria-pressed="true"')
    expect(html).toContain('data-slot="toggle"')
    expect(html).toContain('data-state="on"')
    expect(html).toContain('data-variant="default"')
    expect(html).toContain('data-size="default"')
  })

  it.each(editions)('%s renders an unpressed outline toggle', (_, ui) => {
    const html = renderToStaticMarkup(h(ui.Toggle, { variant: 'outline', size: 'lg', 'aria-label': 'Outlines' }))
    expect(html).toContain('aria-pressed="false"')
    expect(html).toContain('data-state="off"')
    expect(html).toContain('data-variant="outline"')
    expect(html).toContain('data-size="lg"')
  })
})
