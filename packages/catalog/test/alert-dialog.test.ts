import { describe, expect, it } from 'vitest'
import { createElement, type ElementType } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import * as RadixAlertDialog from '@radix-ui/react-alert-dialog'

describe.each(['radix', 'base'] as const)('Alert Dialog %s edition', (edition) => {
  const load = (): Promise<{ [K in keyof typeof import('../src/templates/alert-dialog.js')]: ElementType }> => edition === 'base'
    ? import('../src/templates/base/alert-dialog.js')
    : import('../src/templates/alert-dialog.js')

  it('exposes an alertdialog trigger with forwarded native naming', async () => {
    const { AlertDialog, AlertDialogTrigger } = await load()
    const html = renderToStaticMarkup(createElement(AlertDialog, null,
      createElement(AlertDialogTrigger, { id: 'discard', 'aria-label': 'Discard draft' }, 'Discard')))
    expect(html).toContain('data-slot="alert-dialog-trigger"')
    expect(html).toContain('aria-haspopup="dialog"')
    expect(html).toContain('aria-expanded="false"')
    expect(html).toContain('aria-label="Discard draft"')
    expect(html).toContain('id="discard"')
    expect(html).toContain('type="button"')
  })

  it('renders separate cancellation and confirmation controls as non-submit buttons', async () => {
    const { AlertDialog, AlertDialogHeader, AlertDialogFooter, AlertDialogTitle,
      AlertDialogDescription, AlertDialogCancel, AlertDialogAction } = await load()
    // Render the real Content directly to avoid the browser-only portal in SSR.
    const Content = edition === 'radix' ? RadixAlertDialog.Content : 'div'
    const html = renderToStaticMarkup(createElement(AlertDialog, { defaultOpen: true },
      createElement(Content, edition === 'radix' ? { forceMount: true } : null,
      createElement(AlertDialogHeader, null,
        createElement(AlertDialogTitle, null, 'Discard draft?'),
        createElement(AlertDialogDescription, null, 'This cannot be undone.')),
      createElement(AlertDialogFooter, null,
        createElement(AlertDialogCancel, { className: 'safe' }, 'Keep draft'),
        createElement(AlertDialogAction, { disabled: true }, 'Discard draft')))))
    for (const slot of ['header', 'title', 'description', 'footer', 'cancel', 'action'])
      expect(html).toContain(`data-slot="alert-dialog-${slot}"`)
    expect(html.match(/type="button"/g)).toHaveLength(2)
    expect(html).toContain('disabled=""')
    expect(html).toContain('class="safe"')
  })
})
