// The batch 6a review's minor findings, each pinned where the repo can observe it without a DOM.
import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { createElement as h } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { Alert, AlertDismiss, AlertTitle } from '../src/templates/alert.js'
import { CardGroup, CardOption } from '../src/templates/card.js'

const families = ['flat', 'minimalist', 'neo-brutalism', 'ombelle', 'liquid-glass']
const style = (file: string) => readFileSync(new URL(`../src/styles/${file}`, import.meta.url), 'utf8').replace(/\r\n/g, '\n')
const source = (file: string) => readFileSync(new URL(`../src/templates/${file}`, import.meta.url), 'utf8')
const block = (css: string) => css.slice(css.indexOf('/* 0.7.3 variants */'))

describe('batch 6a minors', () => {
  it('documents CardLink as covering the description, not leaving it selectable', () => {
    expect(source('card.tsx')).not.toContain('text stays selectable')
  })

  it.each(families)('%s keeps the destructive double border in forced colours, and leaves solid as the default', family => {
    const forced = block(style(`badge/${family}.css`))
    expect(forced).not.toMatch(/\[data-slot='badge'\]\[data-appearance\](?::not\(:root\))? \{/)
    expect(forced).toMatch(/\[data-slot='badge'\]:is\(\[data-appearance='soft'\], \[data-appearance='outline'\]\)[^{]*\{[^}]*CanvasText/)
    expect(forced).toMatch(/\[data-slot='badge'\]:is\(\[data-appearance='soft'\], \[data-appearance='outline'\]\)\[data-variant='destructive'\][^{]*\{[^}]*border-style: double/)
  })

  it.each(['button.tsx', 'base/button.tsx'])('%s restores a min-inline-size the consumer set, and returns the callback ref cleanup', file => {
    const text = source(file)
    expect(text).toMatch(/getPropertyValue\('min-inline-size'\)/)
    expect(text).toMatch(/const cleanup = typeof ref === 'function' \? ref\(element\)/)
    expect(text).toMatch(/if \(typeof cleanup === 'function'\) return/)
  })

  it('renders an option description as phrasing content inside its label', () => {
    const html = renderToStaticMarkup(h(CardGroup, { name: 'plan', 'aria-label': 'Plan' }, h(CardOption, { value: 'team', title: 'Team', description: 'Ten seats.' })))
    expect(html).not.toMatch(/<label[^]*<p[\s>][^]*<\/label>/)
    expect(html).toMatch(/<span[^>]*data-slot="card-description"[^>]*>Ten seats\.<\/span>/)
  })

  it.each(families)('%s lifts interactive option children above the covering radio', family => {
    expect(block(style(`card/${family}.css`))).toMatch(/\[data-slot='card-option'\] :is\(a, button, select, textarea, input:not\(\[data-card-option-input\]\)\)\s*\{[^}]*z-index: 1/)
  })

  it('renders one Dismiss button when onDismiss and a child AlertDismiss are both given', () => {
    const html = renderToStaticMarkup(h(Alert, { onDismiss: () => {} }, h(AlertTitle, {}, 'Saved'), h(AlertDismiss)))
    expect(html.match(/data-slot="alert-dismiss"/g)).toHaveLength(1)
  })

  it.each(families)('%s reserves the Dismiss corner for a button at any depth', family => {
    expect(source('alert.tsx')).toContain('data-alert-dismiss=""')
    expect(block(style(`alert/${family}.css`))).toMatch(/\[data-slot='alert'\]:is\(\[data-dismissible\], :has\(\[data-alert-dismiss\]\)\)\s*\{[^}]*padding-inline-end/)
  })

  it.each(families)('%s raises link card controls without overriding their own positioning', family => {
    expect(block(style(`card/${family}.css`))).toMatch(/:where\(\[data-slot='card'\]:has\(\[data-card-link\]\) :is\(a:not\(\[data-card-link\]\), button, input, select, textarea, summary\)\)\s*\{[^}]*position: relative/)
  })

  it.each(families)('%s overlaps an overflow count only inside a group', family => {
    const css = block(style(`avatar/${family}.css`))
    expect(css).not.toMatch(/\[data-slot='avatar-overflow'\]:not\(:first-child\)\s*\{/)
    expect(css).toMatch(/\[data-slot='avatar-overflow'\]:not\(:first-child\):is\(\[role='group'\] > \*\)\s*\{[^}]*margin-inline-start/)
  })

  it.each(['accordion.tsx', 'base/accordion.tsx'])('%s declares its icon context after the imports, and its attributes after the props', file => {
    const text = source(file)
    expect(text.indexOf('const AccordionIcon')).toBeGreaterThan(text.lastIndexOf('\nimport '))
    if (file === 'accordion.tsx') expect(text).toMatch(/\{\.\.\.props\}\s*data-appearance=\{appearance\}\s*data-icon=\{icon\}/)
  })
})
