import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { createElement as h } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import * as radix from '../src/templates/avatar.js'
import * as base from '../src/templates/base/avatar.js'

type Ui = typeof radix
const editions = [['radix', radix], ['base', base as unknown as Ui]] as const
const families = ['flat', 'minimalist', 'neo-brutalism', 'ombelle', 'liquid-glass']
const css = (family: string) => readFileSync(new URL(`../src/styles/avatar/${family}.css`, import.meta.url), 'utf8')
const source = (edition: string) => readFileSync(new URL(`../src/templates/${edition === 'radix' ? '' : 'base/'}avatar.tsx`, import.meta.url), 'utf8')

describe('Avatar 0.7.3 variants', () => {
  it.each(editions)('%s sets data-shape only for square', (_, ui) => {
    expect(renderToStaticMarkup(h(ui.Avatar, {}))).not.toContain('data-shape')
    expect(renderToStaticMarkup(h(ui.Avatar, { shape: 'square' }))).toContain('data-shape="square"')
  })

  it.each(editions)('%s names AvatarOverflow "N more" and shows +N', (_, ui) => {
    const html = renderToStaticMarkup(h(ui.AvatarOverflow, { count: 4 }))
    expect(html).toContain('data-slot="avatar-overflow"')
    expect(html).toContain('role="img"')
    expect(html).toContain('aria-label="4 more"')
    expect(html).toContain('>+4<')
    expect(renderToStaticMarkup(h(ui.AvatarOverflow, { count: 4, label: '4 more reviewers', size: 'sm' })))
      .toMatch(/aria-label="4 more reviewers"[^>]*data-size="sm"|data-size="sm"[^>]*aria-label="4 more reviewers"/)
  })

  it.each(editions)('%s delays the fallback by 600 ms beside an image, unless told otherwise', (edition, ui) => {
    expect(source(edition)).toMatch(/hasImage \? 600 : undefined/)
    if (edition === 'radix')
      expect(renderToStaticMarkup(h(ui.Avatar, {}, h(ui.AvatarImage, { src: '/a.png', alt: '' }), h(ui.AvatarFallback, {}, 'AL')))).not.toContain('>AL<')
  })

  it.each(families)('%s styles the square shape and the overflow count', family => {
    const text = css(family)
    expect(text).toMatch(/\[data-slot='avatar'\]\[data-shape='square'\]\s*\{[^}]*border-radius: calc\(var\(--radius\) \* 0\.5\)/)
    expect(text).toMatch(/\[data-slot='avatar-overflow'\]\[data-size\]\s*\{[^}]*background: var\(--muted\)/)
    expect(text).toMatch(/\[data-slot='avatar-overflow'\]:not\(:first-child\)\s*\{[^}]*margin-inline-start/)
    expect(text).toMatch(/@media \(forced-colors: active\)\s*\{[^@]*\[data-slot='avatar-overflow'\][^}]*CanvasText/)
  })
})

describe('Avatar fallback delay (final review)', () => {
  it.each(editions)('%s renders initials on the server when there is no image', (_, ui) => {
    const html = renderToStaticMarkup(h(ui.Avatar, {}, h(ui.AvatarFallback, {}, 'AL')))
    expect(html).toContain('>AL<')
  })

  it('base still accepts Base UI\'s own delay prop', () => {
    const html = renderToStaticMarkup(h(base.Avatar, {}, h(base.AvatarFallback, { delay: 0 } as never, 'AL')))
    expect(html).toContain('>AL<')
    expect(readFileSync(new URL('../src/templates/base/avatar.tsx', import.meta.url), 'utf8')).not.toMatch(/, 'delay'>/)
  })
})
