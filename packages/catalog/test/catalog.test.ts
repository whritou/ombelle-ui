import { describe, it, expect } from 'vitest'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { getCatalog, getTemplate } from '../src/index.js'
import { supportedStyleFamilies } from '@ombelle/contracts'
import { Button } from '../src/templates/button.js'
import { Input } from '../src/templates/input.js'
describe('catalog contract', () => {
  it('resolves all three IDs and retains Dialog client boundary', () => {
    const c = getCatalog('0.1.0')
    for (const id of ['button', 'dialog', 'input'] as const)
      expect(getTemplate(c, id).id).toBe(id)
    expect(c.templates.dialog.content).toMatch(/^['"]use client['"]/)
  })
  it('rejects unknown releases', () => {
    try {
      getCatalog('99.0.0')
      expect.fail()
    } catch (e) {
      expect(e).toMatchObject({ code: 'UNSUPPORTED_RELEASE' })
    }
  })
  it('has complete tokens for every referenced style variable', () => {
    const c = getCatalog('0.1.0')
    for (const family of supportedStyleFamilies) {
      expect(Object.keys(c.presets[family].modes.light)).toHaveLength(19)
      for (const token of c.styles[family].matchAll(/var\(--([a-z-]+)\)/g))
        expect([
          ...Object.keys(c.presets[family].modes.light).map((k) =>
            k.replace(/[A-Z]/g, (m) => '-' + m.toLowerCase()),
          ),
          'radius',
          'border-width',
          'shadow-x',
          'shadow-y',
          'control-height',
          'font-family',
          'motion-duration',
        ]).toContain(token[1])
    }
  })
  it('defaults to a non-submitting button and forwards explicit submit', () => {
    expect(renderToStaticMarkup(createElement(Button, null, 'Save'))).toContain(
      'type="button"',
    )
    expect(
      renderToStaticMarkup(createElement(Button, { type: 'submit' }, 'Save')),
    ).toContain('type="submit"')
  })
  it('forwards input association and disabled state', () => {
    const html = renderToStaticMarkup(
      createElement(Input, {
        id: 'email',
        disabled: true,
        'aria-label': 'Email',
      }),
    )
    expect(html).toContain('id="email"')
    expect(html).toContain('disabled=""')
    expect(html).toContain('aria-label="Email"')
  })
})
