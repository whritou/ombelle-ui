import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { createElement as h } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import * as radix from '../src/templates/button.js'
import * as base from '../src/templates/base/button.js'

type Ui = typeof radix
const editions = [['radix', radix], ['base', base as unknown as Ui]] as const
const families = ['flat', 'minimalist', 'neo-brutalism', 'ombelle', 'liquid-glass']
const familyCss = (family: string) => readFileSync(new URL(`../src/styles/${family}.css`, import.meta.url), 'utf8')

describe('Button 0.7.3 variants', () => {
  it.each(editions)('%s renders link-destructive', (_, ui) => {
    const html = renderToStaticMarkup(h(ui.Button, { variant: 'link-destructive' }, 'Remove member'))
    expect(html).toContain('data-variant="link-destructive"')
  })

  it.each(editions)('%s sets no min width while rendering, so loading at mount measures nothing', (_, ui) => {
    const html = renderToStaticMarkup(h(ui.Button, { loading: true, style: { color: 'red' } }, 'Saving…'))
    expect(html).toContain('aria-busy="true"')
    expect(html).toContain('color:red')
    expect(html).not.toContain('min-inline-size')
  })

  it.each(editions)('%s locks the resting width while loading and only removes its own', (_, ui) => {
    const source = readFileSync(new URL(`../src/templates/${ui === radix ? '' : 'base/'}button.tsx`, import.meta.url), 'utf8')
    expect(source).toMatch(/useLayoutEffect\(/)
    expect(source).toMatch(/setProperty\('min-inline-size', `min\(/)
    expect(source).toMatch(/else element\.style\.removeProperty\('min-inline-size'\)/)
  })

  it.each(families)('%s styles link-destructive with the destructive colour and a forced-colours rule', family => {
    const css = familyCss(family)
    expect(css).toMatch(/\[data-slot="button"\]\[data-variant="link-destructive"\]\s*\{[^}]*color:\s*color-mix\(in oklab, var\(--destructive\) 65%, var\(--foreground\)\)/)
    expect(css).toMatch(/@media \(forced-colors: active\)\s*\{[^@]*\[data-variant="link-destructive"\][^}]*LinkText/)
  })
})
