import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import * as React from 'react'
import { createElement as h } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import * as radix from '../src/templates/tooltip.js'
import * as base from '../src/templates/base/tooltip.js'

const families = ['flat', 'minimalist', 'neo-brutalism', 'ombelle', 'liquid-glass']
const editions = { radix, base } as const
const css = (family: string) => {
  const text = readFileSync(new URL(`../src/styles/tooltip/${family}.css`, import.meta.url), 'utf8').replace(/\r\n/g, '\n')
  return text.slice(text.indexOf('/* 0.7.6 variants */'))
}

describe('ariaKeyShortcuts', () => {
  it.each([
    [['Ctrl', 'Z'], 'Control+Z'],
    [['Control', 'z'], 'Control+Z'],
    [['⌘', 'K'], 'Meta+K'],
    [['Cmd', 'Shift', 'p'], 'Meta+Shift+P'],
    [['Command', 'K'], 'Meta+K'],
    [['Meta', 'K'], 'Meta+K'],
    [['Option', 'A'], 'Alt+A'],
    [['⌥', 'A'], 'Alt+A'],
    [['⇧', 'A'], 'Shift+A'],
    [['Esc'], 'Escape'],
    [['Enter'], 'Enter'],
    [['constructor'], 'constructor'],
    [['toString', 'x'], 'toString+X'],
    [['ArrowUp'], 'ArrowUp'],
    [[], ''],
  ])('%j is %s', (keys, expected) => {
    expect(radix.ariaKeyShortcuts(keys)).toBe(expected)
    expect(base.ariaKeyShortcuts(keys)).toBe(expected)
  })
})

describe.each(Object.keys(editions) as (keyof typeof editions)[])('%s TooltipShortcut', edition => {
  const ui = editions[edition]

  it('renders one kbd per key inside an aria-hidden span', () => {
    const html = renderToStaticMarkup(h(ui.TooltipShortcut, { keys: ['Ctrl', 'Z'] }))
    expect(html).toBe('<span data-slot="tooltip-shortcut" data-tooltip-shortcut="" aria-hidden="true" class=""><kbd data-slot="tooltip-shortcut-key">Ctrl</kbd><kbd data-slot="tooltip-shortcut-key">Z</kbd></span>')
  })

  it('passes className and other span props through, and keeps the hidden attributes', () => {
    const html = renderToStaticMarkup(h(ui.TooltipShortcut, { keys: ['K'], className: 'x', id: 'a' } as never))
    expect(html).toContain('class="x"')
    expect(html).toContain('id="a"')
    expect(html).toContain('aria-hidden="true"')
  })

  it('leaves a Tooltip without a shortcut as it was', () => {
    const html = renderToStaticMarkup(
      h(ui.TooltipProvider, null, h(ui.Tooltip, null, h(ui.TooltipTrigger, { type: 'button' }, 'Undo'))),
    )
    expect(html).not.toContain('shortcut')
    expect(html).not.toContain('keyshortcuts')
    expect(html.replace(/ id="base-ui-[^"]*"/, '')).toBe(unchanged[edition])
  })
})

// A closed Tooltip with a trigger only, as the Task 1 commit (db22321b) renders it.
const unchanged: Record<keyof typeof editions, string> = {
  radix: '<button data-state="closed" data-slot="tooltip-trigger" class="" type="button">Undo</button>',
  base: '<button data-base-ui-tooltip-trigger="" data-slot="tooltip-trigger" type="button" data-state="closed">Undo</button>',
}

describe('Tooltip shortcut styles', () => {
  it.each(families)('%s lays out the content, draws the key caps and has a forced-colours border', family => {
    const block = css(family)
    expect(block).toMatch(/\[data-slot='tooltip-content'\]:has\(> \[data-tooltip-shortcut\]\)\s*\{[^}]*display: inline-flex[^}]*gap: 10px/)
    const key = block.match(/\[data-slot='tooltip-shortcut-key'\]\s*\{[^}]*\}/)?.[0] ?? ''
    expect(key).toMatch(/font:[^;]*11px[^;]*ui-monospace/)
    expect(key).toMatch(/border: 1px solid color-mix\(in oklab, currentColor 45%, transparent\)/)
    expect(key).toContain(family === 'neo-brutalism' ? 'border-radius: 0' : 'border-radius: 4px')
    expect(block).toMatch(/\[data-slot='tooltip-shortcut'\]\s*\{[^}]*gap: 3px/)
    expect(block).toMatch(/@media \(forced-colors: active\)\s*\{[^@]*\[data-slot='tooltip-shortcut-key'\]\s*\{[^}]*border-color: CanvasText/)
  })

  it('names no selector with two slots', () => {
    for (const family of families) expect(css(family)).not.toMatch(/\[data-slot='tooltip-content'\][^{,]*\[data-slot='tooltip-shortcut/)
  })
})
