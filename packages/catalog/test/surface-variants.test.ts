import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { Card, CardContent, CardTitle } from '../src/templates/card.js'
import { Table, TableBody, TableCell, TableRow } from '../src/templates/table.js'
import { Badge, BadgeDot } from '../src/templates/badge.js'

describe('Surface composition variants', () => {
  it.each(['default', 'outlined', 'subtle'] as const)('exposes the %s Card appearance while preserving density and headings', (appearance) => {
    const html = renderToStaticMarkup(createElement(Card, { appearance, density: 'dense' },
      createElement(CardTitle, { level: 2 }, 'Project'),
      createElement(CardContent, null, 'Summary'),
    ))
    expect(html).toContain(`data-appearance="${appearance}"`)
    expect(html).toContain('data-density="dense"')
    expect(html).toContain('<h2 data-slot="card-title"')
    expect(html).not.toContain(' appearance=')
  })

  it('retains the default Card appearance when no appearance is provided', () => {
    expect(renderToStaticMarkup(createElement(Card))).toContain('data-appearance="default"')
  })

  it('puts compact density and striping on the native table without leaking native attributes', () => {
    const html = renderToStaticMarkup(createElement(Table, {
      density: 'compact', striped: true, 'aria-label': 'Projects',
    }, createElement(TableBody, null,
      createElement(TableRow, { selected: true }, createElement(TableCell, null, 'Website')),
    )))
    expect(html).toMatch(/<table [^>]*data-density="compact"[^>]*data-striped=""/)
    expect(html).toContain('aria-label="Projects"')
    expect(html).toContain('data-state="selected"')
    expect(html).not.toContain(' density=')
    expect(html).not.toContain(' striped=')
    expect(html).not.toMatch(/<div [^>]*data-density=/)
  })

  it('defaults Table to normal density with no striping', () => {
    const html = renderToStaticMarkup(createElement(Table, { striped: false }))
    expect(html).toContain('data-density="default"')
    expect(html).not.toContain('data-striped')
  })

  it.each(['default', 'sm'] as const)('exposes Badge %s size while preserving the existing variant', (size) => {
    const html = renderToStaticMarkup(createElement(Badge, { size, variant: 'accent' }, 'Synced'))
    expect(html).toContain(`data-size="${size}"`)
    expect(html).toContain('data-variant="accent"')
    expect(html).not.toContain(' size=')
    expect(html).toContain('>Synced</span>')
  })

  it('defaults Badge to its existing size', () => {
    expect(renderToStaticMarkup(createElement(Badge))).toContain('data-size="default"')
  })

  it('composes a decorative BadgeDot while keeping the status in visible text', () => {
    const html = renderToStaticMarkup(createElement(Badge, null,
      createElement(BadgeDot, { 'aria-hidden': false, className: 'custom-dot' }),
      'Synced',
    ))
    expect(html).toContain('data-slot="badge-dot"')
    expect(html).toContain('aria-hidden="true"')
    expect(html).toContain('class="custom-dot"')
    expect(html).toContain('Synced</span>')
    expect(html).not.toContain('role="status"')
  })
})
