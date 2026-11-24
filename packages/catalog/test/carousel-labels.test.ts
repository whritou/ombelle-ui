// @vitest-environment jsdom
import { afterEach, expect, it } from 'vitest'
import { act, createElement as h, createRef } from 'react'
import { createRoot } from 'react-dom/client'
import { renderToStaticMarkup } from 'react-dom/server'
import { Carousel, CarouselContent, CarouselCounter, CarouselDots, CarouselItem } from '../src/templates/carousel.js'

// CAT-10, CAT-13 and A11Y-20 for Carousel.
;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true
afterEach(() => { document.body.innerHTML = '' })

const tag = (html: string, pattern: string) => html.match(new RegExp(`<[^>]*${pattern}[^>]*>`))?.[0] ?? ''
const slides = (props: Record<string, unknown> = {}, content: Record<string, unknown> = {}) => h(Carousel, { 'aria-label': 'Kits', ...props },
  h(CarouselContent, content, h(CarouselItem, null, 'A'), h(CarouselItem, null, 'B')), h(CarouselDots), h(CarouselCounter))

it('names the scrolling viewport, a Tab stop, as a group', () => {
  const content = tag(renderToStaticMarkup(slides()), 'data-slot="carousel-content"')
  expect(content).toContain('role="group"')
  expect(content).toContain('aria-label="Slides"')
  expect(tag(renderToStaticMarkup(slides({}, { 'aria-label': 'Kits list' })), 'data-slot="carousel-content"')).toContain('aria-label="Kits list"')
})

it('takes the slide, dot and viewport names from labels, and the counter text from format', () => {
  const html = renderToStaticMarkup(h(Carousel, { labels: { slides: 'Diapositives', slide: (p: number, n: number) => `${p} sur ${n}`, goTo: (p: number) => `Diapositive ${p}` } },
    h(CarouselContent, null, h(CarouselItem, null, 'A'), h(CarouselItem, null, 'B')), h(CarouselDots), h(CarouselCounter, { format: (p: number, n: number) => `${p} de ${n}` })))
  expect(tag(html, 'data-slot="carousel-content"')).toContain('aria-label="Diapositives"')
  expect(html).toContain('aria-label="2 sur 2"')
  expect(html).toContain('aria-label="Diapositive 1"')
  expect(html).toContain('>1 de 2</span>')
  const plain = renderToStaticMarkup(slides())
  expect(plain).toContain('aria-label="1 of 2"')
  expect(plain).toContain('aria-label="Slide 2"')
  expect(plain).toContain('>1 / 2</span>')
})

it("sets a caller's ref on the viewport and keeps its own, so the buttons still scroll it", async () => {
  const ref = createRef<HTMLDivElement>()
  const container = document.createElement('div')
  document.body.append(container)
  await act(async () => { createRoot(container).render(h(Carousel, null, h(CarouselContent, { ref }, h(CarouselItem, null, 'A'), h(CarouselItem, null, 'B')), h(CarouselDots))) })
  const content = container.querySelector<HTMLDivElement>('[data-slot="carousel-content"]')!
  expect(ref.current).toBe(content)
  let scrolled = false
  content.scrollTo = (() => { scrolled = true }) as typeof content.scrollTo
  window.matchMedia ??= (() => ({ matches: false })) as unknown as typeof window.matchMedia
  await act(async () => { container.querySelectorAll<HTMLButtonElement>('[data-slot="carousel-dot"]')[1]!.click() })
  expect(scrolled).toBe(true)
})
