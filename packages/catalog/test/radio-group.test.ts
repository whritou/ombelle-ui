import { describe, expect, it } from 'vitest'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import {
  RadioGroup,
  RadioGroupItem,
  RadioGroupOption,
  RadioGroupOptionDescription,
  RadioGroupOptionLabel,
} from '../src/templates/radio-group.js'
import { expectComponentContract } from './new-component-contract.js'

describe('Radio Group catalog contract', () => {
  it('provides Radix Radio Group parts, option rows and family styles', () => {
    expectComponentContract('radio-group', {
      client: true,
      parts: [
        'RadioGroup',
        'RadioGroupItem',
        'RadioGroupOption',
        'RadioGroupOptionLabel',
        'RadioGroupOptionDescription',
      ],
      slots: [
        'radio-group',
        'radio-group-item',
        'radio-group-indicator',
        'radio-group-option',
        'radio-group-option-label',
        'radio-group-option-description',
      ],
      dependencies: [
        { name: 'react', version: '19.3.1' },
        { name: '@radix-ui/react-radio-group', version: '1.5.1' },
        { name: 'clsx', version: '2.1.1' },
        { name: 'tailwind-merge', version: '3.7.0' },
      ],
      selectors: [
        "[data-slot='radio-group']",
        "[data-slot='radio-group-item']",
        "[data-slot='radio-group-item'][data-state='checked']",
        "[data-slot='radio-group-item']:focus-visible",
        "[data-slot='radio-group-item']:disabled",
        "[data-slot='radio-group-item'][aria-invalid='true']",
        "[data-slot='radio-group-indicator']",
        "[data-slot='radio-group-option']:has([data-slot='radio-group-item'][data-state='checked'])",
        "[data-slot='radio-group-option']:has([data-slot='radio-group-item'][data-disabled])",
      ],
      glass: 'experimental',
    })
  })

  it('renders a labelled radiogroup with checked and disabled radios', () => {
    const option = (value: string, label: string, disabled = false) =>
      createElement(
        RadioGroupOption,
        { key: value },
        createElement(RadioGroupItem, { value, disabled }),
        createElement(RadioGroupOptionLabel, null, label),
        createElement(RadioGroupOptionDescription, null, label + ' plan'),
      )
    const html = renderToStaticMarkup(
      createElement(
        RadioGroup,
        { defaultValue: 'team', 'aria-label': 'Plan', className: 'custom' },
        option('starter', 'Starter'),
        option('team', 'Team'),
        option('enterprise', 'Enterprise', true),
      ),
    )
    for (const text of [
      'role="radiogroup"',
      'aria-label="Plan"',
      'class="custom"',
      'role="radio"',
      'aria-checked="true"',
      'aria-checked="false"',
      'data-state="checked"',
      'data-disabled=""',
      'data-slot="radio-group-indicator"',
      '<label data-slot="radio-group-option"',
      'Team plan',
    ])
      expect(html).toContain(text)
    // Radix renders the indicator only for the checked radio.
    expect(html.match(/data-slot="radio-group-indicator"/g)).toHaveLength(1)
  })
})
