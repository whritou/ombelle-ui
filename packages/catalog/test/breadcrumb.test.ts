import { createElement as h } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'

describe('Breadcrumb rendered behavior', () => {
  it('renders named native navigation with an ordered trail and noninteractive current page', async () => {
    const {
      Breadcrumb,
      BreadcrumbList,
      BreadcrumbItem,
      BreadcrumbLink,
      BreadcrumbPage,
    } = await import('../src/templates/breadcrumb.js')
    const html = renderToStaticMarkup(
      h(
        Breadcrumb,
        null,
        h(
          BreadcrumbList,
          null,
          h(BreadcrumbItem, null, h(BreadcrumbLink, { href: '/docs' }, 'Docs')),
          h(
            BreadcrumbItem,
            null,
            h(BreadcrumbPage, { 'aria-current': false }, 'Components'),
          ),
        ),
      ),
    )
    expect(html).toMatch(/^<nav[^>]*aria-label="Breadcrumb"/)
    expect(html).toContain('<ol ')
    expect(html).toContain('<li ')
    expect(html).toMatch(/<a[^>]*href="\/docs"[^>]*>Docs<\/a>/)
    expect(html).toMatch(
      /<span[^>]*aria-current="page"[^>]*>Components<\/span>/,
    )
    expect(html).not.toContain('role="link"')
  })

  it('keeps separators and ellipsis decorative even when supplied conflicting native aria props', async () => {
    const { BreadcrumbSeparator, BreadcrumbEllipsis } =
      await import('../src/templates/breadcrumb.js')
    for (const Part of [BreadcrumbSeparator, BreadcrumbEllipsis]) {
      const html = renderToStaticMarkup(
        h(Part, { 'aria-hidden': false, role: 'button' }),
      )
      expect(html).toContain('aria-hidden="true"')
      expect(html).toContain('role="presentation"')
      expect(html).not.toContain('tabindex')
    }
    expect(renderToStaticMarkup(h(BreadcrumbSeparator, null, '/'))).toContain(
      '/</li>',
    )
  })

  it('supports a localized navigation name and native link attributes', async () => {
    const { Breadcrumb, BreadcrumbLink } =
      await import('../src/templates/breadcrumb.js')
    expect(
      renderToStaticMarkup(
        h(Breadcrumb, { 'aria-label': 'Fil d’Ariane', dir: 'rtl' }),
      ),
    ).toContain('aria-label="Fil d’Ariane"')
    const html = renderToStaticMarkup(
      h(
        BreadcrumbLink,
        {
          href: '/guide',
          className: 'custom',
          target: '_blank',
          rel: 'noreferrer',
        },
        'Guide',
      ),
    )
    expect(html).toContain('class="custom"')
    expect(html).toContain('target="_blank"')
    expect(html).toContain('rel="noreferrer"')
  })
})
