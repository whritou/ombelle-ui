import { describe, expect, it } from 'vitest'
import { createElement as h, Fragment } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { getCatalog, getTemplate } from '../src/index.js'
import * as radix from '../src/templates/combobox.js'
import * as base from '../src/templates/base/combobox.js'
import { expectComponentContract } from './new-component-contract.js'

type Ui = typeof radix
const editions = [['radix', radix], ['base', base as unknown as Ui]] as const
const markup = (node: React.ReactNode) => renderToStaticMarkup(h(Fragment, null, node))
const presets = (ui: Ui, props: Record<string, unknown>) => markup(h(ui.Combobox, props as never,
  h(ui.ComboboxInput, { 'aria-label': 'Preset', placeholder: 'Search presets' }),
  h(ui.ComboboxContent, null,
    h(ui.ComboboxList, null,
      h(ui.ComboboxItem, { value: 'liquid-glass' }, 'Liquid glass'),
      h(ui.ComboboxItem, { value: 'ombelle' }, 'Ombelle'),
      h(ui.ComboboxCreate)),
    h(ui.ComboboxEmpty, null, 'No presets found.'))))

describe('highlightMatch', () => {
  it.each(editions)('%s marks the first case-insensitive literal match', (_, ui) => {
    expect(markup(ui.highlightMatch('Liquid glass', 'GLA'))).toBe('Liquid <mark data-slot="combobox-match">gla</mark>ss')
    expect(markup(ui.highlightMatch('C++ tools', 'c++'))).toBe('<mark data-slot="combobox-match">C++</mark> tools')
    expect(ui.highlightMatch('abc', '(')).toBe('abc')
    expect(ui.highlightMatch('abc', '')).toBe('abc')
    expect(ui.highlightMatch('abc', '   ')).toBe('abc')
  })
})

describe('shouldOfferCreate', () => {
  it.each(editions)('%s offers to create only a new, non-blank name', (_, ui) => {
    expect(ui.shouldOfferCreate('  liquid GLASS ', ['Liquid glass'])).toBe(false)
    expect(ui.shouldOfferCreate('gla', ['Liquid glass'])).toBe(true)
    expect(ui.shouldOfferCreate('   ', [])).toBe(false)
  })
})

describe('Combobox', () => {
  it('provides its parts, with the Radix popover in the Radix edition only', () => {
    expectComponentContract('combobox', { client: true,
      parts: ['Combobox', 'ComboboxInput', 'ComboboxContent', 'ComboboxList', 'ComboboxItem', 'ComboboxGroup', 'ComboboxEmpty', 'ComboboxCreate', 'ComboboxChips'],
      slots: ['combobox', 'combobox-field', 'combobox-input', 'combobox-content', 'combobox-list', 'combobox-group', 'combobox-group-heading', 'combobox-item',
        'combobox-match', 'combobox-empty', 'combobox-create', 'combobox-chips', 'combobox-chip', 'combobox-chip-remove'],
      dependencies: [{ name: 'react', version: '19.3.1' }, { name: '@radix-ui/react-popover', version: '1.3.1' }, { name: 'clsx', version: '2.1.1' }, { name: 'tailwind-merge', version: '3.7.0' }, { name: 'lucide-react', version: '1.55.0' }],
      selectors: ["[data-slot='combobox-field']", "[data-slot='combobox-input']", "[data-slot='combobox-content']", "[data-slot='combobox-item']", "[data-slot='combobox-match']", "[data-slot='combobox-create']", "[data-slot='combobox-chip']", "[data-slot='combobox-chip-remove']"], glass: 'experimental' })
    const baseDependencies = getTemplate(getCatalog('0.1.0'), 'combobox', 'base').dependencies.map(d => d.name)
    expect(baseDependencies).toContain('@base-ui/react')
    expect(baseDependencies).not.toContain('cmdk')
    expect(baseDependencies.some(name => name.startsWith('@radix-ui/'))).toBe(false)
  })

  it.each(editions)('%s renders a closed list box combobox holding the starting query', (_, ui) => {
    const input = /<input[^>]*data-slot="combobox-input"[^>]*>/.exec(presets(ui, { defaultQuery: 'gla' }))![0]
    expect(input).toContain('role="combobox"')
    expect(input).toContain('aria-autocomplete="list"')
    expect(input).toContain('aria-expanded="false"')
    expect(input).toContain('value="gla"')
    expect(input).toContain('aria-label="Preset"')
  })

  it.each(editions)('%s shows a chip per value in multiple mode, named after its item', (_, ui) => {
    const html = presets(ui, { multiple: true, defaultValue: ['ombelle'], name: 'presets' })
    expect(html).toMatch(/<button[^>]*aria-label="Remove Ombelle"/)
    expect(html).toContain('data-slot="combobox-chip"')
    expect(html).toMatch(/<input[^>]*type="hidden"[^>]*name="presets"[^>]*value="ombelle"|<input[^>]*name="presets"[^>]*type="hidden"[^>]*value="ombelle"|<input[^>]*type="hidden"[^>]*value="ombelle"[^>]*name="presets"/)
  })

  it.each(editions)('%s keeps a marked option text in one inline run, so its name stays whole', (_, ui) => {
    const html = markup(h(ui.Combobox, { defaultQuery: 'gla' } as never, h(ui.ComboboxItem, { value: 'liquid-glass' }, 'Liquid glass')))
    expect(html).toContain('<span>Liquid <mark data-slot="combobox-match">gla</mark>ss</span>')
  })

  it.each(editions)('%s puts the selected label in the input in single mode', (_, ui) => {
    expect(/<input[^>]*data-slot="combobox-input"[^>]*>/.exec(presets(ui, { defaultValue: 'ombelle' }))![0]).toContain('value="Ombelle"')
  })
})
