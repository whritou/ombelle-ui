import { describe, expect, it } from 'vitest'
import { createElement as h } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { getCatalog, getTemplate } from '../src/index.js'
import * as radix from '../src/templates/context-menu.js'
import * as base from '../src/templates/base/context-menu.js'
import { expectComponentContract } from './new-component-contract.js'

type Ui = typeof radix
const slots = ['context-menu', 'context-menu-portal', 'context-menu-trigger', 'context-menu-content', 'context-menu-group', 'context-menu-label',
  'context-menu-item', 'context-menu-checkbox-item', 'context-menu-radio-group', 'context-menu-radio-item', 'context-menu-item-indicator',
  'context-menu-separator', 'context-menu-shortcut', 'context-menu-sub', 'context-menu-sub-trigger', 'context-menu-sub-icon', 'context-menu-sub-content']

describe('Context Menu', () => {
  it('mirrors Dropdown Menu with its own slots and the Radix context menu in the Radix edition only', () => {
    expectComponentContract('context-menu', { client: true,
      parts: ['ContextMenu', 'ContextMenuTrigger', 'ContextMenuContent', 'ContextMenuItem', 'ContextMenuCheckboxItem', 'ContextMenuRadioGroup',
        'ContextMenuRadioItem', 'ContextMenuLabel', 'ContextMenuSeparator', 'ContextMenuShortcut', 'ContextMenuSub', 'ContextMenuSubTrigger', 'ContextMenuSubContent'],
      slots,
      dependencies: [{ name: 'react', version: '19.3.1' }, { name: '@radix-ui/react-context-menu', version: '2.4.1' }, { name: 'clsx', version: '2.1.1' }, { name: 'tailwind-merge', version: '3.7.0' }, { name: 'lucide-react', version: '1.55.0' }],
      selectors: ["[data-slot='context-menu-trigger']", "[data-slot='context-menu-content']", "[data-slot='context-menu-item']", "[data-slot='context-menu-shortcut']"], glass: 'experimental' })
    const baseDependencies = getTemplate(getCatalog('0.1.0'), 'context-menu', 'base').dependencies.map(d => d.name)
    expect(baseDependencies).toContain('@base-ui/react')
    expect(baseDependencies.some(name => name.startsWith('@radix-ui/'))).toBe(false)
  })

  it.each([['radix', radix], ['base', base as unknown as Ui]] as const)('%s renders the zone as a focusable trigger, not a button', (_, ui) => {
    const html = renderToStaticMarkup(h(ui.ContextMenu, null, h(ui.ContextMenuTrigger, { tabIndex: 0, 'aria-label': 'Layer: Hero card' }, 'Right-click'),
      h(ui.ContextMenuContent, null, h(ui.ContextMenuItem, { variant: 'destructive' }, 'Delete'))))
    expect(html).toContain('data-slot="context-menu-trigger"')
    expect(html).toContain('tabindex="0"')
    expect(html).not.toMatch(/^<button/)
  })

  it('marks a destructive item and renders its shortcut', () => {
    expect(radix.ContextMenuItem.toString()).toContain('data-variant')
    expect(renderToStaticMarkup(h(radix.ContextMenuShortcut, null, 'Del'))).toContain('data-slot="context-menu-shortcut"')
  })
})
