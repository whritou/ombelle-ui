import { describe, expect, it } from 'vitest'
import { createElement as h } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { getCatalog, getTemplate } from '../src/index.js'
import * as radix from '../src/templates/toolbar.js'
import * as base from '../src/templates/base/toolbar.js'
import { expectComponentContract } from './new-component-contract.js'

type Ui = typeof radix
const editions = [['radix', radix], ['base', base as unknown as Ui]] as const
const slots = ['toolbar', 'toolbar-button', 'toolbar-link', 'toolbar-toggle-group', 'toolbar-toggle-item', 'toolbar-separator', 'toolbar-overflow-trigger', 'toolbar-overflow-content', 'toolbar-overflow-item', 'toolbar-overflow-indicator', 'toolbar-overflow-separator']
const tag = (html: string, pattern: string) => html.match(new RegExp(`<[^>]*${pattern}[^>]*>`))?.[0] ?? ''

describe('Toolbar', () => {
  it('provides the parts in both editions', () => {
    expectComponentContract('toolbar', { client: true,
      parts: ['Toolbar', 'ToolbarButton', 'ToolbarLink', 'ToolbarToggleGroup', 'ToolbarToggleItem', 'ToolbarSeparator', 'ToolbarOverflow', 'ToolbarOverflowItem'], slots,
      dependencies: [{ name: 'react', version: '19.3.1' }, { name: '@radix-ui/react-dropdown-menu', version: '2.2.1' }, { name: '@radix-ui/react-toolbar', version: '1.2.1' },
        { name: 'clsx', version: '2.1.1' }, { name: 'tailwind-merge', version: '3.7.0' }, { name: 'lucide-react', version: '1.55.0' }],
      selectors: ["[data-slot='toolbar']", "[data-slot='toolbar-button']", "[data-slot='toolbar-toggle-item']", "[data-slot='toolbar-separator']", "[data-slot='toolbar-overflow-trigger']", "[data-slot='toolbar-overflow-content']", "[data-slot='toolbar-overflow-item']"],
      glass: 'experimental' })
    expect(getTemplate(getCatalog('0.1.0'), 'toolbar', 'base').dependencies.map(dependency => dependency.name)).toEqual(expect.arrayContaining(['@base-ui/react', 'lucide-react']))
  })

  it.each(editions)('%s renders a named toolbar with every item shown and the trigger hidden', (_, ui) => {
    const html = renderToStaticMarkup(h(ui.Toolbar, { 'aria-label': 'View options' },
      h(ui.ToolbarToggleGroup, { type: 'single', defaultValue: 'light', 'aria-label': 'Theme' },
        h(ui.ToolbarToggleItem, { value: 'light' }, 'Light'), h(ui.ToolbarToggleItem, { value: 'dark' }, 'Dark')),
      h(ui.ToolbarSeparator),
      h(ui.ToolbarButton, null, 'Grid'),
      h(ui.ToolbarLink, { href: '#preview' }, 'Open preview'),
      h(ui.ToolbarOverflow)))
    const root = tag(html, 'data-slot="toolbar"')
    expect(root).toContain('role="toolbar"')
    expect(root).toContain('aria-label="View options"')
    expect(html).not.toContain('data-overflowed')
    expect(tag(html, 'data-slot="toolbar-overflow-trigger"')).toMatch(/ hidden(="")?[ >]/)
    expect(tag(html, 'data-slot="toolbar-overflow-trigger"')).toContain('aria-label="More"')
    expect(html.match(/data-toolbar-item=""/g)).toHaveLength(4)
  })

  it.each(editions)('%s shows the trigger when the menu has its own items', (_, ui) => {
    const html = renderToStaticMarkup(h(ui.Toolbar, { 'aria-label': 'Editor actions' },
      h(ui.ToolbarButton, null, 'Undo'),
      h(ui.ToolbarOverflow, { label: 'Preset actions' }, h(ui.ToolbarOverflowItem, { onSelect: () => {} }, 'Duplicate'))))
    const trigger = tag(html, 'data-slot="toolbar-overflow-trigger"')
    expect(trigger).toContain('aria-label="Preset actions"')
    expect(trigger).not.toMatch(/ hidden(="")?[ >]/)
  })
})
