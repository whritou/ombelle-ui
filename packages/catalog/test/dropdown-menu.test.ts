import { describe, expect, it } from 'vitest'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import {
  DropdownMenu,
  DropdownMenuTrigger,
} from '../src/templates/dropdown-menu.js'
import { expectComponentContract } from './new-component-contract.js'

const items = [
  "[data-slot='dropdown-menu-item']",
  "[data-slot='dropdown-menu-checkbox-item']",
  "[data-slot='dropdown-menu-radio-item']",
  "[data-slot='dropdown-menu-sub-trigger']",
]

describe('Dropdown Menu catalog contract', () => {
  it('provides Radix Dropdown Menu parts, scoped dependencies and family styles', () => {
    expectComponentContract('dropdown-menu', {
      client: true,
      parts: [
        'DropdownMenu',
        'DropdownMenuPortal',
        'DropdownMenuTrigger',
        'DropdownMenuContent',
        'DropdownMenuGroup',
        'DropdownMenuLabel',
        'DropdownMenuItem',
        'DropdownMenuCheckboxItem',
        'DropdownMenuRadioGroup',
        'DropdownMenuRadioItem',
        'DropdownMenuSeparator',
        'DropdownMenuShortcut',
        'DropdownMenuSub',
        'DropdownMenuSubTrigger',
        'DropdownMenuSubContent',
      ],
      slots: [
        'dropdown-menu',
        'dropdown-menu-portal',
        'dropdown-menu-trigger',
        'dropdown-menu-content',
        'dropdown-menu-group',
        'dropdown-menu-label',
        'dropdown-menu-item',
        'dropdown-menu-checkbox-item',
        'dropdown-menu-radio-group',
        'dropdown-menu-radio-item',
        'dropdown-menu-item-indicator',
        'dropdown-menu-separator',
        'dropdown-menu-shortcut',
        'dropdown-menu-sub',
        'dropdown-menu-sub-trigger',
        'dropdown-menu-sub-icon',
        'dropdown-menu-sub-content',
      ],
      dependencies: [
        { name: 'react', version: '19.3.1' },
        { name: '@radix-ui/react-dropdown-menu', version: '2.2.1' },
        { name: 'clsx', version: '2.1.1' },
        { name: 'tailwind-merge', version: '3.7.0' },
        { name: 'lucide-react', version: '1.55.0' },
      ],
      selectors: [
        "[data-slot='dropdown-menu-content']",
        "[data-slot='dropdown-menu-sub-content']",
        "[data-slot='dropdown-menu-label']",
        ...items.map((item) => item + '[data-highlighted]'),
        ...items.map((item) => item + '[data-disabled]'),
        "[data-slot='dropdown-menu-item'][data-variant='destructive']",
        "[data-slot='dropdown-menu-sub-trigger'][data-state='open']",
        "[data-slot='dropdown-menu-item-indicator']",
        "[data-slot='dropdown-menu-shortcut']",
        "[data-slot='dropdown-menu-separator']",
      ],
      glass: 'experimental',
    })
  })

  it('renders a menu trigger with popup state', () => {
    const html = renderToStaticMarkup(
      createElement(
        DropdownMenu,
        null,
        createElement(
          DropdownMenuTrigger,
          { className: 'custom-trigger' },
          'Project actions',
        ),
      ),
    )
    for (const text of [
      'data-slot="dropdown-menu-trigger"',
      'aria-haspopup="menu"',
      'aria-expanded="false"',
      'data-state="closed"',
      'class="custom-trigger"',
    ])
      expect(html).toContain(text)
  })
})
