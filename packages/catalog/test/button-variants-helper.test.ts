import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { createElement as h } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import * as radix from '../src/templates/button.js'
import * as base from '../src/templates/base/button.js'

type Ui = typeof radix
const editions = [['radix', radix], ['base', base as unknown as Ui]] as const
const families = ['flat', 'minimalist', 'neo-brutalism', 'ombelle', 'papier', 'organic', 'retro-futurism', 'liquid-glass']
const variants = ['default', 'secondary', 'destructive', 'outline', 'ghost', 'link', 'link-destructive'] as const
const sizes = ['sm', 'default', 'lg', 'icon', 'icon-sm'] as const
const familyCss = (family: string) => readFileSync(new URL(`../src/styles/${family}.css`, import.meta.url), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '')

/** The attributes the family stylesheets select, read from rendered markup. */
function styling(html: string) {
  const pick = (name: string) => html.match(new RegExp(` ${name}="([^"]*)"`))?.[1]
  return { slot: pick('data-slot'), variant: pick('data-variant'), size: pick('data-size'), className: pick('class') }
}

/** Splits a selector list at its top-level commas. */
function topLevelParts(list: string) {
  const parts: string[] = []
  let depth = 0
  let start = 0
  for (let i = 0; i < list.length; i++) {
    if (list[i] === '(') depth++
    else if (list[i] === ')') depth--
    else if (list[i] === ',' && depth === 0) { parts.push(list.slice(start, i).trim()); start = i + 1 }
  }
  parts.push(list.slice(start).trim())
  return parts
}

describe('buttonVariants (CAT-17)', () => {
  it.each(editions)('%s exports buttonVariants next to Button', (_, ui) => {
    expect(typeof ui.buttonVariants).toBe('function')
  })

  it.each(editions)('%s gives a link the same styling attributes as Button for every variant and size', (_, ui) => {
    for (const variant of variants)
      for (const size of sizes) {
        const button = renderToStaticMarkup(h(ui.Button, { variant, size }, 'Docs'))
        const link = renderToStaticMarkup(h('a', { href: '/docs', ...ui.buttonVariants({ variant, size }) }, 'Docs'))
        expect(styling(link), `${variant}/${size}`).toEqual(styling(button))
      }
  })

  it.each(editions)('%s defaults to the default variant and size, as Button does', (_, ui) => {
    const button = renderToStaticMarkup(h(ui.Button, null, 'Docs'))
    const link = renderToStaticMarkup(h('a', { href: '/docs', ...ui.buttonVariants() }, 'Docs'))
    expect(styling(link)).toEqual(styling(button))
    expect(ui.buttonVariants()).toMatchObject({ 'data-slot': 'button', 'data-variant': 'default', 'data-size': 'default' })
  })

  it.each(editions)('%s appends a caller class, as Button does', (_, ui) => {
    const button = renderToStaticMarkup(h(ui.Button, { variant: 'outline', className: 'w-full' }, 'Docs'))
    const link = renderToStaticMarkup(h('a', { href: '/docs', ...ui.buttonVariants({ variant: 'outline', className: 'w-full' }) }, 'Docs'))
    expect(styling(link)).toEqual(styling(button))
    expect(styling(link).className).toMatch(/ w-full$/)
  })

  // Rendering identically in a family means the family selects only these attributes,
  // never the button element, so an anchor carrying them matches every rule a Button matches.
  it.each(families)('%s styles Button by attributes only, so a link with buttonVariants matches every rule', family => {
    const css = familyCss(family)
    const selectors = (css.match(/[^{}]*\{/g) ?? [])
      .flatMap(list => topLevelParts(list.slice(0, -1)))
      .filter(selector => /\[data-slot=["']button["']\]/.test(selector))
    expect(selectors.length).toBeGreaterThan(5)
    for (const selector of selectors) expect(selector, selector).not.toMatch(/(^|[\s>+~(])button(?![-\w"'])/)
  })
})
