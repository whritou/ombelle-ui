import { describe, expect, it } from 'vitest'
import { createElement as h } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import * as radix from '../src/templates/toggle-group.js'
import * as base from '../src/templates/base/toggle-group.js'
import { getCatalog, getTemplate } from '../src/index.js'
import { expectComponentContract } from './new-component-contract.js'

const editions = [['radix', radix], ['base', base]] as const
const count = (html: string, pattern: RegExp) => (html.match(pattern) ?? []).length

describe('Toggle Group', () => {
  it('provides ToggleGroup and ToggleGroupItem, on Radix Toggle Group and Base UI', () => {
    expectComponentContract('toggle-group', { client: true, parts: ['ToggleGroup', 'ToggleGroupItem'], slots: ['toggle-group', 'toggle-group-item'],
      dependencies: [{ name: 'react', version: '19.3.1' }, { name: '@radix-ui/react-toggle-group', version: '1.2.1' }, { name: 'clsx', version: '2.1.1' }, { name: 'tailwind-merge', version: '3.7.0' }],
      selectors: ["[data-slot='toggle-group']", "[data-slot='toggle-group-item']"], glass: 'experimental' })
    expect(getTemplate(getCatalog('0.1.0'), 'toggle-group', 'base').dependencies.map(d => d.name)).toContain('@base-ui/react')
  })

  it.each(editions)('%s single choice is a radio group with one checked item', (_, ui) => {
    const html = renderToStaticMarkup(h(ui.ToggleGroup, { type: 'single', defaultValue: 'week', 'aria-label': 'Calendar view' },
      h(ui.ToggleGroupItem, { value: 'day' }, 'Day'), h(ui.ToggleGroupItem, { value: 'week' }, 'Week'), h(ui.ToggleGroupItem, { value: 'month' }, 'Month')))
    expect(count(html, /role="radiogroup"/g)).toBe(1)
    expect(count(html, /role="radio"/g)).toBe(3)
    expect(count(html, /aria-checked="true"/g)).toBe(1)
    expect(html).toMatch(/aria-checked="true"[^>]*>Week|>Week</)
    expect(html).not.toContain('aria-pressed')
    expect(html).toContain('data-variant="segmented"')
  })

  it.each(editions)('%s multiple choice is a toolbar of pressed buttons', (_, ui) => {
    const html = renderToStaticMarkup(h(ui.ToggleGroup, { type: 'multiple', variant: 'toolbar', defaultValue: ['bold'], 'aria-label': 'Text formatting' },
      h(ui.ToggleGroupItem, { value: 'bold', 'aria-label': 'Bold' }, 'B'), h(ui.ToggleGroupItem, { value: 'italic', 'aria-label': 'Italic' }, 'I')))
    expect(count(html, /role="toolbar"/g)).toBe(1)
    expect(html).not.toContain('role="radio"')
    expect(count(html, /aria-pressed="true"/g)).toBe(1)
    expect(count(html, /aria-pressed="false"/g)).toBe(1)
    expect(html).toContain('data-variant="toolbar"')
  })

  it.each(editions)('%s marks each item with its state for the styles', (_, ui) => {
    const html = renderToStaticMarkup(h(ui.ToggleGroup, { type: 'single', defaultValue: 'a', 'aria-label': 'Pick' },
      h(ui.ToggleGroupItem, { value: 'a' }, 'A'), h(ui.ToggleGroupItem, { value: 'b' }, 'B')))
    expect(count(html, /data-slot="toggle-group-item"[^>]*data-state="on"|data-state="on"[^>]*data-slot="toggle-group-item"/g)).toBe(1)
    expect(count(html, /data-slot="toggle-group-item"[^>]*data-state="off"|data-state="off"[^>]*data-slot="toggle-group-item"/g)).toBe(1)
  })
})
