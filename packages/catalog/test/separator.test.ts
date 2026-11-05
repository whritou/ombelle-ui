import { describe, expect, it } from 'vitest'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { Separator } from '../src/templates/separator.js'
import { expectComponentContract } from './new-component-contract.js'

describe('Separator catalog contract', () => {
  it('provides Radix Separator with orientation and label styles', () => {
    expectComponentContract('separator', {
      client: true,
      parts: ['Separator'],
      slots: ['separator', 'separator-label'],
      dependencies: [
        { name: 'react', version: '19.3.1' },
        { name: '@radix-ui/react-separator', version: '1.2.0' },
        { name: 'clsx', version: '2.1.1' },
        { name: 'tailwind-merge', version: '3.7.0' },
      ],
      selectors: [
        "[data-slot='separator']",
        "[data-slot='separator'][data-orientation='horizontal']",
        "[data-slot='separator'][data-orientation='vertical']",
        "[data-slot='separator'][data-labelled][data-orientation='horizontal']",
        "[data-slot='separator'][data-labelled][data-orientation='horizontal']::before",
      ],
      glass: 'unavailable',
    })
  })

  it('is decorative by default and semantic on request', () => {
    const plain = renderToStaticMarkup(createElement(Separator))
    expect(plain).toContain('role="none"')
    expect(plain).toContain('data-orientation="horizontal"')
    expect(plain).not.toContain('data-labelled')
    const vertical = renderToStaticMarkup(
      createElement(Separator, { orientation: 'vertical', decorative: false }),
    )
    expect(vertical).toContain('role="separator"')
    expect(vertical).toContain('aria-orientation="vertical"')
    const labelled = renderToStaticMarkup(createElement(Separator, null, 'or'))
    expect(labelled).toContain('data-labelled=""')
    expect(labelled).toContain('<span data-slot="separator-label">or</span>')
  })
})
