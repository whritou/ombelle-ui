import { describe, expect, it } from 'vitest'
import { Children, cloneElement, createElement, type ElementType, type ReactElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'

describe.each(['radix', 'base'] as const)('Sheet %s edition', (edition) => {
  // The assertions exercise only common DOM props; primitive-specific prop
  // types differ between editions and remain on the public templates.
  const load = (): Promise<{ [K in keyof typeof import('../src/templates/sheet.js')]: ElementType }> => edition === 'base'
    ? import('../src/templates/base/sheet.js')
    : import('../src/templates/sheet.js')

  it('renders a named trigger without submitting a surrounding form', async () => {
    const { Sheet, SheetTrigger } = await load()
    const html = renderToStaticMarkup(createElement(Sheet, null,
      createElement(SheetTrigger, { id: 'open-sheet', className: 'custom' }, 'Edit settings')))
    expect(html).toContain('data-slot="sheet-trigger"')
    expect(html).toContain('type="button"')
    expect(html).toContain('aria-haspopup="dialog"')
    expect(html).toContain('aria-expanded="false"')
    expect(html).toContain('id="open-sheet"')
    expect(html).toContain('class="custom"')
  })

  it('keeps the title and description associated with their dialog', async () => {
    const { Sheet, SheetHeader, SheetFooter, SheetTitle, SheetDescription, SheetClose } = await load()
    const html = renderToStaticMarkup(createElement(Sheet, null,
      createElement(SheetHeader, { className: 'intro' },
        createElement(SheetTitle, { id: 'settings' }, 'Settings'),
        createElement(SheetDescription, null, 'Update your preferences.')),
      createElement(SheetFooter, null, createElement(SheetClose, null, 'Done'))))
    expect(html).toContain('data-slot="sheet-header"')
    expect(html).toContain('data-slot="sheet-title"')
    expect(html).toContain('id="settings"')
    expect(html).toContain('data-slot="sheet-description"')
    expect(html).toContain('data-slot="sheet-footer"')
    expect(html).toContain('data-slot="sheet-close"')
    expect(html).toContain('type="button"')
  })
})

describe('Sheet content rendering', () => {
  it('renders the default logical edge and accessible built-in dismissal', async () => {
    const { Sheet, SheetContent, SheetTitle, SheetDescription } = await import('../src/templates/sheet.js')
    const portal = SheetContent({ children: [
      createElement(SheetTitle, { key: 'title' }, 'Settings'),
      createElement(SheetDescription, { key: 'description' }, 'Change your preferences.'),
    ] })
    // Portals require a browser. Render the real generated panel directly in
    // its primitive context so its component-owned defaults remain testable.
    const panel = Children.toArray(portal.props.children)[1] as ReactElement<{ forceMount?: true }>
    const html = renderToStaticMarkup(createElement(Sheet, { defaultOpen: true }, cloneElement(panel, { forceMount: true })))
    expect(html).toContain('data-side="inline-end"')
    expect(html).toContain('data-size="default"')
    expect(html).toContain('data-slot="sheet-dismiss"')
    expect(html).toContain('aria-label="Close"')
    expect(html).toContain('role="dialog"')
  })

  it('keeps custom content composition and size while including dismissal', async () => {
    const { Sheet, SheetContent, SheetTitle, SheetDescription } = await import('../src/templates/sheet.js')
    const portal = SheetContent({ asChild: true, side: 'top', size: 'lg', children:
      createElement('section', { id: 'custom-panel' },
        createElement(SheetTitle, null, 'Settings'),
        createElement(SheetDescription, null, 'Change your preferences.')),
    })
    const panel = Children.toArray(portal.props.children)[1] as ReactElement<{ forceMount?: true }>
    const html = renderToStaticMarkup(createElement(Sheet, { defaultOpen: true }, cloneElement(panel, { forceMount: true })))
    expect(html).toContain('<section')
    expect(html).toContain('id="custom-panel"')
    expect(html).toContain('data-side="top"')
    expect(html).toContain('data-size="lg"')
    expect(html).toContain('aria-label="Close"')
  })
})
