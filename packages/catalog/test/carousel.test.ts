import { describe, expect, it } from 'vitest'
import { createElement as h } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { getCatalog, getTemplate } from '../src/index.js'
import { Carousel, CarouselContent, CarouselCounter, CarouselDots, CarouselItem, CarouselNext, CarouselPrevious } from '../src/templates/carousel.js'
import { expectComponentContract } from './new-component-contract.js'

const slots = ['carousel', 'carousel-content', 'carousel-item', 'carousel-previous', 'carousel-next', 'carousel-dots', 'carousel-dot', 'carousel-counter']
const tag = (html: string, pattern: string) => html.match(new RegExp(`<[^>]*${pattern}[^>]*>`))?.[0] ?? ''
const tags = (html: string, pattern: string) => [...html.matchAll(new RegExp(`<[^>]*${pattern}[^>]*>`, 'g'))].map(match => match[0])
const attr = (element: string, name: string) => element.match(new RegExp(` ${name}="([^"]*)"`))?.[1]
const kits = ['Ombelle', 'Flat', 'Minimalist', 'Neo brutalism', 'Liquid glass']
const carousel = (names: readonly string[]) => h(Carousel, { 'aria-label': 'UI kits' },
  h(CarouselContent, null, ...names.map(name => h(CarouselItem, { key: name }, name))),
  h(CarouselPrevious), h(CarouselNext), h(CarouselDots), h(CarouselCounter))

describe('Carousel', () => {
  it('provides one client template for both editions', () => {
    expectComponentContract('carousel', { client: true,
      parts: ['Carousel', 'CarouselContent', 'CarouselItem', 'CarouselPrevious', 'CarouselNext', 'CarouselDots', 'CarouselCounter'], slots,
      dependencies: [{ name: 'react', version: '19.3.1' }, { name: 'clsx', version: '2.1.1' }, { name: 'tailwind-merge', version: '3.7.0' }, { name: 'lucide-react', version: '1.55.0' }],
      selectors: [...slots.map(slot => `[data-slot='${slot}']`), '@media (width < 640px)'], glass: 'experimental' })
    const catalog = getCatalog('0.1.0')
    expect(getTemplate(catalog, 'carousel', 'base').content).toBe(getTemplate(catalog, 'carousel', 'radix').content)
  })

  it('names the region and its slides, and starts on the first slide', () => {
    const html = renderToStaticMarkup(carousel(kits))
    const root = tag(html, 'data-slot="carousel"')
    expect(attr(root, 'role')).toBe('region')
    expect(attr(root, 'aria-roledescription')).toBe('carousel')
    expect(attr(root, 'aria-label')).toBe('UI kits')
    const slides = tags(html, 'data-slot="carousel-item"')
    expect(slides.map(slide => attr(slide, 'aria-label'))).toEqual(['1 of 5', '2 of 5', '3 of 5', '4 of 5', '5 of 5'])
    for (const slide of slides) {
      expect(attr(slide, 'role')).toBe('group')
      expect(attr(slide, 'aria-roledescription')).toBe('slide')
    }
    const content = tag(html, 'data-slot="carousel-content"')
    expect(attr(content, 'tabindex')).toBe('0')
    const previous = tag(html, 'data-slot="carousel-previous"')
    expect(attr(previous, 'aria-label')).toBe('Previous slide')
    expect(previous).toContain('disabled')
    expect(attr(previous, 'aria-controls')).toBe(attr(content, 'id'))
    expect(tag(html, 'data-slot="carousel-next"')).not.toContain('disabled')
    const dots = tags(html, 'data-slot="carousel-dot"')
    expect(dots.map(dot => attr(dot, 'aria-label'))).toEqual(['Slide 1', 'Slide 2', 'Slide 3', 'Slide 4', 'Slide 5'])
    expect(dots.map(dot => attr(dot, 'aria-current'))).toEqual(['true', undefined, undefined, undefined, undefined])
    expect(attr(tag(html, 'data-slot="carousel-dots"'), 'aria-label')).toBe('Choose slide')
    expect(html).toMatch(/data-slot="carousel-counter"[^>]*>1 \/ 5</)
    expect(attr(tag(html, 'data-slot="carousel-counter"'), 'aria-hidden')).toBe('true')
  })

  it('disables both buttons with one slide', () => {
    const html = renderToStaticMarkup(carousel(['Ombelle']))
    expect(tag(html, 'data-slot="carousel-previous"')).toContain('disabled')
    expect(tag(html, 'data-slot="carousel-next"')).toContain('disabled')
  })
})
