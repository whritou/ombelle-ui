import { describe, expect, it } from 'vitest'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { readFileSync } from 'node:fs'

describe('Toast rendered contracts', () => {
  it('renders the Radix notification viewport with native keyboard access', async () => {
    const { ToastProvider, ToastViewport } = await import('../src/templates/toast.js')
    const html = renderToStaticMarkup(createElement(ToastProvider, null,
      createElement(ToastViewport, { className: 'custom' })))
    expect(html).toContain('data-slot="toast-viewport"')
    expect(html).toContain('class="custom"')
    expect(html).toContain('tabindex="-1"')
    expect(html).toContain('Notifications')
  })

  it('renders Base manager-owned notification content, variant, action and close naming', async () => {
    const { ToastProvider, ToastViewport, Toast, ToastTitle, ToastDescription,
      ToastAction, ToastClose } = await import('../src/templates/base/toast.js')
    const html = renderToStaticMarkup(createElement(ToastProvider, null,
      createElement(ToastViewport, null,
        createElement(Toast, { toast: { id: 'saved', title: 'Saved', description: 'Your draft is saved.', type: 'success' } },
          createElement(ToastTitle), createElement(ToastDescription),
          createElement(ToastAction, { altText: 'Undo saving the draft' }, 'Undo'),
          createElement(ToastClose)))))
    expect(html).toContain('data-slot="toast"')
    expect(html).toContain('data-variant="success"')
    expect(html).toContain('data-slot="toast-title"')
    expect(html).toContain('Your draft is saved.')
    expect(html).toContain('aria-label="Undo saving the draft"')
    expect(html).toContain('aria-label="Dismiss notification"')
    expect(html.match(/type="button"/g)).toHaveLength(2)
    expect(html).not.toContain('altText=')
  })
})

// Evaluate the notification's matching declarations with backdrop support
// enabled and optional semantic palette fields absent. This catches a generic
// glass fill overriding intent colors as well as missing legacy-preset fallbacks.
function intentPaint(css: string, variant: string, palette: Record<string, string> = {}) {
  const declarations = new Map<string, string>(Object.entries(palette))
  const normal = css.split('@media (prefers-reduced-transparency: reduce)')[0]!
    .split('@media (forced-colors: active)')[0]!
  for (const [, selectors, body] of normal.matchAll(/([^{}]+)\{([^{}]*)\}/g)) {
    const matches = selectors!.split(',').some((selector) => {
      if (!selector.includes("[data-slot='toast']")) return false
      if (/:hover|:focus-visible|:disabled|\]\s+\*/.test(selector)) return false
      return [...selector.matchAll(/\[([\w-]+)(?:=['"]([^'"]+)['"])?\]/g)]
        .every(([, key, value]) => key === 'data-slot' ? value === 'toast'
          : key === 'data-variant' ? value === variant
          : key === 'data-state' ? value === 'open' : false)
    })
    if (matches) for (const declaration of body!.split(';')) {
      const colon = declaration.indexOf(':')
      if (colon > -1) declarations.set(declaration.slice(0, colon).trim(), declaration.slice(colon + 1).trim())
    }
  }
  const resolve = (value: string | undefined): string | undefined => {
    const variable = value?.match(/^var\((--[\w-]+)(?:,\s*(.+))?\)$/s)
    return variable ? resolve(declarations.get(variable[1]!) ?? variable[2]) : value
  }
  return { background: resolve(declarations.get('background')), foreground: resolve(declarations.get('color')),
    backdrop: declarations.get('backdrop-filter') }
}

function luminance(hex: string) {
  const channels = hex.match(/[a-f\d]{2}/gi)!.map(value => {
    const channel = Number.parseInt(value, 16) / 255
    return channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4
  })
  return channels[0]! * 0.2126 + channels[1]! * 0.7152 + channels[2]! * 0.0722
}

describe.each(['flat', 'minimalist', 'neo-brutalism', 'ombelle', 'liquid-glass'])('%s Toast intent paint', family => {
  const css = readFileSync(new URL(`../src/styles/toast/${family}.css`, import.meta.url), 'utf8')
  it.each([
    ['success', '#dcfce7', '#14532d'],
    ['warning', '#fef3c7', '#78350f'],
    ['info', '#dbeafe', '#1e3a8a'],
  ])('keeps the actual %s fallback opaque and above 4.5:1 contrast', (variant, background, foreground) => {
    const paint = intentPaint(css, variant!)
    expect(paint.background?.toLowerCase()).toBe(background)
    expect(paint.foreground?.toLowerCase()).toBe(foreground)
    const values = [luminance(paint.background!), luminance(paint.foreground!)]
    expect((Math.max(...values) + 0.05) / (Math.min(...values) + 0.05)).toBeGreaterThanOrEqual(4.5)
    expect(paint.backdrop ?? 'none').toBe('none')
  })
  if (family === 'liquid-glass') it('keeps destructive paint opaque with native semantic colors', () => {
    const paint = intentPaint(css, 'destructive', { '--destructive': '#b91c1c', '--destructive-foreground': '#ffffff' })
    expect(paint.background).toBe('#b91c1c')
    expect(paint.foreground).toBe('#ffffff')
    expect(paint.backdrop ?? 'none').toBe('none')
  })
})
