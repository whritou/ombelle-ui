// The axe findings on the catalog-expansion page (1.0 integration, run 45189492289) that a consumer
// would meet too: each is fixed in the template and pinned here.
import { describe, expect, it } from 'vitest'
import { createElement as h } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import * as pagination from '../src/templates/pagination.js'
import * as calendar from '../src/templates/calendar.js'
import * as baseCalendar from '../src/templates/base/calendar.js'
import * as codeBlock from '../src/templates/code-block.js'
import * as baseCodeBlock from '../src/templates/base/code-block.js'
import * as checkbox from '../src/templates/checkbox.js'

const attr = (html: string, tag: string, name: string) => new RegExp(`<${tag}[^>]*\\s${name}="([^"]*)"`).exec(html)?.[1]

describe('Pagination: aria-prohibited-attr', () => {
  it('keeps the link role on a disabled link, which has no href', () => {
    const html = renderToStaticMarkup(h(pagination.PaginationPrevious, { disabled: true, href: '#p' }))
    expect(html).not.toContain('href=')
    expect(attr(html, 'a', 'role')).toBe('link')
    expect(attr(html, 'a', 'aria-disabled')).toBe('true')
    expect(attr(html, 'a', 'aria-label')).toBe('Go to previous page')
  })

  it('adds no role to an enabled link', () => {
    expect(renderToStaticMarkup(h(pagination.PaginationNext, { href: '#p' }))).not.toContain('role=')
  })
})

describe.each([['radix', calendar], ['base', baseCalendar as unknown as typeof calendar]] as const)('%s Calendar', (_, ui) => {
  it('names its month navigation after the calendar (landmark-unique)', () => {
    const html = renderToStaticMarkup(h(ui.Calendar, { mode: 'single', 'aria-label': 'Delivery day', defaultMonth: '2026-11-01' } as never))
    expect(html).toMatch(/<nav[^>]*aria-label="Delivery day, month navigation"/)
  })

  it('names the Date Picker trigger with its label and the date it shows (label-content-name-mismatch)', () => {
    const labelled = renderToStaticMarkup(h(ui.DatePicker, { 'aria-labelledby': 'due-label', id: 'due', defaultValue: '2026-11-12', locale: 'en-US' } as never))
    expect(attr(labelled, 'button', 'aria-labelledby')).toBe('due-label due')
    expect(attr(labelled, 'button', 'id')).toBe('due')
    const named = renderToStaticMarkup(h(ui.DatePicker, { 'aria-label': 'Due date', defaultValue: '2026-11-12', locale: 'en-US' } as never))
    expect(attr(named, 'button', 'aria-label')).toBe('Due date, Nov 12, 2026')
    const empty = renderToStaticMarkup(h(ui.DatePicker, { 'aria-label': 'Due date' }))
    expect(attr(empty, 'button', 'aria-label')).toBe('Due date, Choose a date')
  })
})

describe.each([['radix', codeBlock], ['base', baseCodeBlock as unknown as typeof codeBlock]] as const)('%s Code Block', (_, ui) => {
  it('names a diff block for its changes, so a file and its diff differ (landmark-unique)', () => {
    const code = ':root {\n-  --radius: 0.5rem;\n+  --radius: 0.75rem;\n}\n'
    expect(attr(renderToStaticMarkup(h(ui.CodeBlock, { title: 'ui-style.css', code, diff: true })), 'pre', 'aria-label')).toBe('ui-style.css changes')
    expect(attr(renderToStaticMarkup(h(ui.CodeBlock, { title: 'ui-style.css', code })), 'pre', 'aria-label')).toBe('ui-style.css source')
    expect(attr(renderToStaticMarkup(h(ui.CodeBlock, { code, diff: true })), 'pre', 'aria-label')).toBe('Changes')
  })
})

describe('Checkbox option (Radix): color-contrast on a disabled option', () => {
  it('ties its label to the checkbox button by id', () => {
    const html = renderToStaticMarkup(h(checkbox.CheckboxOption, { title: 'Popover', disabled: true }))
    const id = attr(html, 'button', 'id')
    expect(id).toBeTruthy()
    expect(attr(html, 'label', 'for')).toBe(id)
  })

  it('uses the group id inside a CheckboxGroup, and a caller id first', () => {
    const grouped = renderToStaticMarkup(h(checkbox.CheckboxGroup, { defaultValue: [] }, h(checkbox.CheckboxOption, { value: 'sheet', title: 'Sheet' })))
    expect(attr(grouped, 'label', 'for')).toBe(attr(grouped, 'button', 'id'))
    const own = renderToStaticMarkup(h(checkbox.CheckboxOption, { id: 'mine', title: 'Mine' }))
    expect(attr(own, 'label', 'for')).toBe('mine')
    expect(attr(own, 'button', 'id')).toBe('mine')
  })
})
