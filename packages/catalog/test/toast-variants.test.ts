import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { createElement as h } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import * as radix from '../src/templates/toast.js'
import * as base from '../src/templates/base/toast.js'

type Ui = typeof radix
const editions = [['radix', radix], ['base', base as unknown as Ui]] as const
const families = ['flat', 'minimalist', 'neo-brutalism', 'ombelle', 'liquid-glass']
const block = (family: string) => {
  const css = readFileSync(new URL(`../src/styles/toast/${family}.css`, import.meta.url), 'utf8').replace(/\r\n/g, '\n')
  return css.slice(css.indexOf('/* 0.7.3 variants */'))
}

describe('toastDuration', () => {
  it.each(editions)('%s gives 6000 ms to short text, 60 ms per character beyond 80, and at most 10000', (_, ui) => {
    expect(ui.toastDuration({ title: 'Saved' })).toBe(6000)
    expect(ui.toastDuration({ title: 'x'.repeat(50), description: 'y'.repeat(80) })).toBe(9000)
    expect(ui.toastDuration({ title: 'x'.repeat(400) })).toBe(10000)
  })

  it.each(editions)('%s keeps a toast with an action open, and lets an explicit duration win', (_, ui) => {
    expect(ui.toastDuration({ title: 'Deleted', action: true })).toBe(Infinity)
    expect(ui.toastDuration({ title: 'Saved' }, 3000)).toBe(3000)
    expect(ui.toastDuration({ title: 'Deleted', action: true }, 4000)).toBe(4000)
  })
})

describe('Toast 0.7.3 variants', () => {
  it.each(editions)('%s provides ToastPromise', (_, ui) => {
    expect(typeof ui.ToastPromise).toBe('function')
  })

  it('radix: a stacked viewport carries data-stack, and a plain one does not', () => {
    const stacked = renderToStaticMarkup(h(radix.ToastProvider, {}, h(radix.ToastViewport, { stack: true })))
    expect(stacked).toContain('data-stack=""')
    expect(renderToStaticMarkup(h(radix.ToastProvider, {}, h(radix.ToastViewport)))).not.toContain('data-stack')
  })

  it.each(families)('%s stacks toasts, expands them on hover and focus, and spins the promise indicator', family => {
    const css = block(family)
    expect(css).toMatch(/\[data-slot='toast-viewport'\]\[data-stack\]/)
    expect(css).toMatch(/:hover|:focus-within/)
    expect(css).toContain("[data-slot='toast-spinner']")
    expect(css).toMatch(/@media \(prefers-reduced-motion: no-preference\)/)
  })
})
