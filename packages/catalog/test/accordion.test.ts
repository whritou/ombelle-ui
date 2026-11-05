import { describe, expect, it } from 'vitest'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '../src/templates/accordion.js'
import { expectComponentContract } from './new-component-contract.js'

describe('Accordion catalog contract', () => {
  it('provides Radix Accordion parts, both icon styles and family styles', () => {
    expectComponentContract('accordion', {
      client: true,
      parts: ['Accordion', 'AccordionItem', 'AccordionTrigger', 'AccordionContent'],
      slots: [
        'accordion',
        'accordion-item',
        'accordion-header',
        'accordion-trigger',
        'accordion-icon',
        'accordion-content',
        'accordion-content-inner',
      ],
      dependencies: [
        { name: 'react', version: '19.3.1' },
        { name: '@radix-ui/react-accordion', version: '1.3.1' },
        { name: 'clsx', version: '2.1.1' },
        { name: 'tailwind-merge', version: '3.7.0' },
        { name: 'lucide-react', version: '1.55.0' },
      ],
      selectors: [
        "[data-slot='accordion']",
        "[data-slot='accordion-trigger']",
        "[data-slot='accordion-trigger']:focus-visible",
        "[data-slot='accordion-trigger']:disabled",
        "[data-slot='accordion-icon']",
        "[data-slot='accordion-content']",
        "[data-slot='accordion-content-inner']",
      ],
      glass: 'unavailable',
    })
  })

  it('renders heading triggers with expanded state and an open region', () => {
    const html = renderToStaticMarkup(
      createElement(
        Accordion,
        { type: 'single', collapsible: true, defaultValue: 'a' },
        createElement(
          AccordionItem,
          { value: 'a' },
          createElement(AccordionTrigger, { level: 2 }, 'What does a preset change?'),
          createElement(AccordionContent, null, 'Colors and type.'),
        ),
        createElement(
          AccordionItem,
          { value: 'b', disabled: true },
          createElement(AccordionTrigger, null, 'Closed'),
          createElement(AccordionContent, null, 'Hidden'),
        ),
      ),
    )
    for (const text of [
      '<h2 data-orientation="vertical" data-state="open" data-slot="accordion-header"',
      '<h3 data-orientation="vertical" data-state="closed" data-disabled="" data-slot="accordion-header"',
      'aria-expanded="true"',
      'aria-expanded="false"',
      'role="region"',
      'data-slot="accordion-content-inner"',
      'Colors and type.',
      'data-accordion-icon="chevron"',
      'data-accordion-icon="plus"',
    ])
      expect(html).toContain(text)
  })
})
