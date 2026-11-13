import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { createElement as h } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import * as radix from '../src/templates/alert-dialog.js'
import * as base from '../src/templates/base/alert-dialog.js'

type Ui = typeof radix
const editions = [['radix', radix], ['base', base as unknown as Ui]] as const
const families = ['flat', 'minimalist', 'neo-brutalism', 'ombelle', 'liquid-glass']
const block = (family: string) => readFileSync(new URL(`../src/styles/alert-dialog/${family}.css`, import.meta.url), 'utf8')
  .match(/\/\* 0\.7\.5 variants \*\/([^]*?)\/\* end 0\.7\.5 variants \*\//)?.[1] ?? ''
const tag = (html: string, slot: string) => html.match(new RegExp(`<[^>]*data-slot="${slot}"[^>]*>`))?.[0] ?? ''
const attr = (html: string, slot: string, name: string) => tag(html, slot).match(new RegExp(` ${name}="([^"]*)"`))?.[1]

describe('AlertDialogMedia', () => {
  it.each(editions)('%s is a decorative tile with a tone and its own icon', (_, ui) => {
    const html = renderToStaticMarkup(h(ui.AlertDialogMedia, { tone: 'destructive' }))
    expect(attr(html, 'alert-dialog-media', 'aria-hidden')).toBe('true')
    expect(attr(html, 'alert-dialog-media', 'data-tone')).toBe('destructive')
    expect(html).toContain('<svg')
    const own = renderToStaticMarkup(h(ui.AlertDialogMedia, {}, h('span', { id: 'own' })))
    expect(attr(own, 'alert-dialog-media', 'data-tone')).toBe('default')
    expect(own).toContain('id="own"')
    expect(own).not.toContain('<svg')
  })
})

describe('AlertDialogConfirmInput', () => {
  it.each(editions)('%s labels a text input with the instruction', (_, ui) => {
    const html = renderToStaticMarkup(h(ui.AlertDialogConfirmInput, { expected: 'ombelle-site' }))
    const labelId = attr(html, 'alert-dialog-confirm-label', 'id')
    expect(labelId).toBeTruthy()
    expect(html).toMatch(/data-slot="alert-dialog-confirm-label"[^>]*>Type <code>ombelle-site<\/code> to confirm<\/label>/)
    const input = tag(html, 'alert-dialog-confirm-input')
    expect(input).toContain('type="text"')
    expect(input).toContain('autoComplete="off"')
    expect(input).toContain('spellCheck="false"')
    expect(attr(html, 'alert-dialog-confirm-input', 'id')).toBe(attr(html, 'alert-dialog-confirm-label', 'for'))
  })

  it.each(families)('%s styles the media tones, the instruction and the disabled action', family => {
    const rules = block(family)
    expect(rules).toContain("[data-slot='alert-dialog-media']")
    expect(rules).toContain("[data-slot='alert-dialog-media'][data-tone='destructive']")
    expect(rules).toContain("[data-slot='alert-dialog-confirm']")
    expect(rules).toContain("[data-slot='alert-dialog-confirm-input']")
    expect(rules).toMatch(/\[data-slot='alert-dialog-action'\]:disabled \{/)
    expect(rules).toMatch(/@media \(forced-colors: active\)[^]*\[data-slot='alert-dialog-action'\]:disabled \{[^}]*GrayText/)
  })
})
