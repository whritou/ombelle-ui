import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { createElement as h } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import * as radix from '../src/templates/input-otp.js'
import * as base from '../src/templates/base/input-otp.js'

// DES-15: Input OTP had no invalid state: no attribute the styles could read, and no family
// styled one.
const otp = (ui: typeof radix, props: Record<string, unknown>) => renderToStaticMarkup(h(ui.InputOTP, { maxLength: 4, 'aria-label': 'Code', ...props } as never,
  h(ui.InputOTPGroup, null, ...[0, 1, 2, 3].map(index => h(ui.InputOTPSlot, { key: index, index })))))

describe('Input OTP invalid state', () => {
  it.each([['radix', radix], ['base', base as unknown as typeof radix]] as const)('%s marks the field and keeps aria-invalid for assistive technology', (edition, ui) => {
    const html = otp(ui, { 'aria-invalid': true })
    expect(html).toMatch(/data-slot="input-otp"[^>]*data-invalid=""|data-invalid=""[^>]*data-slot="input-otp"/)
    expect(html).toContain('aria-invalid="true"')
    if (edition === 'base') expect(html.match(/<input[^>]*aria-invalid="true"/g)).toHaveLength(4)
    expect(otp(ui, {})).not.toContain('data-invalid')
  })
  it.each(['flat', 'minimalist', 'neo-brutalism', 'ombelle', 'papier', 'organic', 'retro-futurism'])('%s styles an invalid field', (family) => {
    const css = readFileSync(new URL(`../src/styles/input-otp/${family}.css`, import.meta.url), 'utf8')
    expect(css).toMatch(/\[data-slot='input-otp'\]\[data-invalid\] \[data-slot='input-otp-slot'\] \{[^}]*var\(--destructive\)/)
  })
})
