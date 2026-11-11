import { describe, expect, it } from 'vitest'
import { createElement as h } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { Chip, ChipGroup, ChipRemove } from '../src/templates/chip.js'
import { expectComponentContract } from './new-component-contract.js'

describe('Chip', () => {
  it('provides Chip, ChipRemove and ChipGroup with lucide-react for the remove icon', () => {
    expectComponentContract('chip', { client: true, parts: ['Chip', 'ChipRemove', 'ChipGroup'], slots: ['chip', 'chip-remove', 'chip-group'],
      dependencies: [{ name: 'react', version: '19.3.1' }, { name: 'clsx', version: '2.1.1' }, { name: 'tailwind-merge', version: '3.7.0' }, { name: 'lucide-react', version: '1.55.0' }],
      selectors: ["[data-slot='chip']", "[data-slot='chip-remove']", "[data-slot='chip-group']"], glass: 'experimental' })
  })

  it('renders a pressable chip as a toggle button', () => {
    const html = renderToStaticMarkup(h(Chip, { defaultPressed: true }, 'On track'))
    expect(html).toMatch(/^<button[^>]*type="button"/)
    expect(html).toContain('aria-pressed="true"')
    expect(html).toContain('data-state="on"')
    expect(html).toContain('data-mode="pressable"')
    expect(renderToStaticMarkup(h(Chip, { pressed: false, onPressedChange: () => {} }, 'Shipped'))).toContain('aria-pressed="false"')
  })

  it('renders a chip without pressed props as a static token', () => {
    const html = renderToStaticMarkup(h(Chip, null, 'glass'))
    expect(html).toMatch(/^<span[^>]*data-mode="static"/)
    expect(html).not.toContain('aria-pressed')
  })

  it('names the remove button after the chip text unless given a label', () => {
    const named = renderToStaticMarkup(h(Chip, null, 'glass', h(ChipRemove)))
    expect(named).toMatch(/<button[^>]*aria-label="Remove glass"/)
    expect(named).toMatch(/<svg[^>]*aria-hidden="true"/)
    expect(renderToStaticMarkup(h(Chip, null, 'glass', h(ChipRemove, { label: 'Delete the glass topic' }))))
      .toContain('aria-label="Delete the glass topic"')
  })

  it('groups chips under a name', () => {
    expect(renderToStaticMarkup(h(ChipGroup, { 'aria-label': 'Status filter' }))).toMatch(/role="group"[^>]*aria-label="Status filter"|aria-label="Status filter"[^>]*role="group"/)
  })
})

describe('a disabled Chip', () => {
  it('disables its remove button too', () => {
    expect(renderToStaticMarkup(h(Chip, { disabled: true }, 'glass', h(ChipRemove)))).toMatch(/<button[^>]*disabled=""[^>]*aria-label="Remove glass"|<button[^>]*aria-label="Remove glass"[^>]*disabled=""/)
  })
})
