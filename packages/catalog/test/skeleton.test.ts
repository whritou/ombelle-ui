import { describe, expect, it } from 'vitest'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { Skeleton } from '../src/templates/skeleton.js'
import { expectComponentContract } from './new-component-contract.js'

describe('Skeleton catalog contract', () => {
  it('provides a decorative Skeleton without client code or extra dependencies', () => {
    expectComponentContract('skeleton', {
      client: false,
      parts: ['Skeleton'],
      slots: ['skeleton'],
      dependencies: [
        { name: 'react', version: '19.3.1' },
        { name: 'clsx', version: '2.1.1' },
        { name: 'tailwind-merge', version: '3.7.0' },
      ],
      selectors: [
        "[data-slot='skeleton']",
        "[data-slot='skeleton'][data-shape='circle']",
        "[data-slot='skeleton'][data-shape='block']",
        '@media (prefers-reduced-motion: reduce)',
      ],
      glass: 'experimental',
    })
  })

  it('is hidden from assistive technology and records its shape', () => {
    const html = renderToStaticMarkup(
      createElement(Skeleton, { shape: 'circle', className: 'custom', style: { inlineSize: '60%' } }),
    )
    expect(html).toBe(
      '<div aria-hidden="true" style="inline-size:60%" data-slot="skeleton" data-shape="circle" class="custom"></div>',
    )
    expect(renderToStaticMarkup(createElement(Skeleton))).toContain('data-shape="text"')
  })
})
