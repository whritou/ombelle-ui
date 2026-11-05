import { describe, expect, it } from 'vitest'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import {
  Popover,
  PopoverDescription,
  PopoverTitle,
  PopoverTrigger,
} from '../src/templates/popover.js'
import { expectComponentContract } from './new-component-contract.js'

describe('Popover catalog contract', () => {
  it('provides Radix Popover parts, scoped dependencies and family styles', () => {
    expectComponentContract('popover', {
      client: true,
      parts: [
        'Popover',
        'PopoverTrigger',
        'PopoverAnchor',
        'PopoverContent',
        'PopoverTitle',
        'PopoverDescription',
      ],
      slots: [
        'popover',
        'popover-trigger',
        'popover-anchor',
        'popover-content',
        'popover-title',
        'popover-description',
      ],
      dependencies: [
        { name: 'react', version: '19.3.1' },
        { name: '@radix-ui/react-popover', version: '1.3.1' },
        { name: 'clsx', version: '2.1.1' },
        { name: 'tailwind-merge', version: '3.7.0' },
      ],
      selectors: [
        "[data-slot='popover-content']",
        "[data-slot='popover-content']:focus-visible",
        "[data-slot='popover-title']",
        "[data-slot='popover-description']",
      ],
      glass: 'experimental',
    })
  })

  it('renders a dialog trigger and heading parts', () => {
    const html = renderToStaticMarkup(
      createElement(
        Popover,
        null,
        createElement(PopoverTrigger, { className: 'custom' }, 'Share preset'),
      ),
    )
    for (const text of [
      'data-slot="popover-trigger"',
      'aria-haspopup="dialog"',
      'aria-expanded="false"',
      'class="custom"',
    ])
      expect(html).toContain(text)
    const title = renderToStaticMarkup(
      createElement(PopoverTitle, { level: 3, id: 't' }, 'Share preset'),
    )
    expect(title).toBe('<h3 id="t" data-slot="popover-title" class="">Share preset</h3>')
    expect(
      renderToStaticMarkup(createElement(PopoverTitle, null, 'Title')),
    ).toMatch(/^<h2 /)
    expect(
      renderToStaticMarkup(createElement(PopoverDescription, null, 'Body')),
    ).toContain('<p data-slot="popover-description"')
  })
})
