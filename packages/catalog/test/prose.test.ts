import { describe, expect, it } from 'vitest'
import { createElement as h } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { getCatalog, getTemplate } from '../src/index.js'
import { Prose, ProseLead } from '../src/templates/prose.js'
import { expectComponentContract } from './new-component-contract.js'

describe('Prose', () => {
  it('provides one server template for both editions with no dependency', () => {
    expectComponentContract('prose', { client: false, parts: ['Prose', 'ProseLead'], slots: ['prose', 'prose-lead'],
      dependencies: [{ name: 'react', version: '19.3.1' }, { name: 'clsx', version: '2.1.1' }, { name: 'tailwind-merge', version: '3.7.0' }],
      selectors: ["[data-slot='prose']", "[data-slot='prose-lead']"], glass: 'stable' })
    const catalog = getCatalog('0.1.0')
    expect(getTemplate(catalog, 'prose', 'base').content).toBe(getTemplate(catalog, 'prose', 'radix').content)
  })

  it('forwards className and keeps nested markup', () => {
    const html = renderToStaticMarkup(h(Prose, { className: 'docs' },
      h('h2', null, 'Install'), h(ProseLead, null, 'Lead'), h('ul', null, h('li', null, 'One')),
      h('pre', { 'data-slot': 'code-block' }, h('code', null, 'pnpm add'))))
    expect(html).toMatch(/^<div[^>]*data-slot="prose"[^>]*class="docs"/)
    expect(html).toContain('<h2>Install</h2>')
    expect(html).toMatch(/<p data-slot="prose-lead"[^>]*>Lead<\/p>/)
    expect(html).toContain('<pre data-slot="code-block"><code>pnpm add</code></pre>')
  })

  it('sets the measure marker only when one is chosen', () => {
    expect(renderToStaticMarkup(h(Prose))).not.toContain('data-measure')
    expect(renderToStaticMarkup(h(Prose, { measure: 'narrow' }))).toContain('data-measure="narrow"')
  })

  it('does not restyle a nested Code Block or any other catalog component', () => {
    const styles = getTemplate(getCatalog('0.1.0'), 'prose').styles!
    for (const [family, css] of Object.entries(styles)) {
      expect(css, family).not.toContain("[data-slot='code-block']")
      // Every element rule skips elements inside, or carrying, another component's slot.
      for (const [, selector] of css!.matchAll(/([^{}@]+)\{/g))
        if (/:where\((?!:not)/.test(selector!)) expect(selector, family).toContain(':where(:not([data-slot], [data-prose] [data-slot] *))')
    }
  })
})
