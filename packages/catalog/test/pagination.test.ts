import { createElement as h } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'

describe('Pagination rendered behavior', () => {
  it('renders a named native navigation list and marks only the active page', async () => {
    const { Pagination, PaginationContent, PaginationItem, PaginationLink } =
      await import('../src/templates/pagination.js')
    const html = renderToStaticMarkup(
      h(
        Pagination,
        null,
        h(
          PaginationContent,
          null,
          h(
            PaginationItem,
            null,
            h(PaginationLink, { href: '?page=1', isActive: true }, '1'),
          ),
          h(PaginationItem, null, h(PaginationLink, { href: '?page=2' }, '2')),
        ),
      ),
    )
    expect(html).toMatch(/^<nav[^>]*aria-label="Pagination"/)
    expect(html).toContain('<ul ')
    expect(html).toContain('<li ')
    expect(html).toMatch(
      /<a[^>]*href="\?page=1"[^>]*aria-current="page"[^>]*>1<\/a>/,
    )
    expect(html.match(/aria-current="page"/g)).toHaveLength(1)
    expect(html).not.toContain('isActive')
  })

  it('strips navigation and tab focus from disabled links even when callers supply both', async () => {
    const { PaginationLink, PaginationPrevious, PaginationNext } =
      await import('../src/templates/pagination.js')
    for (const Part of [PaginationLink, PaginationPrevious, PaginationNext]) {
      const html = renderToStaticMarkup(
        h(
          Part,
          {
            disabled: true,
            href: '/forbidden',
            tabIndex: 0,
            'aria-disabled': false,
          },
          'Page',
        ),
      )
      expect(html).not.toContain('href=')
      expect(html).toContain('tabindex="-1"')
      expect(html).toContain('aria-disabled="true"')
      expect(html).toContain('data-disabled=""')
      expect(html).not.toMatch(/\sdisabled=/)
    }
  })

  it('provides named previous and next links with caller-owned destinations and labels', async () => {
    const { Pagination, PaginationLink, PaginationPrevious, PaginationNext } =
      await import('../src/templates/pagination.js')
    expect(
      renderToStaticMarkup(h(Pagination, { 'aria-label': 'Search pages' })),
    ).toContain('aria-label="Search pages"')
    expect(
      renderToStaticMarkup(h(PaginationPrevious, { href: '?page=1' })),
    ).toContain('aria-label="Go to previous page"')
    expect(
      renderToStaticMarkup(
        h(
          PaginationNext,
          {
            href: '?page=3',
            'aria-label': 'Page suivante',
            className: 'custom',
          },
          'Suivante',
        ),
      ),
    ).toContain('aria-label="Page suivante"')
    const enabled = renderToStaticMarkup(
      h(PaginationLink, { href: '?page=2', tabIndex: 2 }, '2'),
    )
    expect(enabled).toContain('href="?page=2"')
    expect(enabled).toContain('tabindex="2"')
    expect(enabled).not.toContain('aria-disabled')
  })

  it('keeps the pagination ellipsis decorative', async () => {
    const { PaginationEllipsis } =
      await import('../src/templates/pagination.js')
    const html = renderToStaticMarkup(
      h(PaginationEllipsis, { 'aria-hidden': false, role: 'button' }),
    )
    expect(html).toContain('aria-hidden="true"')
    expect(html).toContain('role="presentation"')
    expect(html).not.toContain('tabindex')
  })
})
