import { describe, expect, it } from 'vitest'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { Progress } from '../src/templates/progress.js'
import { expectComponentContract } from './new-component-contract.js'

describe('Progress catalog contract', () => {
  it('provides Radix Progress with complete and indeterminate styles', () => {
    expectComponentContract('progress', {
      client: true,
      parts: ['Progress'],
      slots: ['progress', 'progress-indicator'],
      dependencies: [
        { name: 'react', version: '19.3.1' },
        { name: '@radix-ui/react-progress', version: '1.2.1' },
        { name: 'clsx', version: '2.1.1' },
        { name: 'tailwind-merge', version: '3.7.0' },
      ],
      selectors: [
        "[data-slot='progress']",
        "[data-slot='progress-indicator']",
        "[data-slot='progress-indicator'][data-state='complete']",
        "[data-slot='progress-indicator'][data-state='indeterminate']",
        '@media (prefers-reduced-motion: reduce)',
      ],
      glass: 'experimental',
    })
  })

  it('renders a labelled progressbar sized by its value, clamped to the range', () => {
    const html = renderToStaticMarkup(
      createElement(Progress, { value: 32, max: 64, 'aria-label': 'Installing' }),
    )
    for (const text of [
      'role="progressbar"',
      'aria-label="Installing"',
      'aria-valuemax="64"',
      'aria-valuenow="32"',
      'data-state="loading"',
      'inline-size:50%',
    ])
      expect(html).toContain(text)
    expect(renderToStaticMarkup(createElement(Progress, { value: 100 }))).toContain('data-state="complete"')
    const idle = renderToStaticMarkup(createElement(Progress))
    expect(idle).toContain('data-state="indeterminate"')
    expect(idle).not.toContain('aria-valuenow')
    expect(idle).not.toContain('inline-size')
  })
})
