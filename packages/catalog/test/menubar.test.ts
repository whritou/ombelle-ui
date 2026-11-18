import { describe, expect, it } from 'vitest'
import { createElement as h } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { getCatalog, getTemplate } from '../src/index.js'
import * as radix from '../src/templates/menubar.js'
import * as base from '../src/templates/base/menubar.js'
import { expectComponentContract } from './new-component-contract.js'

type Ui = typeof radix
const editions = [['radix', radix], ['base', base as unknown as Ui]] as const
const slots = ['menubar', 'menubar-menu', 'menubar-portal', 'menubar-trigger', 'menubar-content', 'menubar-group', 'menubar-label', 'menubar-item', 'menubar-checkbox-item',
  'menubar-radio-group', 'menubar-radio-item', 'menubar-item-indicator', 'menubar-separator', 'menubar-shortcut', 'menubar-sub', 'menubar-sub-trigger', 'menubar-sub-icon', 'menubar-sub-content']
const tag = (html: string, pattern: string) => html.match(new RegExp(`<[^>]*${pattern}[^>]*>`))?.[0] ?? ''

const bar = (ui: Ui) => h(ui.Menubar, { 'aria-label': 'Editor' },
  h(ui.MenubarMenu, null, h(ui.MenubarTrigger, null, 'File'), h(ui.MenubarContent, null, h(ui.MenubarItem, null, 'Download JSON', h(ui.MenubarShortcut, null, '⌘S')))),
  h(ui.MenubarMenu, null, h(ui.MenubarTrigger, null, 'Edit'), h(ui.MenubarContent, null, h(ui.MenubarItem, null, 'Undo'))),
  h(ui.MenubarMenu, null, h(ui.MenubarTrigger, null, 'View'), h(ui.MenubarContent, null, h(ui.MenubarCheckboxItem, { checked: true }, 'Grid'))))

describe('Menubar', () => {
  it('provides the parts in both editions', () => {
    expectComponentContract('menubar', { client: true,
      parts: ['Menubar', 'MenubarMenu', 'MenubarTrigger', 'MenubarContent', 'MenubarItem', 'MenubarCheckboxItem', 'MenubarRadioGroup', 'MenubarRadioItem', 'MenubarLabel', 'MenubarSeparator', 'MenubarShortcut', 'MenubarSub', 'MenubarSubTrigger', 'MenubarSubContent', 'MenubarGroup'],
      slots,
      dependencies: [{ name: 'react', version: '19.3.1' }, { name: '@radix-ui/react-menubar', version: '1.2.1' },
        { name: 'clsx', version: '2.1.1' }, { name: 'tailwind-merge', version: '3.7.0' }, { name: 'lucide-react', version: '1.55.0' }],
      selectors: ["[data-slot='menubar']", "[data-slot='menubar-trigger']", "[data-slot='menubar-content']", "[data-slot='menubar-item']", "[data-slot='menubar-shortcut']"],
      glass: 'experimental' })
    expect(getTemplate(getCatalog('0.1.0'), 'menubar', 'base').dependencies.map(dependency => dependency.name)).toEqual(expect.arrayContaining(['@base-ui/react', 'lucide-react']))
  })

  it.each(editions)('%s renders a menubar role with one trigger per menu', (_, ui) => {
    const html = renderToStaticMarkup(bar(ui))
    expect(tag(html, 'data-slot="menubar"')).toContain('role="menubar"')
    expect(html.match(/data-slot="menubar-trigger"/g)).toHaveLength(3)
  })

  it('shows shortcuts as text only, without binding them', () => {
    const source = getTemplate(getCatalog('0.1.0'), 'menubar').content
    const shortcut = source.slice(source.indexOf('export function MenubarShortcut'), source.indexOf('export function MenubarSub('))
    expect(shortcut).toContain('<span')
    expect(shortcut).not.toMatch(/addEventListener|onKeyDown|aria-keyshortcuts/)
  })
})
