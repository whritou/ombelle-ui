import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { createElement as h } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import * as radix from '../src/templates/select.js'
import * as base from '../src/templates/base/select.js'

type Ui = typeof radix
const editions = [['radix', radix], ['base', base as unknown as Ui]] as const
const families = ['flat', 'minimalist', 'neo-brutalism', 'ombelle', 'liquid-glass']
const block = (family: string) => {
  const css = readFileSync(new URL(`../src/styles/select/${family}.css`, import.meta.url), 'utf8').replace(/\r\n/g, '\n')
  return css.slice(css.indexOf('/* 0.7.3 variants */'))
}
const roles = (ui: Ui, props: Record<string, unknown>) => h(ui.Select, { name: 'roles', ...props } as never,
  h(ui.SelectTrigger, { 'aria-label': 'Roles' }, h(ui.SelectValue, { placeholder: 'Choose roles' })),
  h(ui.SelectContent, {},
    h(ui.SelectGroup, {}, h(ui.SelectLabel, {}, 'Team'),
      h(ui.SelectItem, { value: 'designer' }, 'Designer'),
      h(ui.SelectItem, { value: 'engineer' }, 'Engineer')),
    h(ui.SelectSeparator),
    h(ui.SelectItem, { value: 'researcher' }, 'Researcher')))

describe('Select 0.7.3 variants', () => {
  it.each(editions)('%s shows a chip per chosen label and submits one entry per value', (_, ui) => {
    const html = renderToStaticMarkup(roles(ui, { multiple: true, defaultValue: ['designer', 'engineer'] }))
    const chips = [...html.matchAll(/<span[^>]*data-slot="select-chip"[^>]*>([^<]*)<\/span>/g)].map(match => match[1])
    expect(chips).toEqual(['Designer', 'Engineer'])
    const hidden = [...html.matchAll(/<input[^>]*name="roles"[^>]*>/g)].map(match => /value="([^"]*)"/.exec(match[0])?.[1])
    expect(hidden.filter(Boolean)).toEqual(expect.arrayContaining(['designer', 'engineer']))
  })

  it.each(editions)('%s shows the placeholder when nothing is chosen', (_, ui) => {
    const html = renderToStaticMarkup(roles(ui, { multiple: true, defaultValue: [] }))
    expect(html).toContain('Choose roles')
    expect(html).not.toContain('data-slot="select-chip"')
  })

  it('radix: the multiple trigger is a combobox that pops up a listbox', () => {
    const html = renderToStaticMarkup(roles(radix, { multiple: true, defaultValue: ['designer'] }))
    const trigger = /<button[^>]*data-slot="select-trigger"[^>]*>/.exec(html)![0]
    expect(trigger).toContain('role="combobox"')
    expect(trigger).toContain('aria-haspopup="listbox"')
    expect(trigger).toContain('aria-expanded="false"')
  })

  it.each(editions)('%s keeps single selection unchanged', (edition, ui) => {
    const html = renderToStaticMarkup(roles(ui, { defaultValue: 'designer' }))
    expect(html).not.toContain('data-slot="select-chip"')
    // Base UI's own single trigger already announces a listbox popup.
    if (edition === 'radix') expect(html).not.toContain('aria-haspopup="listbox"')
  })

  it.each(editions)('%s draws a decorative item icon', (_, ui) => {
    const source = readFileSync(new URL(`../src/templates/${ui === radix ? '' : 'base/'}select.tsx`, import.meta.url), 'utf8')
    expect(source).toMatch(/data-slot="select-item-icon" aria-hidden="true"/)
  })

  // Group labels and separators keep each family's existing style, so single Selects do not change.
  it.each(families)('%s styles chips, item icons and the multiple listbox', family => {
    const css = block(family)
    for (const slot of ['select-chip', 'select-item-icon'])
      expect(css).toContain(`[data-slot='${slot}']`)
    expect(css).toContain("[data-slot='select-viewport'][data-select-multiple]")
    expect(css).toMatch(/@media \(forced-colors: active\)/)
  })
})
