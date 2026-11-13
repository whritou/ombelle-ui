import { describe, expect, it } from 'vitest'
import { createElement as h } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { getCatalog, getTemplate } from '../src/index.js'
import { PasswordField, PasswordFieldCapsLock, PasswordFieldControl, PasswordFieldInput, PasswordFieldStrength, PasswordFieldToggle, strengthWord, type PasswordCheck } from '../src/templates/password-field.js'
import { expectComponentContract } from './new-component-contract.js'

const slots = ['password-field', 'password-field-control', 'password-field-input', 'password-field-toggle', 'password-field-caps-lock', 'password-field-strength', 'password-field-strength-bar', 'password-field-strength-text']
const checks: PasswordCheck[] = [
  { label: 'at least 12 characters', test: value => value.length >= 12 },
  { label: 'a number', test: value => /\d/.test(value) },
  { label: 'add a symbol', test: value => /[^A-Za-z0-9]/.test(value) },
]
const tag = (html: string, pattern: string) => html.match(new RegExp(`<[^>]*${pattern}[^>]*>`))?.[0] ?? ''
const attr = (element: string, name: string) => element.match(new RegExp(` ${name}="([^"]*)"`))?.[1]

describe('Password Field', () => {
  it('provides the parts as one client template for both editions', () => {
    expectComponentContract('password-field', { client: true,
      parts: ['PasswordField', 'PasswordFieldControl', 'PasswordFieldInput', 'PasswordFieldToggle', 'PasswordFieldCapsLock', 'PasswordFieldStrength'], slots,
      dependencies: [{ name: 'react', version: '19.3.1' }, { name: 'clsx', version: '2.1.1' }, { name: 'tailwind-merge', version: '3.7.0' }, { name: 'lucide-react', version: '1.55.0' }],
      selectors: slots.map(slot => `[data-slot='${slot}']`), glass: 'experimental' })
    const catalog = getCatalog('0.1.0')
    expect(getTemplate(catalog, 'password-field', 'base').content).toBe(getTemplate(catalog, 'password-field', 'radix').content)
  })

  it.each([
    [0, 3, 'Weak'], [2, 4, 'Fair'], [2, 3, 'Strong'], [3, 3, 'Very strong'], [0, 0, 'Very strong'], [1, 4, 'Weak'],
  ] as const)('reads %i of %i checks as %s', (passed, total, word) => {
    expect(strengthWord(passed, total)).toBe(word)
  })

  it('renders a hidden password, a toggle that controls it and an empty Caps Lock status', () => {
    const html = renderToStaticMarkup(h(PasswordField, null,
      h(PasswordFieldControl, null, h(PasswordFieldInput, { 'aria-label': 'Password' }), h(PasswordFieldToggle)), h(PasswordFieldCapsLock)))
    const input = tag(html, 'data-slot="password-field-input"')
    expect(attr(input, 'type')).toBe('password')
    expect(input).toMatch(/ autocomplete="current-password"/i)
    const toggle = tag(html, 'data-slot="password-field-toggle"')
    expect(attr(toggle, 'type')).toBe('button')
    expect(attr(toggle, 'aria-pressed')).toBe('false')
    expect(attr(toggle, 'aria-label')).toBe('Show password')
    expect(attr(toggle, 'aria-controls')).toBe(attr(input, 'id'))
    expect(html).toMatch(/<[^>]*data-slot="password-field-caps-lock"[^>]*role="status"[^>]*><\/|<[^>]*role="status"[^>]*data-slot="password-field-caps-lock"[^>]*><\//)
  })

  it('reads the strength from the checks and names the first that fails', () => {
    const html = renderToStaticMarkup(h(PasswordField, null,
      h(PasswordFieldInput, { 'aria-label': 'Password', defaultValue: 'Abcdefghijkl1' }), h(PasswordFieldStrength, { checks })))
    const meter = tag(html, 'data-slot="password-field-strength"')
    expect(attr(meter, 'role')).toBe('meter')
    expect(attr(meter, 'aria-valuemin')).toBe('0')
    expect(attr(meter, 'aria-valuemax')).toBe('3')
    expect(attr(meter, 'aria-valuenow')).toBe('2')
    expect(attr(meter, 'aria-valuetext')).toBe('Strong · add a symbol to reach the last check')
    expect(attr(meter, 'aria-label')).toBe('Password strength')
    expect(attr(tag(html, 'data-slot="password-field-strength-bar"'), 'aria-hidden')).toBe('true')
    expect(html).toMatch(/data-slot="password-field-strength-text"[^>]*><strong>Strong<\/strong> · add a symbol to reach the last check</)
  })

  it('names nothing to fix once every check passes', () => {
    const html = renderToStaticMarkup(h(PasswordField, null,
      h(PasswordFieldInput, { 'aria-label': 'Password', defaultValue: 'Abcdefghijkl1!' }), h(PasswordFieldStrength, { checks })))
    expect(attr(tag(html, 'data-slot="password-field-strength"'), 'aria-valuetext')).toBe('Very strong')
  })
})
