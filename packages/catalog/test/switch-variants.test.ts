import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { createElement as h } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import * as radix from '../src/templates/switch.js'
import * as base from '../src/templates/base/switch.js'

type Ui = typeof radix
const editions = [['radix', radix], ['base', base as unknown as Ui]] as const
const families = ['flat', 'minimalist', 'neo-brutalism', 'ombelle', 'liquid-glass']
const block = (family: string) => readFileSync(new URL(`../src/styles/switch/${family}.css`, import.meta.url), 'utf8')
  .match(/\/\* 0\.7\.5 variants \*\/([^]*?)\/\* end 0\.7\.5 variants \*\//)?.[1] ?? ''

describe('Switch size', () => {
  it.each(editions)('%s puts data-size="sm" on the root and the thumb', (_, ui) => {
    const html = renderToStaticMarkup(h(ui.Switch, { size: 'sm', 'aria-label': 'Reduced transparency' }))
    expect(html).toMatch(/<[^>]*data-slot="switch"[^>]*>/)
    expect(html.match(/<[^>]*data-slot="switch"[^>]*>/)![0]).toContain('data-size="sm"')
    expect(html.match(/<[^>]*data-slot="switch-thumb"[^>]*>/)![0]).toContain('data-size="sm"')
  })

  it.each(editions)('%s adds no data-size for the default size', (_, ui) => {
    expect(renderToStaticMarkup(h(ui.Switch, { 'aria-label': 'A' }))).not.toContain('data-size')
    expect(renderToStaticMarkup(h(ui.Switch, { size: 'default', 'aria-label': 'A' }))).not.toContain('data-size')
  })

  it.each(families)('%s sizes the small track and thumb and keeps a 24px hit area', family => {
    const rules = block(family)
    expect(rules).toMatch(/\[data-slot='switch'\]\[data-size='sm'\] \{[^}]*inline-size: [^;]+;[^}]*block-size: [^;]+;/)
    expect(rules).toMatch(/\[data-slot='switch-thumb'\]\[data-size='sm'\] \{[^}]*inline-size: [^;]+;[^}]*block-size: [^;]+;/)
    expect(rules).toMatch(/\[data-slot='switch-thumb'\]\[data-size='sm'\]\[data-state='checked'\] \{[^}]*inset-inline-start:/)
    expect(rules).toMatch(/\[data-slot='switch'\]\[data-size='sm'\]::before \{[^}]*content: '';[^}]*position: absolute;[^}]*inset-block: min\(0px, calc\(\(100% - 24px\) \/ 2\)\);/)
  })
})
