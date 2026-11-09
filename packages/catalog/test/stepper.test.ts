import { describe, expect, it } from 'vitest'
import { createElement as h } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { Stepper, StepperItem, StepperIndicator, StepperTitle, StepperDescription, StepperSeparator } from '../src/templates/stepper.js'
import { expectComponentContract } from './new-component-contract.js'

const slots = ['stepper', 'stepper-list', 'stepper-item', 'stepper-indicator', 'stepper-title', 'stepper-description', 'stepper-separator']
const steps = (statuses: readonly ('complete' | 'current' | 'upcoming')[], orientation?: 'vertical') =>
  renderToStaticMarkup(h(Stepper, { orientation, 'aria-label': 'Setup' }, ...statuses.map((status, index) =>
    h(StepperItem, { key: index, status }, h(StepperIndicator, null, String(index + 1)), h(StepperTitle, null, `Step ${index + 1}`),
      h(StepperDescription, null, 'Details'), index < statuses.length - 1 ? h(StepperSeparator) : null))))

describe('Stepper', () => {
  it('provides the Stepper parts without client code', () => {
    expectComponentContract('stepper', { client: false, parts: ['Stepper', 'StepperItem', 'StepperIndicator', 'StepperTitle', 'StepperDescription', 'StepperSeparator'],
      slots, dependencies: [{ name: 'react', version: '19.3.1' }, { name: 'clsx', version: '2.1.1' }, { name: 'tailwind-merge', version: '3.7.0' },
        { name: 'lucide-react', version: '1.55.0' }],
      selectors: slots.map(slot => `[data-slot='${slot}']`), glass: 'experimental' })
  })

  it('renders a named nav with an ordered list and marks only the current step', () => {
    const html = steps(['complete', 'current', 'upcoming'])
    expect(html).toMatch(/^<nav[^>]*aria-label="Setup"/)
    expect(html).toMatch(/<ol[^>]*data-slot="stepper-list"/)
    expect(html.match(/aria-current="step"/g)).toHaveLength(1)
    expect(html).toMatch(/<li[^>]*aria-current="step"[^>]*>|<li[^>]*data-status="current"[^>]*aria-current="step"/)
    expect(html.match(/Completed: /g)).toHaveLength(1)
    expect(html).toMatch(/data-slot="stepper-separator"[^>]*aria-hidden="true"|aria-hidden="true"[^>]*data-slot="stepper-separator"/)
  })

  it('passes the orientation through', () => {
    expect(steps(['current', 'upcoming'], 'vertical')).toContain('data-orientation="vertical"')
  })

  it('marks no step current once every step is complete', () => {
    const html = steps(['complete', 'complete', 'complete'])
    expect(html).not.toContain('aria-current')
    expect(html.match(/Completed: /g)).toHaveLength(3)
  })
})
