import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { createElement as h } from 'react'
import { renderToStaticMarkup, renderToString } from 'react-dom/server'
import * as radix from '../src/templates/accordion.js'
import * as base from '../src/templates/base/accordion.js'

type Ui = typeof radix
const editions = [['radix', radix], ['base', base as unknown as Ui]] as const
const families = ['flat', 'minimalist', 'neo-brutalism', 'ombelle', 'liquid-glass']
const css = (family: string) => readFileSync(new URL(`../src/styles/accordion/${family}.css`, import.meta.url), 'utf8')
const faq = (ui: Ui, props: Record<string, unknown>) => h(ui.Accordion, { type: 'single', collapsible: true, defaultValue: 'export', ...props } as never,
  h(ui.AccordionItem, { value: 'export' }, h(ui.AccordionTrigger, {}, 'Can I export a preset?'), h(ui.AccordionContent, {}, 'Yes.')),
  h(ui.AccordionItem, { value: 'glass' }, h(ui.AccordionTrigger, {}, 'Does glass work in Firefox?'), h(ui.AccordionContent, {}, 'Mostly.')))
const icons = (html: string) => [...html.matchAll(/<span[^>]*data-slot="accordion-icon"[^>]*>([^]*?)<\/span>/g)].map(match => match[1]!)
const svgs = (icon: string) => icon.match(/<svg/g)?.length ?? 0

describe('Accordion 0.7.3 variants', () => {
  it.each(editions)('%s keeps both family icons when icon is left out', (_, ui) => {
    const html = renderToStaticMarkup(faq(ui, {}))
    expect(html).not.toMatch(/data-slot="accordion"[^>]*data-(icon|appearance)=/)
    for (const icon of icons(html)) expect(svgs(icon)).toBe(2)
  })

  it.each(editions)('%s renders only the chevron for icon="chevron"', (_, ui) => {
    const html = renderToStaticMarkup(faq(ui, { icon: 'chevron' }))
    expect(html).toMatch(/data-slot="accordion"[^>]*data-icon="chevron"|data-icon="chevron"[^>]*data-slot="accordion"/)
    for (const icon of icons(html)) {
      expect(svgs(icon)).toBe(1)
      expect(icon).toContain('data-accordion-glyph="chevron"')
    }
  })

  it.each(editions)('%s renders one plus for icon="plus", open at first render with no client state', (_, ui) => {
    const html = renderToString(faq(ui, { icon: 'plus', appearance: 'flush' }))
    expect(html).toMatch(/data-appearance="flush"/)
    const [open, closed] = icons(html)
    expect(svgs(open!)).toBe(1)
    expect(open).toContain('data-accordion-glyph="plus"')
    expect(open).toContain('d="M12 5v14"')
    expect(svgs(closed!)).toBe(1)
    expect(html).toMatch(/<button[^>]*data-state="open"[^>]*>Can I export a preset\?/)
  })

  it.each(families)('%s styles flush items and turns the plus into a minus when open', family => {
    const text = css(family)
    expect(text).toMatch(/\[data-slot='accordion'\]\[data-appearance='flush'\]\s*\{[^}]*border: 0/)
    expect(text).toMatch(/\[data-state='open'\] > \[data-slot='accordion-icon'\] \[data-accordion-glyph='plus'\] path\[d='M12 5v14'\]\s*\{[^}]*display: none/)
    expect(text).toMatch(/\[data-state='open'\] > \[data-slot='accordion-icon'\] \[data-accordion-glyph='chevron'\]\s*\{[^}]*rotate: 180deg/)
  })
})
