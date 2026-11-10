import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { createElement as h } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { Input } from '../src/templates/input.js'
import { Textarea } from '../src/templates/textarea.js'
import { InputGroup, InputGroupAddon, InputGroupClear, InputGroupCount, InputGroupInput } from '../src/templates/input-group.js'

const families = ['flat', 'minimalist', 'neo-brutalism', 'ombelle', 'liquid-glass']
const block = (file: string) => {
  const css = readFileSync(new URL(`../src/styles/${file}`, import.meta.url), 'utf8').replace(/\r\n/g, '\n')
  return css.slice(css.indexOf('/* 0.7.3 variants */'))
}

describe('Input 0.7.3 variants', () => {
  it('sets data-size for sm and lg only', () => {
    expect(renderToStaticMarkup(h(Input, { size: 'sm', 'aria-label': 'Small' }))).toContain('data-size="sm"')
    expect(renderToStaticMarkup(h(Input, { size: 'default', 'aria-label': 'Default' }))).not.toContain('data-size')
    expect(renderToStaticMarkup(h(Input, { 'aria-label': 'Default' }))).not.toMatch(/data-size|size=/)
    expect(renderToStaticMarkup(h(Textarea, { size: 'lg', 'aria-label': 'Bio' }))).toContain('data-size="lg"')
  })

  it('names Clear by default or by label, and keeps it a plain button', () => {
    const html = renderToStaticMarkup(h(InputGroup, {}, h(InputGroupInput, { 'aria-label': 'Search', placeholder: 'Search' }),
      h(InputGroupAddon, { align: 'inline-end' }, h(InputGroupClear, { onClear: () => {} }))))
    expect(html).toMatch(/<button[^>]*type="button"[^>]*data-slot="input-group-clear"[^>]*aria-label="Clear"|<button[^>]*aria-label="Clear"[^>]*data-slot="input-group-clear"/)
    expect(renderToStaticMarkup(h(InputGroupClear, { label: 'Clear search' }))).toContain('aria-label="Clear search"')
  })

  it.each([
    [100, false, false],
    [144, true, false],
    [161, true, true],
  ] as const)('a count at %i of 160 is live: %s, over: %s', (value, live, over) => {
    const html = renderToStaticMarkup(h(InputGroupCount, { value, max: 160, id: 'bio-count' }))
    expect(html).toContain(`>${value} / 160<`)
    expect(html).toContain('id="bio-count"')
    expect(html.includes('aria-live="polite"')).toBe(live)
    expect(html.includes('data-over')).toBe(over)
  })

  it.each(families)('%s sizes inputs and textareas, hides Clear on an empty field, and colours an over count', family => {
    const css = block(`${family}.css`).replaceAll('"', "'")
    expect(css).toMatch(/\[data-slot='input'\]\[data-size='sm'\][^{]*\{[^}]*min-height: 2rem/)
    expect(css).toMatch(/\[data-slot='input'\]\[data-size='lg'\][^{]*\{[^}]*min-height: 3rem/)
    expect(block(`textarea/${family}.css`)).toMatch(/\[data-slot='textarea'\]\[data-size='sm'\]/)
    const group = block(`input-group/${family}.css`)
    expect(group).toMatch(/\[data-slot='input-group-clear'\]:is\(\[role='group'\]:has\(> :placeholder-shown\) > \*, \[role='group'\]:has\(> :placeholder-shown\) > \* > \*\)\s*\{[^}]*display: none/)
    expect(group).toMatch(/\[data-slot='input-group-count'\]\[data-over\]\s*\{[^}]*var\(--destructive\)/)
  })
})
