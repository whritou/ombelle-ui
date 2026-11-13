import { describe, expect, it } from 'vitest'
import { createElement as h } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { getCatalog, getTemplate } from '../src/index.js'
import { AspectRatio } from '../src/templates/aspect-ratio.js'
import { expectComponentContract } from './new-component-contract.js'

describe('Aspect Ratio', () => {
  it('provides one server template for both editions with no dependency', () => {
    expectComponentContract('aspect-ratio', { client: false, parts: ['AspectRatio'], slots: ['aspect-ratio'],
      dependencies: [{ name: 'react', version: '19.3.1' }, { name: 'clsx', version: '2.1.1' }, { name: 'tailwind-merge', version: '3.7.0' }],
      selectors: ["[data-slot='aspect-ratio']"], glass: 'experimental' })
    const catalog = getCatalog('0.1.0')
    expect(getTemplate(catalog, 'aspect-ratio', 'base').content).toBe(getTemplate(catalog, 'aspect-ratio', 'radix').content)
  })

  it('keeps the given ratio, 16 / 9 by default, and the caller style', () => {
    expect(renderToStaticMarkup(h(AspectRatio, { ratio: 4 / 3 }))).toContain('aspect-ratio:1.3333333333333333')
    const html = renderToStaticMarkup(h(AspectRatio, { style: { maxInlineSize: '20rem' } }, h('img', { src: '/a.png', alt: 'Dunes' })))
    expect(html).toMatch(/<div[^>]*data-slot="aspect-ratio"/)
    expect(html).toContain('aspect-ratio:1.7777777777777777')
    expect(html).toContain('max-inline-size:20rem')
  })
})
