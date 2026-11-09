import { describe, expect, it } from 'vitest'
import { createElement as h } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import * as radix from '../src/templates/field.js'
import * as base from '../src/templates/base/field.js'
import { getCatalog, getTemplate } from '../src/index.js'
import { expectComponentContract } from './new-component-contract.js'

const { Field, FieldLabel, FieldControl, FieldDescription, FieldError } = radix
const attr = (html: string, name: string, slot = 'input') =>
  new RegExp(String.raw`<${slot}[^>]*\s${name}="([^"]*)"`).exec(html)?.[1]
const idOf = (html: string, slot: string) => new RegExp(`id="([^"]+)"[^>]*data-slot="${slot}"|data-slot="${slot}"[^>]*id="([^"]+)"`).exec(html)?.slice(1).find(Boolean)
const field = (props: Record<string, unknown> = {}, control = h('input', { type: 'text' }), description = true) =>
  renderToStaticMarkup(h(Field, props, h(FieldLabel, null, 'Project name'), h(FieldControl, null, control),
    ...(description ? [h(FieldDescription, null, 'Shown in the CLI.')] : []), h(FieldError, null, 'Use lower case letters.')))

describe('Field', () => {
  it('provides the Field parts as a client component', () => {
    expectComponentContract('field', { client: true, parts: ['Field', 'FieldLabel', 'FieldControl', 'FieldDescription', 'FieldError'],
      slots: ['field', 'field-label', 'field-description', 'field-error'],
      dependencies: [{ name: 'react', version: '19.3.1' }, { name: 'clsx', version: '2.1.1' }, { name: 'tailwind-merge', version: '3.7.0' },
        { name: 'lucide-react', version: '1.55.0' }],
      selectors: ["[data-slot='field']", "[data-slot='field-label']", "[data-slot='field-description']", "[data-slot='field-error']"],
      glass: 'experimental' })
    expect(getTemplate(getCatalog('0.1.0'), 'field', 'base').dependencies.map(d => d.name)).toContain('@base-ui/react')
  })

  it('binds the label and describes the control with the hint', () => {
    const html = field({ required: true })
    const id = attr(html, 'id')
    expect(id).toBeTruthy()
    expect(html).toMatch(new RegExp(`<label[^>]*for="${id}"`))
    expect(attr(html, 'aria-describedby')).toBe(idOf(html, 'field-description'))
    expect(html).toMatch(/<input[^>]*required=""/)
    expect(html).not.toContain('aria-invalid')
    expect(html).not.toContain('data-slot="field-error"')
    expect(html).toMatch(/<span[^>]*aria-hidden="true"[^>]*>\*<\/span>/)
  })

  it('adds the error to the description and marks the control invalid', () => {
    const html = field({ invalid: true })
    expect(attr(html, 'aria-describedby')).toBe(`${idOf(html, 'field-description')} ${idOf(html, 'field-error')}`)
    expect(attr(html, 'aria-invalid')).toBe('true')
  })

  it('references no description that is not rendered', () => {
    expect(attr(field({}, h('input', { type: 'text' }), false), 'aria-describedby')).toBeUndefined()
  })

  it('keeps the control’s own description ids first', () => {
    const html = field({}, h('input', { type: 'text', 'aria-describedby': 'own' }))
    expect(attr(html, 'aria-describedby')).toBe(`own ${idOf(html, 'field-description')}`)
  })

  it('renders the Base UI edition with the same parts', () => {
    const html = renderToStaticMarkup(h(base.Field, { invalid: true }, h(base.FieldLabel, null, 'Project name'),
      h(base.FieldControl, null, h('input', { type: 'text' })), h(base.FieldDescription, null, 'Shown in the CLI.'),
      h(base.FieldError, null, 'Use lower case letters.')))
    for (const slot of ['field', 'field-label', 'field-description', 'field-error']) expect(html).toContain(`data-slot="${slot}"`)
    expect(html).toContain('<input')
  })
})
