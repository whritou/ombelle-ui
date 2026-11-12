import { describe, expect, it } from 'vitest'
import { createElement as h } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { getCatalog, getTemplate } from '../src/index.js'
import { ButtonGroup, ButtonGroupSeparator, ButtonGroupText } from '../src/templates/button-group.js'
import { expectComponentContract } from './new-component-contract.js'
import { lintCatalogStyles, templateSlots } from '../../../scripts/catalog-style-lint.js'

const slots = ['button-group', 'button-group-separator', 'button-group-text']

describe('Button Group', () => {
  it('provides the parts without client code or extra dependencies', () => {
    expectComponentContract('button-group', { client: false, parts: ['ButtonGroup', 'ButtonGroupSeparator', 'ButtonGroupText'], slots,
      dependencies: [{ name: 'react', version: '19.3.1' }, { name: 'clsx', version: '2.1.1' }, { name: 'tailwind-merge', version: '3.7.0' }],
      selectors: ["[data-slot='button-group'] > *", ...slots.map(slot => `[data-slot='${slot}']`)], glass: 'experimental' })
  })

  it('serves both editions from one template', () => {
    const catalog = getCatalog('0.1.0')
    expect(getTemplate(catalog, 'button-group', 'base').content).toBe(getTemplate(catalog, 'button-group', 'radix').content)
  })

  it('renders a labelled horizontal group', () => {
    const html = renderToStaticMarkup(h(ButtonGroup, { 'aria-label': 'History' }, h('button', null, 'Undo'), h('button', null, 'Redo')))
    expect(html).toMatch(/^<div[^>]*role="group"/)
    expect(html).toContain('data-slot="button-group"')
    expect(html).toContain('data-orientation="horizontal"')
    expect(html).toContain('aria-label="History"')
  })

  it('crosses the separator orientation with the group', () => {
    expect(renderToStaticMarkup(h(ButtonGroupSeparator)))
      .toMatch(/role="separator"[^>]*aria-orientation="vertical"|aria-orientation="vertical"[^>]*role="separator"/)
    expect(renderToStaticMarkup(h(ButtonGroupSeparator, { orientation: 'vertical' }))).toContain('aria-orientation="horizontal"')
    expect(renderToStaticMarkup(h(ButtonGroup, { orientation: 'vertical' }))).toContain('data-orientation="vertical"')
  })

  it('renders text as a span', () => {
    expect(renderToStaticMarkup(h(ButtonGroupText, null, 'https://'))).toMatch(/^<span[^>]*data-slot="button-group-text"[^>]*>https:\/\/<\/span>/)
  })

  it('joins any direct child, with a vertical axis and a single-child exemption', () => {
    const styles = getTemplate(getCatalog('0.1.0'), 'button-group').styles!
    for (const [family, css] of Object.entries(styles)) {
      expect(css, family).toMatch(/\[data-orientation=['"]vertical['"]\] > /)
      expect(css, family).toMatch(/:focus-visible/)
      expect(css, family).toMatch(/:focus-within/)
      expect(css, family).toMatch(/z-index:\s*1/)
      expect(css, family).toMatch(/margin-inline-start:\s*calc\(var\(--border-width/)
      expect(css, family).toMatch(/margin-block-start:\s*calc\(var\(--border-width/)
      expect(css, family).toMatch(/border-start-start-radius/)
      expect(css, family).toContain('[data-button-group-button]')
      expect(css, family).toContain('[data-button-group-input]')
    }
  })

  it('passes the catalog style lint with its child selectors', () => {
    const catalog = getCatalog('0.1.0')
    const template = getTemplate(catalog, 'button-group')
    expect(lintCatalogStyles({ componentStyles: { 'button-group': template.styles! }, familyStyles: {},
      slots: { 'button-group': templateSlots('button-group', [template.content], template.slots) } })).toEqual([])
  })
})
