// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest'
import { act, createElement as h } from 'react'
import { renderToString } from 'react-dom/server'
import { hydrateRoot } from 'react-dom/client'
import * as radix from '../src/templates/calendar.js'
import * as base from '../src/templates/base/calendar.js'

// CAT-05: without a locale prop, the DatePicker trigger was formatted with the server
// process's locale on the server and the browser's on the client, a hydration text mismatch
// whenever the two differ. The server text is now fixed, and the page's language applies
// after hydration.
;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true
afterEach(() => { document.documentElement.lang = ''; document.body.innerHTML = '' })

describe.each([['radix', radix], ['base', base as unknown as typeof radix]] as const)('%s DatePicker locale', (_, ui) => {
  it('renders the same text on the server whatever the page language, then the page language once hydrated', async () => {
    const element = h(ui.DatePicker, { defaultValue: '2026-03-04', 'aria-label': 'Date' })
    const html = renderToString(element)
    expect(html).toContain('Mar 4, 2026')
    document.documentElement.lang = 'fr-FR'
    const container = document.createElement('div')
    container.innerHTML = html
    document.body.append(container)
    const errors = vi.fn()
    await act(async () => { hydrateRoot(container, element, { onRecoverableError: errors }) })
    expect(errors).not.toHaveBeenCalled()
    expect(container.textContent).toContain('4 mars 2026')
  })
})
