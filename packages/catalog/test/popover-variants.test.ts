import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { createElement as h } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import * as radix from '../src/templates/popover.js'
import * as base from '../src/templates/base/popover.js'

type Ui = typeof radix
const editions = [['radix', radix], ['base', base as unknown as Ui]] as const
const block = (family: string) => readFileSync(new URL(`../src/styles/popover/${family}.css`, import.meta.url), 'utf8')
  .match(/\/\* 0\.7\.5 variants \*\/([^]*?)\/\* end 0\.7\.5 variants \*\//)?.[1] ?? ''

describe('PopoverArrow', () => {
  it.each(editions)('%s exports a decorative arrow part', (_, ui) => {
    expect(typeof ui.PopoverArrow).toBe('function')
    const html = renderToStaticMarkup(h(ui.Popover, { open: true } as never, h(ui.PopoverTrigger, {}, 'Shadow'),
      h(ui.PopoverContent, {}, h(ui.PopoverArrow), 'Shadow offset')))
    // Portalled content does not server-render; the part must at least render without the content.
    expect(html).toContain('Shadow')
  })

  it.each(['ombelle', 'minimalist', 'neo-brutalism', 'liquid-glass'])('%s fills the arrow with the content and draws its two outer edges', family => {
    const rules = block(family)
    expect(rules).toMatch(/\[data-slot='popover-arrow'\] \{[^}]*fill: var\(--popover\);/)
    expect(rules).toMatch(/\[data-popover-arrow-edge\] \{[^}]*fill: none;[^}]*stroke: var\(--border\);[^}]*stroke-width: /)
    expect(rules).toMatch(/@media \(forced-colors: active\)[^]*\[data-popover-arrow-edge\] \{[^}]*stroke: CanvasText/)
  })

  it('flat fills the arrow with no edge, as its content has no border', () => {
    const rules = block('flat')
    expect(rules).toMatch(/\[data-slot='popover-arrow'\] \{[^}]*fill: var\(--popover\);/)
    expect(rules).toMatch(/\[data-popover-arrow-edge\] \{[^}]*stroke: none;/)
    expect(rules).toMatch(/@media \(forced-colors: active\)[^]*\[data-popover-arrow-edge\] \{[^}]*stroke: CanvasText/)
  })
})
