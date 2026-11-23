import { renderToStaticMarkup } from 'react-dom/server'
import { beforeEach, expect, it, vi } from 'vitest'
import { DocPage } from './doc-page'

const navigation = vi.hoisted(() => ({ pathname: '/' }))
vi.mock('next/navigation', () => ({ usePathname: () => navigation.pathname }))

const { SiteHeader } = await import('./header')

const skipLinks = (html: string) => html.match(/<a href="#main"[^>]*>/g) ?? []

beforeEach(() => {
  navigation.pathname = '/'
})

it('keeps one skip link, inside the header, outside the editors', () => {
  navigation.pathname = '/components'
  const html = renderToStaticMarkup(<SiteHeader />)
  expect(html.indexOf(skipLinks(html)[0]!)).toBeGreaterThan(html.indexOf('<header'))
  expect(skipLinks(html)).toHaveLength(1)
})

it('adds a skip link outside the header in the editors, shown only where the header is hidden', () => {
  navigation.pathname = '/editor/preset'
  const html = renderToStaticMarkup(<SiteHeader />)
  const [outside, inside] = skipLinks(html)
  expect(html.indexOf(outside!)).toBeLessThan(html.indexOf('<header'))
  expect(outside).toContain('min-[1200px]:hidden')
  expect(html).toMatch(/<header[^>]*max-\[1199px\]:hidden/)
  expect(inside).not.toContain('min-[1200px]:hidden')
})

it('makes the page main landmark the focusable skip-link target', () => {
  const html = renderToStaticMarkup(<DocPage eyebrow="E" title="T">body</DocPage>)
  expect(html).toMatch(/^<main id="main" tabindex="-1"/)
})
