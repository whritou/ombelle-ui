import { describe, expect, it } from 'vitest'
import { createElement as h } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { getCatalog, getTemplate } from '../src/index.js'
import * as radix from '../src/templates/command.js'
import * as base from '../src/templates/base/command.js'
import { expectComponentContract } from './new-component-contract.js'

type Ui = typeof radix
const editions = [['radix', radix], ['base', base as unknown as Ui]] as const
const menu = (ui: Ui, defaultSearch?: string) => renderToStaticMarkup(h(ui.Command, { label: 'Commands', defaultSearch },
  h(ui.CommandInput, { placeholder: 'Search commands' }),
  h(ui.CommandList, null,
    h(ui.CommandGroup, { heading: 'Components' },
      h(ui.CommandItem, { onSelect: () => {} }, 'Add Button', h(ui.CommandShortcut, null, '↵')),
      h(ui.CommandItem, null, 'Add Dialog')),
    h(ui.CommandSeparator),
    h(ui.CommandGroup, { heading: 'Theme' },
      h(ui.CommandItem, null, 'Add theme from preset', h(ui.CommandShortcut, null, 'Ctrl+T')))),
  h(ui.CommandEmpty, null, 'No results.')))

describe('Command', () => {
  it('provides its parts, with cmdk and the Radix dialog in the Radix edition only', () => {
    expectComponentContract('command', { client: true,
      parts: ['Command', 'CommandDialog', 'CommandDialogTrigger', 'CommandInput', 'CommandList', 'CommandGroup', 'CommandItem', 'CommandShortcut', 'CommandSeparator', 'CommandEmpty'],
      slots: ['command', 'command-dialog-trigger', 'command-dialog-overlay', 'command-dialog', 'command-dialog-title', 'command-search', 'command-input', 'command-list', 'command-group',
        'command-group-heading', 'command-item', 'command-shortcut', 'command-separator', 'command-empty'],
      dependencies: [{ name: 'react', version: '19.3.1' }, { name: '@radix-ui/react-dialog', version: '1.3.1' }, { name: 'cmdk', version: '1.1.1' }, { name: 'clsx', version: '2.1.1' }, { name: 'tailwind-merge', version: '3.7.0' }, { name: 'lucide-react', version: '1.55.0' }],
      selectors: ["[data-slot='command']", "[data-slot='command-search']", "[data-slot='command-item']", "[data-slot='command-shortcut']", "[data-slot='command-group-heading']", "[data-slot='command-empty']"], glass: 'experimental' })
    const baseDependencies = getTemplate(getCatalog('0.1.0'), 'command', 'base').dependencies.map(d => d.name)
    expect(baseDependencies).toContain('@base-ui/react')
    expect(baseDependencies).not.toContain('cmdk')
    expect(baseDependencies.some(name => name.startsWith('@radix-ui/'))).toBe(false)
  })

  it.each(editions)('%s renders a searchable listbox with group headings and key hints', (_, ui) => {
    const html = menu(ui)
    expect(html).toMatch(/<input[^>]*role="combobox"/)
    expect(html).toMatch(/role="listbox"/)
    expect(html.match(/role="option"/g)).toHaveLength(3)
    expect(html).toContain('>Components<')
    expect(html).toContain('<kbd>Ctrl</kbd><kbd>T</kbd>')
    expect(html).toMatch(/role="status"[^>]*aria-live="polite"|aria-live="polite"[^>]*role="status"/)
  })

  it('base filters on the first render and hides groups with no match', () => {
    const html = menu(base as unknown as Ui, 'button')
    expect(html).toContain('Add Button')
    expect(html).not.toContain('Add Dialog')
    expect(html).not.toContain('>Theme<')
  })

  it('base shows the empty text once nothing matches', () => {
    expect(menu(base as unknown as Ui, 'zzz')).toContain('No results.')
    expect(menu(base as unknown as Ui)).not.toContain('No results.')
  })
})
