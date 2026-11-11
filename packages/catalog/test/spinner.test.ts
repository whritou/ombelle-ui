import { describe, expect, it } from 'vitest'
import { createElement as h } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { getCatalog, getTemplate } from '../src/index.js'
import { styleFamilies } from '@ombelle/contracts'
import { Spinner } from '../src/templates/spinner.js'
import { expectComponentContract } from './new-component-contract.js'

const base = [
  { name: 'react', version: '19.3.1' },
  { name: 'clsx', version: '2.1.1' },
  { name: 'tailwind-merge', version: '3.7.0' },
]

describe('Spinner', () => {
  it('provides a presentational Spinner without client code or extra dependencies', () => {
    expectComponentContract('spinner', { client: false, parts: ['Spinner'], slots: ['spinner'], dependencies: base,
      selectors: ["[data-slot='spinner']"], glass: 'experimental' })
  })

  it('announces itself as a status named Loading, overridable by aria-label', () => {
    expect(renderToStaticMarkup(h(Spinner))).toMatch(/^<svg[^>]*role="status"[^>]*aria-label="Loading"/)
    expect(renderToStaticMarkup(h(Spinner, { 'aria-label': 'Saving' }))).toContain('aria-label="Saving"')
    expect(renderToStaticMarkup(h(Spinner, { size: 'lg' }))).toContain('data-size="lg"')
  })

  it('stays silent when hidden inside a labelled control', () => {
    const html = renderToStaticMarkup(h(Spinner, { 'aria-hidden': true }))
    expect(html).toContain('aria-hidden="true"')
    expect(html).not.toContain('role=')
    expect(html).not.toContain('aria-label')
  })

  it.each(styleFamilies)('%s slows the spin under reduced motion instead of stopping it', family => {
    const css = getTemplate(getCatalog('0.1.0'), 'spinner').styles![family]!
    expect(css).toMatch(/@media \(prefers-reduced-motion: reduce\)\s*\{[^}]*\[data-slot='spinner'\]\s*\{[^}]*animation-duration: 3s/)
  })
})
