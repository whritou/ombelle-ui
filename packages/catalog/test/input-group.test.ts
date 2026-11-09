import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupInput,
  InputGroupText,
  InputGroupTextarea,
} from '../src/templates/input-group.js'

describe('Input Group native composition', () => {
  it('keeps the field native and associates its accessible name and help text', () => {
    const html = renderToStaticMarkup(
      createElement(InputGroup, { className: 'custom-group' },
        createElement('label', { htmlFor: 'website' }, 'Website'),
        createElement(InputGroupAddon, null,
          createElement(InputGroupText, { id: 'protocol' }, 'https://')),
        createElement(InputGroupInput, {
          id: 'website', name: 'website', type: 'url', required: true,
          defaultValue: 'example.com', 'aria-describedby': 'protocol',
          'aria-invalid': true, className: 'custom-field',
        }),
      ),
    )
    expect(html).toContain('<label for="website">Website</label>')
    expect(html).toContain('<input ')
    for (const attribute of [
      'id="website"', 'name="website"', 'type="url"', 'required=""',
      'value="example.com"', 'aria-describedby="protocol"', 'aria-invalid="true"',
      'data-slot="input-group"', 'class="custom-group"',
      'data-slot="input-group-input"', 'class="custom-field"',
      'data-slot="input-group-text"',
    ]) expect(html).toContain(attribute)
  })

  it('defaults inputs to text and buttons to a non-submitting button', () => {
    const html = renderToStaticMarkup(createElement('form', null,
      createElement(InputGroup, null,
        createElement(InputGroupInput, { 'aria-label': 'Search' }),
        createElement(InputGroupButton, null, 'Clear'),
      ),
    ))
    expect(html).toMatch(/<input [^>]*type="text"/)
    expect(html).toMatch(/<button [^>]*type="button"[^>]*>Clear<\/button>/)
    expect(html).toContain('data-slot="input-group-button"')
  })

  it('allows explicit submit buttons and native disabled state', () => {
    const html = renderToStaticMarkup(createElement(InputGroupButton, {
      type: 'submit', disabled: true, name: 'intent', value: 'send',
    }, 'Send'))
    for (const attribute of ['type="submit"', 'disabled=""', 'name="intent"', 'value="send"']) {
      expect(html).toContain(attribute)
    }
  })

  it('preserves textarea naming, validation and uncontrolled content', () => {
    const html = renderToStaticMarkup(createElement(InputGroupTextarea, {
      name: 'message', 'aria-label': 'Message', rows: 4, required: true,
      disabled: true, defaultValue: 'Hello', maxLength: 240,
    }))
    expect(html).toMatch(/^<textarea /)
    expect(html).toContain('data-slot="input-group-textarea"')
    for (const attribute of ['name="message"', 'aria-label="Message"', 'rows="4"', 'required=""', 'disabled=""', 'maxLength="240"']) {
      expect(html).toContain(attribute)
    }
    expect(html).toContain('>Hello</textarea>')
  })

  it('defaults addons to the logical inline start', () => {
    expect(renderToStaticMarkup(createElement(InputGroupAddon, null, '@')))
      .toContain('data-align="inline-start"')
  })

  it.each(['inline-start', 'inline-end', 'block-start', 'block-end'] as const)(
    'exposes %s addon alignment without leaking a native align attribute', (align) => {
      const html = renderToStaticMarkup(createElement(InputGroupAddon, { align }, 'Addon'))
      expect(html).toContain(`data-align="${align}"`)
      expect(html).not.toContain(' align=')
    },
  )

  it('keeps component slots stable when callers pass data attributes', () => {
    const html = renderToStaticMarkup(createElement(InputGroupInput, {
      id: 'tracked-input',
      ...{ 'data-slot': 'other', 'data-tracking': 'search' },
    }))
    expect(html).toContain('data-slot="input-group-input"')
    expect(html).toContain('data-tracking="search"')
    expect(html).not.toContain('data-slot="other"')
  })
})
