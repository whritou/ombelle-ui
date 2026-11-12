import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { createElement as h } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import * as radix from '../src/templates/dialog.js'
import * as base from '../src/templates/base/dialog.js'

type Ui = typeof radix
const editions = [['radix', radix], ['base', base as unknown as Ui]] as const
const families = ['flat', 'minimalist', 'neo-brutalism', 'ombelle', 'liquid-glass']
const block = (family: string) => readFileSync(new URL(`../src/styles/${family}.css`, import.meta.url), 'utf8')
  .match(/\/\* 0\.7\.5 variants \*\/([^]*?)\/\* end 0\.7\.5 variants \*\//)?.[1] ?? ''
const tag = (html: string, slot: string) => html.match(new RegExp(`<[^>]*data-slot="${slot}"[^>]*>`))?.[0] ?? ''

describe('Dialog body, footer and size', () => {
  it.each(editions)('%s renders a named region body with no tab stop before it is measured', (_, ui) => {
    const body = tag(renderToStaticMarkup(h(ui.DialogBody, {}, 'Long text')), 'dialog-body')
    expect(body).toContain('role="region"')
    expect(body).toContain('data-dialog-body=""')
    expect(body).not.toContain('tabindex')
    expect(body).not.toContain('data-overflowing')
  })

  it.each(editions)('%s renders the footer slot', (_, ui) => {
    expect(tag(renderToStaticMarkup(h(ui.DialogFooter, {}, 'Actions')), 'dialog-footer')).toBeTruthy()
  })

  it.each(families)('%s lays out the body column, the overflow border, the sizes and small screens', family => {
    const rules = block(family)
    expect(rules).toMatch(/\[data-slot='dialog-content'\]:has\(> \[data-dialog-body\]\) \{[^}]*max-block-size: calc\(100dvh - 2rem\)/)
    expect(rules).toMatch(/\[data-slot='dialog-body'\] \{[^}]*overflow: auto/)
    expect(rules).toMatch(/\[data-slot='dialog-footer'\]:is\(:has\(> \[data-dialog-body\]\[data-overflowing\]\) > \*\) \{[^}]*border-block-start/)
    expect(rules).toMatch(/\[data-slot='dialog-content'\]\[data-size='sm'\] \{[^}]*24rem/)
    expect(rules).toMatch(/\[data-slot='dialog-content'\]\[data-size='lg'\] \{[^}]*48rem/)
    expect(rules).toMatch(/\[data-slot='dialog-content'\]\[data-size='fullscreen'\] \{[^}]*100vw - 2rem/)
    expect(rules).toMatch(/@media \(max-width: 639\.98px\)[^]*\[data-slot='dialog-content'\]:is\(\[data-size='lg'\], \[data-size='fullscreen'\]\)[^]*border-radius: 0/)
    expect(rules).toMatch(/@media \(max-width: 639\.98px\)[^]*\[data-slot='dialog-footer'\] \{[^}]*flex-direction: column-reverse/)
    expect(rules).toMatch(/@media \(forced-colors: active\)[^]*dialog-footer/)
  })
})
