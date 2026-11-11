import { describe, expect, it } from 'vitest'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import {
  Select,
  SelectTrigger,
  SelectValue,
} from '../src/templates/select.js'
import { expectComponentContract } from './new-component-contract.js'

describe('Select catalog contract', () => {
  it('provides Radix Select parts, scoped dependencies and family styles', () => {
    expectComponentContract('select', {
      client: true,
      parts: [
        'Select',
        'SelectGroup',
        'SelectValue',
        'SelectTrigger',
        'SelectContent',
        'SelectLabel',
        'SelectItem',
        'SelectSeparator',
        'SelectScrollUpButton',
        'SelectScrollDownButton',
      ],
      slots: [
        'select',
        'select-group',
        'select-value',
        'select-trigger',
        'select-icon',
        'select-content',
        'select-viewport',
        'select-label',
        'select-item',
        'select-item-indicator',
        'select-item-hint',
        'select-separator',
        'select-scroll-up-button',
        'select-scroll-down-button',
        'select-chip',
        'select-item-icon',
      ],
      dependencies: [
        { name: 'react', version: '19.3.1' },
        { name: '@radix-ui/react-popover', version: '1.3.1' },
        { name: '@radix-ui/react-select', version: '2.4.1' },
        { name: 'clsx', version: '2.1.1' },
        { name: 'tailwind-merge', version: '3.7.0' },
        { name: 'lucide-react', version: '1.55.0' },
      ],
      selectors: [
        "[data-slot='select-trigger']",
        "[data-slot='select-trigger'][data-state='open']",
        "[data-slot='select-trigger']:focus-visible",
        "[data-slot='select-trigger'][aria-invalid='true']",
        "[data-slot='select-trigger']:disabled",
        "[data-slot='select-content']",
        "[data-slot='select-item'][data-highlighted]",
        "[data-slot='select-item'][data-state='checked']",
        "[data-slot='select-item'][data-disabled]",
        "[data-slot='select-item-hint']",
        "[data-slot='select-separator']",
      ],
      glass: 'experimental',
    })
  })

  it('renders an accessible combobox trigger that forwards props', () => {
    const html = renderToStaticMarkup(
      createElement(
        Select,
        { defaultValue: 'designer', disabled: false },
        createElement(
          SelectTrigger,
          {
            'aria-label': 'Role',
            className: 'custom-trigger',
            size: 'sm',
            'aria-invalid': true,
          },
          createElement(SelectValue, { placeholder: 'Choose a role' }),
        ),
      ),
    )
    for (const text of [
      'role="combobox"',
      'aria-expanded="false"',
      'aria-label="Role"',
      'aria-invalid="true"',
      'data-slot="select-trigger"',
      'data-size="sm"',
      'data-slot="select-icon"',
      'class="custom-trigger"',
    ])
      expect(html).toContain(text)
  })
})
