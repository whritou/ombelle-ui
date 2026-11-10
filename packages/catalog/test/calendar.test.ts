import { describe, expect, it } from 'vitest'
import { createElement as h } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { getCatalog, getTemplate } from '../src/index.js'
import * as radix from '../src/templates/calendar.js'
import * as base from '../src/templates/base/calendar.js'
import { expectComponentContract } from './new-component-contract.js'

type Ui = typeof radix
const editions = [['radix', radix], ['base', base as unknown as Ui]] as const
const today = new Date(2026, 10, 10)
const slots = ['calendar', 'calendar-months', 'calendar-month', 'calendar-nav', 'calendar-previous', 'calendar-next', 'calendar-caption',
  'calendar-grid', 'calendar-weekdays', 'calendar-weekday', 'calendar-week', 'calendar-day', 'calendar-day-button',
  'date-picker', 'date-picker-trigger', 'date-picker-content']
const day = (html: string, iso: string) => new RegExp(`<td[^>]*data-day="${iso}"[^>]*>`).exec(html)![0]

describe('Calendar', () => {
  it('provides Calendar and DatePicker with react-day-picker, and the Radix popover in the Radix edition only', () => {
    expectComponentContract('calendar', { client: true, parts: ['Calendar', 'DatePicker'], slots,
      dependencies: [{ name: 'react', version: '19.3.1' }, { name: '@radix-ui/react-popover', version: '1.3.1' }, { name: 'date-fns', version: '4.4.0' },
        { name: '@date-fns/tz', version: '1.5.0' }, { name: 'clsx', version: '2.1.1' }, { name: 'tailwind-merge', version: '3.7.0' },
        { name: 'react-day-picker', version: '10.0.2' }, { name: 'lucide-react', version: '1.55.0' }],
      selectors: ["[data-slot='calendar']", "[data-slot='calendar-day']", "[data-slot='calendar-day-button']", "[data-slot='date-picker-trigger']"], glass: 'experimental' })
    const names = getTemplate(getCatalog('0.1.0'), 'calendar', 'base').dependencies.map(d => d.name)
    expect(names).toContain('@base-ui/react')
    expect(names).toContain('react-day-picker')
    expect(names.some(name => name.startsWith('@radix-ui/'))).toBe(false)
  })

  it.each(editions)('%s draws a named month grid with Sunday first, or Monday when asked', (_, ui) => {
    const html = renderToStaticMarkup(h(ui.Calendar, { mode: 'single', defaultMonth: today, today }))
    expect(html).toMatch(/role="grid"[^>]*aria-label="[^"]*November 2026/)
    const headers = [...html.matchAll(/<th[^>]*data-slot="calendar-weekday"[^>]*>([^<]*)/g)].map(match => match[1])
    expect(headers).toHaveLength(7)
    expect(headers[0]).toMatch(/^Su/)
    const monday = [...renderToStaticMarkup(h(ui.Calendar, { mode: 'single', defaultMonth: today, today, weekStartsOn: 1 })).matchAll(/<th[^>]*data-slot="calendar-weekday"[^>]*>([^<]*)/g)]
    expect(monday[0]![1]).toMatch(/^Mo/)
    expect(html).toMatch(/<button[^>]*aria-label="[^"]*November 12[^"]*"/)
    expect(html).toContain('data-slot="calendar-day-button"')
  })

  it.each(editions)('%s names each day with its number as a word, so the visible text is part of the name', (_, ui) => {
    const html = renderToStaticMarkup(h(ui.Calendar, { mode: 'single', defaultMonth: today, today, selected: new Date(2026, 10, 12) }))
    expect(html).toMatch(/<button[^>]*aria-label="Sunday, November 1, 2026"/)
    expect(html).toMatch(/<button[^>]*aria-label="Today, Tuesday, November 10, 2026"/)
    expect(html).toMatch(/<button[^>]*aria-label="Thursday, November 12, 2026, selected"/)
  })

  it.each(editions)('%s marks the start, middle and end of a range', (_, ui) => {
    const html = renderToStaticMarkup(h(ui.Calendar, { mode: 'range', defaultMonth: today, today, selected: { from: new Date(2026, 10, 12), to: new Date(2026, 10, 18) } }))
    expect(day(html, '2026-11-12')).toContain('data-range-start')
    expect(day(html, '2026-11-13')).toContain('data-range-middle')
    expect(day(html, '2026-11-18')).toContain('data-range-end')
    expect(day(html, '2026-11-19')).not.toContain('data-range')
  })

  it.each(editions)('%s accepts ISO dates, as recipe specimens pass them', (_, ui) => {
    const html = renderToStaticMarkup(h(ui.Calendar, { mode: 'single', defaultMonth: '2026-11-01', today: '2026-11-10', selected: '2026-11-12' } as never))
    expect(day(html, '2026-11-12')).toContain('data-selected')
    expect(day(html, '2026-11-10')).toContain('data-today')
  })
})

describe('DatePicker', () => {
  it.each(editions)('%s shows the formatted date, or the placeholder, and submits the ISO date', (_, ui) => {
    const html = renderToStaticMarkup(h(ui.DatePicker, { defaultValue: new Date(2026, 10, 12), locale: 'en-US', name: 'due', 'aria-label': 'Due date' }))
    expect(html).toMatch(/<button[^>]*data-slot="date-picker-trigger"[^>]*>/)
    expect(html).toContain('Nov 12, 2026')
    expect(html).toMatch(/<input[^>]*type="hidden"[^>]*name="due"[^>]*value="2026-11-12"|<input[^>]*name="due"[^>]*type="hidden"[^>]*value="2026-11-12"|<input[^>]*type="hidden"[^>]*value="2026-11-12"[^>]*name="due"/)
    const empty = renderToStaticMarkup(h(ui.DatePicker, { 'aria-label': 'Due date' }))
    expect(empty).toContain('Choose a date')
    expect(empty).toMatch(/data-slot="date-picker-trigger"[^>]*data-placeholder|data-placeholder[^>]*data-slot="date-picker-trigger"/)
  })

  it.each(editions)('%s submits a range as two dates', (_, ui) => {
    const html = renderToStaticMarkup(h(ui.DatePicker, { mode: 'range', defaultValue: { from: new Date(2026, 10, 12), to: new Date(2026, 10, 18) }, name: 'away', locale: 'en-US' } as never))
    expect(html).toMatch(/name="away-from"[^>]*value="2026-11-12"|value="2026-11-12"[^>]*name="away-from"/)
    expect(html).toMatch(/name="away-to"[^>]*value="2026-11-18"|value="2026-11-18"[^>]*name="away-to"/)
  })
})

describe('date helpers', () => {
  it.each(editions)('%s converts between dates and ISO text without shifting the day', (_, ui) => {
    expect(ui.toIsoDate(new Date(2026, 10, 12, 23, 30))).toBe('2026-11-12')
    expect(ui.toIsoDate(new Date(2026, 10, 12, 0, 5))).toBe('2026-11-12')
    expect(ui.fromIsoDate('2026-11-12')!.getDate()).toBe(12)
    expect(ui.fromIsoDate('2026-11-12')!.getHours()).toBe(12)
    expect(ui.fromIsoDate('2026-02-30')).toBeUndefined()
    expect(ui.fromIsoDate('soon')).toBeUndefined()
  })

  it.each(editions)('%s formats a date and a range across two months', (_, ui) => {
    expect(ui.formatDate(undefined)).toBe('')
    expect(ui.formatDate(new Date(2026, 10, 12), { dateStyle: 'medium' }, 'en-US')).toBe('Nov 12, 2026')
    const range = ui.formatDate({ from: new Date(2026, 10, 12), to: new Date(2026, 11, 3) }, { dateStyle: 'medium' }, 'en-US')
    expect(range).toContain('Nov 12')
    expect(range).toContain('Dec 3')
  })
})
