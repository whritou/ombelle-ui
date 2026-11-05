import { describe, expect, it } from 'vitest'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { Alert, AlertDescription, AlertTitle } from '../src/templates/alert.js'
import { expectComponentContract } from './new-component-contract.js'

describe('Alert catalog contract', () => {
  it('provides Alert parts without client code or extra dependencies', () => {
    expectComponentContract('alert', {
      client: false,
      parts: ['Alert', 'AlertTitle', 'AlertDescription'],
      slots: ['alert', 'alert-title', 'alert-description'],
      dependencies: [
        { name: 'react', version: '19.3.1' },
        { name: 'clsx', version: '2.1.1' },
        { name: 'tailwind-merge', version: '3.7.0' },
      ],
      selectors: [
        "[data-slot='alert']",
        "[data-slot='alert']:has(> svg)",
        "[data-slot='alert'] > svg",
        "[data-slot='alert-title']",
        "[data-slot='alert-description']",
        "[data-slot='alert'][data-variant='destructive']",
      ],
      glass: 'experimental',
    })
  })

  it.each([
    ['default', 'status'],
    ['destructive', 'alert'],
  ] as const)('gives a %s alert the %s role', (variant, role) => {
    const html = renderToStaticMarkup(
      createElement(
        Alert,
        { variant, className: 'custom' },
        createElement(AlertTitle, null, 'Title'),
        createElement(AlertDescription, null, 'Body'),
      ),
    )
    expect(html).toContain(`role="${role}"`)
    expect(html).toContain(`data-variant="${variant}"`)
    expect(html).toContain('class="custom"')
    expect(html).toContain('data-slot="alert-title"')
    expect(html).toContain('data-slot="alert-description"')
  })

  it('lets callers override the role but not the slot', () => {
    const html = renderToStaticMarkup(
      createElement(Alert, {
        role: 'note',
        variant: 'destructive',
        ...({ 'data-slot': 'other' } as object),
      }),
    )
    expect(html).toContain('role="note"')
    expect(html).toContain('data-slot="alert"')
  })
})
