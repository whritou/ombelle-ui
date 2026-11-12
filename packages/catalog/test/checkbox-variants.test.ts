import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { createElement as h } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import * as radix from '../src/templates/checkbox.js'
import * as base from '../src/templates/base/checkbox.js'

type Ui = typeof radix
const editions = [['radix', radix], ['base', base as unknown as Ui]] as const
const families = ['flat', 'minimalist', 'neo-brutalism', 'ombelle', 'liquid-glass']
const css = (family: string) => readFileSync(new URL(`../src/styles/checkbox/${family}.css`, import.meta.url), 'utf8')
const block = (family: string) => css(family).match(/\/\* 0\.7\.5 variants \*\/([^]*?)\/\* end 0\.7\.5 variants \*\//)?.[1] ?? ''
const attr = (html: string, slot: string, name: string) =>
  html.match(new RegExp(`<[^>]*data-slot="${slot}"[^>]*>`))?.[0].match(new RegExp(`${name}="([^"]*)"`))?.[1]

describe('CheckboxOption', () => {
  it.each(editions)('%s wraps the checkbox in a label described by its description', (_, ui) => {
    const html = renderToStaticMarkup(h(ui.CheckboxOption, { title: 'Include examples', description: 'Adds sample files' }))
    expect(html.startsWith('<label')).toBe(true)
    expect(attr(html, 'checkbox-option', 'data-appearance')).toBe('row')
    expect(html).toContain('data-slot="checkbox-option-title">Include examples</span>')
    const id = attr(html, 'checkbox-option-description', 'id')
    expect(id).toBeTruthy()
    expect(attr(html, 'checkbox', 'aria-describedby')).toBe(id)
  })

  it.each(editions)('%s merges a given aria-describedby and sets the card appearance', (_, ui) => {
    const html = renderToStaticMarkup(h(ui.CheckboxOption, { title: 'Vite', description: 'React 19', appearance: 'card', 'aria-describedby': 'hint' }))
    expect(attr(html, 'checkbox-option', 'data-appearance')).toBe('card')
    expect(attr(html, 'checkbox', 'aria-describedby')).toBe(`hint ${attr(html, 'checkbox-option-description', 'id')}`)
  })

  it.each(editions)('%s renders no description and no aria-describedby without one', (_, ui) => {
    const html = renderToStaticMarkup(h(ui.CheckboxOption, { title: 'Overwrite modified files' }))
    expect(html).not.toContain('checkbox-option-description')
    expect(attr(html, 'checkbox', 'aria-describedby')).toBeUndefined()
  })

  it.each(editions)('%s leaves a plain Checkbox unchanged', (_, ui) => {
    expect(renderToStaticMarkup(h(ui.Checkbox, { 'aria-label': 'Accept terms' }))).not.toMatch(/checkbox-option|aria-describedby/)
  })

  it.each(families)('%s styles the row, the card, the checked card and forced colours', family => {
    const rules = block(family)
    expect(rules).toContain("[data-slot='checkbox-option']")
    expect(rules).toContain("[data-slot='checkbox-option'][data-appearance='card']")
    expect(rules).toMatch(/\[data-slot='checkbox-option'\]\[data-appearance='card'\]:has\(> \[data-state='checked'\]\) \{[^}]*border-color: var\(--primary\);[^}]*0 0 0 3px color-mix\(in oklab, var\(--primary\) 25%, transparent\)/)
    expect(rules).toMatch(/@media \(forced-colors: active\)[^]*checkbox-option[^]*Highlight/)
    expect(rules).toContain("[data-slot='checkbox-option-title']")
    expect(rules).toContain("[data-slot='checkbox-option-description']")
  })
})
