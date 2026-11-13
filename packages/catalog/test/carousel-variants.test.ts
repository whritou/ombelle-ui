import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import * as React from 'react'
import { createElement as h } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import * as ui from '../src/templates/carousel.js'

const { Carousel, CarouselContent, CarouselCounter, CarouselDots, CarouselItem, CarouselNext, CarouselPrevious } = ui
// The new parts, read loosely so the file runs (and fails) before they exist.
const CarouselImage = (ui as Record<string, unknown>).CarouselImage as React.FC<Record<string, unknown>>
const CarouselThumbnails = (ui as Record<string, unknown>).CarouselThumbnails as React.FC<Record<string, unknown>>

const families = ['flat', 'minimalist', 'neo-brutalism', 'ombelle', 'liquid-glass']
const tag = (html: string, pattern: string) => html.match(new RegExp(`<[^>]*${pattern}[^>]*>`))?.[0] ?? ''
const tags = (html: string, pattern: string) => [...html.matchAll(new RegExp(`<[^>]*${pattern}[^>]*>`, 'g'))].map(match => match[0])
const attr = (element: string, name: string) => element.match(new RegExp(` ${name}="([^"]*)"`))?.[1]

const photos = [
  ['lake.svg', 'A lake below pine hills'],
  ['dunes.svg', 'Sand dunes at dusk'],
  ['city.svg', 'A city skyline at night'],
  ['coast.svg', 'A coastline'],
  ['poppies.svg', 'A field of poppies'],
] as const

const imageCarousel = (options: { thumbnails?: boolean; eager?: boolean; ratio?: string } = {}) =>
  h(Carousel, { 'aria-label': 'Field trip photos', variant: 'image', ...(options.ratio ? { ratio: options.ratio } : {}) } as never,
    h(CarouselContent, null, ...photos.map(([src, alt], index) => h(CarouselItem, { key: src },
      h(CarouselImage, { src, alt, ...(options.eager && index === 3 ? { loading: 'eager' } : {}) })))),
    h(CarouselPrevious), h(CarouselNext), h(CarouselCounter),
    options.thumbnails === false ? null : h(CarouselThumbnails))

describe('Carousel image variant', () => {
  it('marks the root and sets the ratio, 16 / 9 by default', () => {
    const root = tag(renderToStaticMarkup(imageCarousel()), 'data-slot="carousel"')
    expect(attr(root, 'data-variant')).toBe('image')
    expect(attr(root, 'style')).toContain('--carousel-ratio:16 / 9')
    expect(attr(tag(renderToStaticMarkup(imageCarousel({ ratio: '4 / 3' })), 'data-slot="carousel"'), 'style')).toContain('--carousel-ratio:4 / 3')
  })

  it('loads the first two images eagerly and the rest lazily, unless loading is given', () => {
    const images = tags(renderToStaticMarkup(imageCarousel()), 'data-slot="carousel-image"')
    expect(images.map(image => attr(image, 'alt'))).toEqual(photos.map(([, alt]) => alt))
    expect(images.map(image => attr(image, 'loading'))).toEqual([undefined, undefined, 'lazy', 'lazy', 'lazy'])
    const eager = tags(renderToStaticMarkup(imageCarousel({ eager: true })), 'data-slot="carousel-image"')
    expect(eager.map(image => attr(image, 'loading'))).toEqual([undefined, undefined, 'lazy', 'eager', 'lazy'])
  })

  it('renders one thumbnail per slide, named by its alt text, in server HTML', () => {
    const html = renderToStaticMarkup(imageCarousel())
    const group = tag(html, 'data-slot="carousel-thumbnails"')
    expect(attr(group, 'role')).toBe('group')
    expect(attr(group, 'aria-label')).toBe('Choose an image')
    const content = attr(tag(html, 'data-slot="carousel-content"'), 'id')
    const buttons = tags(html, 'data-slot="carousel-thumbnail"')
    expect(buttons.map(button => attr(button, 'aria-label'))).toEqual(photos.map(([, alt]) => alt))
    expect(buttons.map(button => attr(button, 'aria-current'))).toEqual(['true', undefined, undefined, undefined, undefined])
    for (const button of buttons) {
      expect(attr(button, 'type')).toBe('button')
      expect(attr(button, 'aria-controls')).toBe(content)
    }
    const thumbnails = html.slice(html.indexOf('data-slot="carousel-thumbnails"'))
    const images = [...thumbnails.matchAll(/<img[^>]*>/g)].map(match => match[0])
    expect(images.map(image => attr(image, 'src'))).toEqual(photos.map(([src]) => src))
    for (const image of images) {
      expect(image).toContain(' alt=""')
      expect(attr(image, 'loading')).toBe('lazy')
    }
  })

  it('marks the root when CarouselThumbnails is among its children', () => {
    expect(tag(renderToStaticMarkup(imageCarousel()), 'data-slot="carousel"')).toContain('data-carousel-thumbnails=""')
    expect(tag(renderToStaticMarkup(imageCarousel({ thumbnails: false })), 'data-slot="carousel"')).not.toContain('data-carousel-thumbnails')
  })

  it('renders a Carousel without the new props or parts exactly as at the rebase head (06bd87d6)', () => {
    const kits = ['Ombelle', 'Flat', 'Minimalist']
    const html = renderToStaticMarkup(h(Carousel, { 'aria-label': 'UI kits', slidesPerView: 2 },
      h(CarouselContent, null, ...kits.map(name => h(CarouselItem, { key: name }, name))),
      h(CarouselPrevious), h(CarouselNext), h(CarouselDots), h(CarouselCounter)))
    expect(html).toBe(unchanged)
    const plain = renderToStaticMarkup(h(Carousel, { variant: 'default' } as never, h(CarouselContent, null, h(CarouselItem, null, 'One'))))
    expect(plain).not.toContain('data-variant')
    expect(plain).not.toContain('--carousel-ratio')
  })
})

describe('Carousel image variant styles', () => {
  const marker = (family: string) => {
    const css = readFileSync(new URL(`../src/styles/carousel/${family}.css`, import.meta.url), 'utf8').replace(/\r\n/g, '\n')
    return css.match(/\/\* 0\.7\.6 variants \*\/([^]*?)\/\* end 0\.7\.6 variants \*\//)?.[1] ?? ''
  }

  it.each(families)('%s draws the frame, the image, the thumbnails, the phone layout and forced colours', family => {
    const rules = marker(family)
    expect(rules).toMatch(/\[data-slot='carousel-item'\]:is\(\[data-variant='image'\][^)]*\)\s*\{[^}]*flex: 0 0 88%;[^}]*aspect-ratio: var\(--carousel-ratio[^}]*overflow: hidden/)
    expect(rules).toMatch(/\[data-slot='carousel-image'\]\s*\{[^}]*inline-size: 100%;[^}]*block-size: 100%;[^}]*object-fit: cover/)
    expect(rules).toMatch(/\[data-slot='carousel-thumbnail'\]\s*\{[^}]*inline-size: 84px;[^}]*aspect-ratio: var\(--carousel-ratio[^}]*opacity: 0\.6/)
    const current = family === 'neo-brutalism' ? '3px solid var\\(--foreground\\)' : '2px solid var\\(--primary\\)'
    expect(rules).toMatch(new RegExp(`\\[data-slot='carousel-thumbnail'\\]\\[aria-current='true'\\]\\s*\\{[^}]*opacity: 1;[^}]*outline: ${current};[^}]*outline-offset: 2px`))
    expect(rules).toMatch(/@media \(width < 640px\)\s*\{[^@]*\[data-slot='carousel-thumbnails'\]\s*\{[^}]*flex-wrap: nowrap;[^}]*overflow-x: auto/)
    expect(rules).toMatch(/@media \(width < 640px\)\s*\{[^@]*\[data-slot='carousel-previous'\]:is\(\[data-carousel-thumbnails\] > \*\)[^{]*\{[^}]*display: none/)
    expect(rules).toMatch(/@media \(forced-colors: active\)\s*\{[^@]*\[data-slot='carousel-thumbnail'\]\[aria-current='true'\]\s*\{[^}]*outline-color: Highlight/)
    for (const match of rules.matchAll(/^([^{}@\n][^{}]*)\{/gm))
      for (const selector of match[1]!.split(','))
        expect((selector.match(/data-slot=/g) ?? []).length, selector).toBeLessThanOrEqual(1)
  })

  it.each(families)('%s pads the scrolling phone row enough to show the focus ring and the current outline', family => {
    const rules = marker(family)
    // How far an outline reaches outside its box: width plus offset.
    const extent = (selector: string) => {
      const body = rules.match(new RegExp(`^${selector.replace(/[[\]().:']/g, '\\$&')}\\s*\\{([^}]*)\\}`, 'm'))?.[1] ?? ''
      const width = Number(body.match(/outline: ([\d.]+)px/)?.[1])
      const offset = Number(body.match(/outline-offset: (-?[\d.]+)(?:px)?;/)?.[1])
      expect(width, `${family} ${selector} outline`).toBeGreaterThan(0)
      expect(Number.isNaN(offset), `${family} ${selector} offset`).toBe(false)
      return width + offset
    }
    const phone = rules.match(/@media \(width < 640px\)\s*\{([^@]*)/)?.[1] ?? ''
    const row = phone.match(/\[data-slot='carousel-thumbnails'\]\s*\{([^}]*)\}/)?.[1] ?? ''
    expect(row).toContain('overflow-x: auto')
    const padding = Number(row.match(/padding: ([\d.]+)px;/)?.[1])
    expect(padding).toBeGreaterThanOrEqual(extent("[data-slot='carousel-thumbnail']:focus-visible"))
    expect(padding).toBeGreaterThanOrEqual(extent("[data-slot='carousel-thumbnail'][aria-current='true']"))
  })
})

// The default usage as the rebase head 06bd87d6 renders it.
const unchanged = '<div role="region" aria-roledescription="carousel" aria-label="UI kits" data-slot="carousel" data-slides-per-view="2" class="" style="--carousel-slides:2"><div tabindex="0" id="_R_0_-content" data-slot="carousel-content" class=""><div role="group" aria-roledescription="slide" aria-label="1 of 3" data-slot="carousel-item" data-carousel-item="" class="">Ombelle</div><div role="group" aria-roledescription="slide" aria-label="2 of 3" data-slot="carousel-item" data-carousel-item="" class="">Flat</div><div role="group" aria-roledescription="slide" aria-label="3 of 3" data-slot="carousel-item" data-carousel-item="" class="">Minimalist</div></div><button type="button" aria-label="Previous slide" aria-controls="_R_0_-content" disabled="" data-slot="carousel-previous" class=""><svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-chevron-left" aria-hidden="true"><path d="m15 18-6-6 6-6"></path></svg></button><button type="button" aria-label="Next slide" aria-controls="_R_0_-content" data-slot="carousel-next" class=""><svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-chevron-right" aria-hidden="true"><path d="m9 18 6-6-6-6"></path></svg></button><div role="group" aria-label="Choose slide" data-slot="carousel-dots" class=""><button type="button" aria-label="Slide 1" aria-current="true" aria-controls="_R_0_-content" data-slot="carousel-dot"></button><button type="button" aria-label="Slide 2" aria-controls="_R_0_-content" data-slot="carousel-dot"></button><button type="button" aria-label="Slide 3" aria-controls="_R_0_-content" data-slot="carousel-dot"></button></div><span aria-hidden="true" data-slot="carousel-counter" class="">1 / 3</span></div>'
