import { describe, expect, it } from 'vitest'
import * as React from 'react'
import { createElement as h } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import * as radix from '../src/templates/input-otp.js'
import * as base from '../src/templates/base/input-otp.js'
import { getCatalog, getTemplate } from '../src/index.js'
import { expectComponentContract } from './new-component-contract.js'

type Part = React.FC<Record<string, unknown>>
type Ui = { InputOTP: Part; InputOTPGroup: Part; InputOTPSlot: Part; InputOTPSeparator: Part }
const code = (ui: Ui, label = 'Verification code') => h(ui.InputOTP, { maxLength: 6, 'aria-label': label },
  h(ui.InputOTPGroup, null, h(ui.InputOTPSlot, { index: 0 }), h(ui.InputOTPSlot, { index: 1 }), h(ui.InputOTPSlot, { index: 2 })),
  h(ui.InputOTPSeparator),
  h(ui.InputOTPGroup, null, h(ui.InputOTPSlot, { index: 3 }), h(ui.InputOTPSlot, { index: 4 }), h(ui.InputOTPSlot, { index: 5 })))
// Form-only inputs (type hidden, or Base UI's aria-hidden mirror) are not what a person fills in.
const inputs = (html: string) => [...html.matchAll(/<input[^>]*>/g)].map(match => match[0]).filter(tag => !/type="hidden"|aria-hidden="true"/.test(tag))
// HTML attribute names are case-insensitive, and React writes some in camelCase.
const attr = (tag: string, name: string) => new RegExp(String.raw`\s${name}="([^"]*)"`, 'i').exec(tag)?.[1]

describe('Input OTP', () => {
  it('provides its parts; input-otp in the Radix edition only', () => {
    expectComponentContract('input-otp', { client: true, parts: ['InputOTP', 'InputOTPGroup', 'InputOTPSlot', 'InputOTPSeparator'],
      slots: ['input-otp', 'input-otp-group', 'input-otp-slot', 'input-otp-separator'],
      dependencies: [{ name: 'react', version: '19.3.1' }, { name: 'input-otp', version: '1.5.0' }, { name: 'clsx', version: '2.1.1' }, { name: 'tailwind-merge', version: '3.7.0' }],
      selectors: ["[data-slot='input-otp']", "[data-slot='input-otp-slot']", "[data-slot='input-otp-slot'][data-caret]::after"], glass: 'experimental' })
    const baseDependencies = getTemplate(getCatalog('0.1.0'), 'input-otp', 'base').dependencies.map(d => d.name)
    expect(baseDependencies).toContain('@base-ui/react')
    expect(baseDependencies).not.toContain('input-otp')
  })

  it('radix exposes one named input for the whole code', () => {
    const [input, extra] = inputs(renderToStaticMarkup(code(radix as unknown as Ui)))
    expect(extra).toBeUndefined()
    expect(attr(input!, 'aria-label')).toBe('Verification code')
    expect(attr(input!, 'maxlength')).toBe('6')
    expect(attr(input!, 'autocomplete')).toBe('one-time-code')
    expect(attr(input!, 'inputmode')).toBe('numeric')
  })

  it('base names the first input after the field and the others by position', () => {
    const html = renderToStaticMarkup(code(base as unknown as Ui))
    const fields = inputs(html)
    expect(fields).toHaveLength(6)
    const labelId = attr(fields[0]!, 'aria-labelledby')!
    expect(html).toMatch(new RegExp(`<span[^>]*id="${labelId}"[^>]*>Verification code</span>`))
    expect(fields.slice(1).map(tag => attr(tag, 'aria-label'))).toEqual(['Digit 2 of 6', 'Digit 3 of 6', 'Digit 4 of 6', 'Digit 5 of 6', 'Digit 6 of 6'])
    expect(attr(fields[0]!, 'autocomplete')).toBe('one-time-code')
  })

  it.each([['radix', radix as unknown as Ui], ['base', base as unknown as Ui]] as const)('%s renders a decorative separator between the groups', (_, ui) => {
    const html = renderToStaticMarkup(code(ui))
    expect((html.match(/data-slot="input-otp-group"/g) ?? []).length).toBe(2)
    expect(html).toMatch(/data-slot="input-otp-separator"[^>]*aria-hidden="true"|aria-hidden="true"[^>]*data-slot="input-otp-separator"/)
  })
})
