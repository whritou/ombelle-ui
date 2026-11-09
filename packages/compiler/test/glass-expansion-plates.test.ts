import { readFileSync } from 'node:fs'
import postcss from 'postcss'
import { describe, expect, it } from 'vitest'
import {
  glassControlSlots, glassHaloSelector, glassHostedSlots,
  glassMarkSlots, glassSurfaceSlots,
} from '../../catalog/src/glass-recipes.js'

const css = readFileSync(new URL('../../catalog/src/styles/liquid-glass.css', import.meta.url), 'utf8')
const root = postcss.parse(css)
const slot = (name: string) => `[data-slot="${name}"]`
function properties(selector: string, forcedColors = false) {
  const result: Record<string, string> = {}
  root.walkRules(rule => {
    if (!rule.selectors.includes(selector)) return
    for (let parent: postcss.Node | undefined = rule.parent; parent; parent = parent.parent) {
      if (parent.type !== 'atrule') continue
      const atRule = parent as postcss.AtRule
      if (atRule.name === 'media' && /forced-colors:\s*active/.test(atRule.params) && !forcedColors) return
    }
    rule.walkDecls(decl => { result[decl.prop] = decl.value })
  })
  return result
}

const plates = [
  ['input-group', 'background'], ['input-group-input', 'background'],
  ['input-group-textarea', 'background'], ['input-group-addon', 'background'],
  ['input-group-text', 'background'], ['input-group-button', 'background'],
  ['breadcrumb-list', 'muted'], ['breadcrumb-link', 'muted'],
  ['breadcrumb-page', 'background'], ['breadcrumb-separator', 'muted'],
  ['breadcrumb-ellipsis', 'muted'], ['pagination-content', 'muted'],
  ['pagination-link', 'muted'], ['pagination-ellipsis', 'muted'],
  ['sheet-content', 'popover'], ['sheet-title', 'popover'],
  ['sheet-description', 'popover'], ['sheet-dismiss', 'popover'],
  ['alert-dialog-content', 'popover'], ['alert-dialog-title', 'popover'],
  ['alert-dialog-description', 'popover'], ['alert-dialog-cancel', 'popover'],
  ['alert-dialog-action', 'primary'],
] as const
const toastParts = ['toast', 'toast-content', 'toast-title', 'toast-description', 'toast-action', 'toast-close'] as const

describe('Expanded glass text plates', () => {
  it.each(plates)('paints %s text against its actual %s surface', (name, surface) => {
    const style = properties(slot(name))
    expect(style['--glass-plate']).toBe(`var(--${surface})`)
    // The contrast model assumes the same under-fill plate as reviewed native
    // Input. Explicit declarations also cover native controls and form addons.
    expect(style['-webkit-text-stroke']).toBe(properties(slot('input'))['-webkit-text-stroke'])
    expect(style['paint-order']).toBe('stroke fill')
  })

  it.each(toastParts)('keeps %s text on its notification fill, including opaque statuses', name => {
    const style = properties(slot(name))
    expect(style['--glass-plate']).toBe('var(--toast-bg, var(--card))')
    expect(style['-webkit-text-stroke']).toBe(properties(slot('card'))['-webkit-text-stroke'])
    expect(style['paint-order']).toBe('stroke fill')
  })

  it('tracks solid hovered and current-page controls instead of inheriting the translucent container plate', () => {
    expect(properties(`${slot('input-group-button')}:hover:not(:disabled)`)['--glass-plate']).toBe('var(--accent)')
    expect(properties(`${slot('pagination-link')}[aria-current="page"]`)['--glass-plate']).toBe('var(--primary)')
    expect(properties(`${slot('pagination-link')}[data-disabled]`)['--glass-plate']).toBe('var(--muted)')
  })

  it.each(['sheet-dismiss', 'alert-dialog-cancel'])('tracks the muted %s hover fill', name => {
    expect(properties(`${slot(name)}:hover`)['--glass-plate']).toBe('var(--muted)')
  })

  it.each(['toast-action', 'toast-close'])('tracks the %s hover tint over its notification fill', name => {
    expect(properties(`${slot(name)}:hover`)['--glass-plate']).toBe('color-mix(in oklab, currentColor 10%, var(--toast-bg, var(--card)))')
  })

  it.each([...plates.map(([name]) => name), ...toastParts])('turns the %s plate off in forced colors', name => {
    expect(properties(slot(name), true)['-webkit-text-stroke']).toBe('0')
  })

  it.each(['input-group-input', 'input-group-textarea'])('covers the native %s placeholder', name => {
    expect(properties(`${slot(name)}::placeholder`)['-webkit-text-stroke']).toBe(properties(slot('input'))['-webkit-text-stroke'])
    expect(properties(`${slot(name)}::placeholder`, true)['-webkit-text-stroke']).toBe('0')
  })
})

describe('Expanded glass material recipes', () => {
  it.each(['sheet-content', 'alert-dialog-content', 'toast'])('hosts the %s material without pseudo-layers on scrolling content', name => {
    expect(glassSurfaceSlots).toContain(name)
    expect(glassHostedSlots).toContain(name)
    expect(glassHaloSelector).not.toContain(slot(name))
    expect(properties(slot(name))['--glass-material-shadow']).toBe(properties(slot('dialog-content'))['--glass-material-shadow'])
  })
  it.each(['breadcrumb-list', 'pagination-content'])('keeps the %s control group out of the pointer-halo recipe', name => {
    expect(glassControlSlots).toContain(name)
    expect(glassHostedSlots).toContain(name)
    expect(glassHaloSelector).not.toContain(slot(name))
  })
  it('treats Input Group as a field without pseudo-element or pointer material', () => {
    expect(glassMarkSlots).toContain('input-group')
    expect(glassHaloSelector).not.toContain(slot('input-group'))
  })
})
