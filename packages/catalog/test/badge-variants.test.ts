import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { createElement as h } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { Badge } from '../src/templates/badge.js'

const families = ['flat', 'minimalist', 'neo-brutalism', 'ombelle', 'liquid-glass']
const css = (family: string) => readFileSync(new URL(`../src/styles/badge/${family}.css`, import.meta.url), 'utf8')

describe('Badge 0.7.3 variants', () => {
  it('sets data-appearance only when an appearance is given', () => {
    expect(renderToStaticMarkup(h(Badge, {}, 'Live'))).not.toContain('data-appearance')
    expect(renderToStaticMarkup(h(Badge, { appearance: 'soft', variant: 'warning' }, 'Degraded')))
      .toMatch(/data-variant="warning"[^>]*data-appearance="soft"|data-appearance="soft"[^>]*data-variant="warning"/)
    expect(renderToStaticMarkup(h(Badge, { appearance: 'outline', variant: 'destructive' }, 'Deprecated'))).toContain('data-appearance="outline"')
  })

  it.each(['success', 'warning', 'info'] as const)('accepts the %s intent', variant => {
    expect(renderToStaticMarkup(h(Badge, { variant }, variant))).toContain(`data-variant="${variant}"`)
  })

  it.each(families)('%s styles soft intents with the Alert pairs, outline destructive and forced colours', family => {
    const text = css(family)
    expect(text).toMatch(/\[data-slot='badge'\]\[data-appearance='soft'\]\[data-variant='warning'\][^{]*\{[^}]*var\(--warning-foreground/)
    expect(text).toMatch(/\[data-slot='badge'\]\[data-appearance='soft'\]\[data-variant='success'\][^{]*\{[^}]*var\(--success-foreground/)
    expect(text).toMatch(/\[data-slot='badge'\]\[data-appearance='outline'\]\[data-variant='destructive'\][^{]*\{[^}]*var\(--destructive\)/)
    expect(text).toMatch(/@media \(forced-colors: active\)\s*\{[^@]*data-appearance[^}]*CanvasText/)
  })
})

describe('Badge outline intents in dark mode (final review)', () => {
  it.each(families)('%s writes outline success, warning and info in the foreground, which no preset leaves light-only', family => {
    for (const intent of ['success', 'warning', 'info'])
      expect(css(family)).toMatch(new RegExp(String.raw`\[data-slot='badge'\]\[data-appearance='outline'\]\[data-variant='${intent}'\][^{]*\{\s*color: var\(--foreground\)`))
  })
})
