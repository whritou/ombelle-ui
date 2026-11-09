import { readFileSync } from 'node:fs'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { Alert, AlertDescription, AlertTitle } from '../src/templates/alert.js'

const families = [
  'flat',
  'minimalist',
  'neo-brutalism',
  'ombelle',
  'liquid-glass',
] as const
const intents = ['success', 'warning', 'info'] as const
const fallbackPairs = {
  success: ['#DCFCE7', '#14532D'],
  warning: ['#FEF3C7', '#78350F'],
  info: ['#DBEAFE', '#1E3A8A'],
} as const
const childFallbacks = {
  flat: ['currentColor', 'currentColor', 'var(--foreground)'],
  minimalist: ['currentColor', 'currentColor', 'var(--muted-foreground)'],
  'neo-brutalism': ['currentColor', 'currentColor', 'currentColor'],
  ombelle: ['var(--accent-foreground)', 'currentColor', 'currentColor'],
  'liquid-glass': ['var(--primary)', 'currentColor', 'var(--muted-foreground)'],
} as const

function luminance(hex: string): number {
  const rgb = hex.match(/[a-f\d]{2}/gi)!.map((channel) => {
    const value = parseInt(channel, 16) / 255
    return value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4
  })
  return rgb[0]! * 0.2126 + rgb[1]! * 0.7152 + rgb[2]! * 0.0722
}

// Read the actual distributed styles, independently of catalog registration.
// Selecting the full selector keeps generic/default rules from satisfying an
// intent's contrast contract by accident.
function declarations(css: string, selector: string): string[] {
  return [
    ...css.replace(/\/\*[\s\S]*?\*\//g, '').matchAll(/([^{}]+)\{([^{}]*)\}/g),
  ]
    .filter(([, selectors]) =>
      selectors!.split(',').some((part) => part.trim() === selector),
    )
    .flatMap(([, , body]) =>
      body!
        .split(';')
        .map((line) => line.trim())
        .filter(Boolean),
    )
}

describe('Alert intents', () => {
  it.each([
    ['default', 'status'],
    ['destructive', 'alert'],
    ['success', 'status'],
    ['warning', 'status'],
    ['info', 'status'],
  ] as const)(
    'renders %s with its default %s announcement role',
    (variant, role) => {
      const html = renderToStaticMarkup(
        createElement(
          Alert,
          { variant, className: 'custom' },
          createElement(AlertTitle, null, 'Saved changes'),
          createElement(
            AlertDescription,
            null,
            'Your settings are up to date.',
          ),
        ),
      )
      expect(html).toContain(`role="${role}"`)
      expect(html).toContain(`data-variant="${variant}"`)
      expect(html).toContain('class="custom"')
      expect(html).toContain('Saved changes')
      expect(html).toContain('Your settings are up to date.')
    },
  )

  it.each(intents)('lets callers choose a role for %s', (variant) => {
    const html = renderToStaticMarkup(
      createElement(Alert, {
        variant,
        role: 'note',
        'aria-label': 'Account notice',
      }),
    )
    expect(html).toContain('role="note"')
    expect(html).toContain('aria-label="Account notice"')
  })

  describe.each(families)(
    '%s semantic contrast and fallback contract',
    (family) => {
      const css = readFileSync(
        new URL(`../src/styles/alert/${family}.css`, import.meta.url),
        'utf8',
      )

      it.each(intents)(
        'pairs the %s fill with its foreground and forwards that color to content',
        (intent) => {
          const selector = `[data-slot='alert'][data-variant='${intent}']`
          const root = declarations(
            css.split('@media (forced-colors: active)')[0]!,
            selector,
          )
          const [fallback, fallbackForeground] = fallbackPairs[intent]
          const normalized = root.map((line) => line.toLowerCase())
          expect(normalized).toContain(
            `background: var(--${intent}, ${fallback})`.toLowerCase(),
          )
          expect(normalized).toContain(
            `color: var(--${intent}-foreground, ${fallbackForeground})`.toLowerCase(),
          )
          expect(normalized).toContain(
            `--alert-intent-text: var(--${intent}-foreground, ${fallbackForeground})`.toLowerCase(),
          )
          const children = [
            "[data-slot='alert'] > svg",
            "[data-slot='alert-title']",
            "[data-slot='alert-description']",
          ]
          for (const [index, child] of children.entries())
            expect(
              declarations(
                css.split('@media (forced-colors: active)')[0]!,
                child,
              ),
            ).toContain(
              `color: var(--alert-intent-text, ${childFallbacks[family][index]})`,
            )
        },
      )

      it('resets inherited intent text on nested Alert roots and keeps slot selectors isolated', () => {
        expect(declarations(css, "[data-slot='alert']")).toContain(
          '--alert-intent-text: initial',
        )
        for (const [, selectors] of css
          .replace(/\/\*[\s\S]*?\*\//g, '')
          .matchAll(/([^{}]+)\{([^{}]*)\}/g))
          for (const selector of selectors!.split(','))
            expect(
              (selector.match(/\[data-slot=/g) ?? []).length,
              selector,
            ).toBeLessThanOrEqual(1)
      })

      it.each(intents)(
        'keeps the actual %s fallback text above 4.5:1 contrast',
        (intent) => {
          const root = declarations(
            css.split('@media (forced-colors: active)')[0]!,
            `[data-slot='alert'][data-variant='${intent}']`,
          )
          const background = root
            .find((line) => line.startsWith('background:'))
            ?.match(/#[a-f\d]{6}/i)?.[0]
          const foreground = root
            .find((line) => line.startsWith('color:'))
            ?.match(/#[a-f\d]{6}/i)?.[0]
          expect(background).toBeTruthy()
          expect(foreground).toBeTruthy()
          const values = [luminance(background!), luminance(foreground!)]
          expect(
            (Math.max(...values) + 0.05) / (Math.min(...values) + 0.05),
          ).toBeGreaterThanOrEqual(4.5)
        },
      )

      it.each(intents)(
        'restores system colors for %s in forced colors',
        (intent) => {
          const forced = css.split('@media (forced-colors: active)')[1]!
          const root = declarations(
            forced,
            `[data-slot='alert'][data-variant='${intent}']`,
          )
          expect(root).toContain('background: Canvas')
          expect(root).toContain('color: CanvasText')
          expect(root).toContain('border-color: CanvasText')
          expect(root).toContain('--alert-intent-text: CanvasText')
        },
      )
    },
  )
})
