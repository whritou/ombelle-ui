'use client'
import * as React from 'react'
import { ChevronLeftIcon, ChevronRightIcon } from 'lucide-react'
import { cn } from './utils.js'
import './carousel.css'

type CarouselState = {
  contentId: string
  contentRef: React.RefObject<HTMLDivElement | null>
  count: number
  setCount(count: number): void
  index: number
  atStart: boolean
  atEnd: boolean
  setPosition(position: { index: number; atStart: boolean; atEnd: boolean }): void
  scrollTo(index: number): void
  /** Each slide's first CarouselImage, for the thumbnails. */
  images: (SlideImage | null)[]
}

type SlideImage = { src: string; alt: string }

const CarouselContext = React.createContext<CarouselState | null>(null)
/** The slide index CarouselItem gives the images inside it. */
const CarouselItemContext = React.createContext<number | null>(null)

function useCarousel(part: string): CarouselState {
  const state = React.useContext(CarouselContext)
  if (!state) throw new Error(`${part} must be used inside <Carousel>`)
  return state
}

const isItem = (child: React.ReactNode): child is React.ReactElement<CarouselItemProps> =>
  React.isValidElement(child) && child.type === CarouselItem

/** The number of slides, found while rendering so names and buttons are right in server HTML. */
function countSlides(children: React.ReactNode): number {
  let count = 0
  React.Children.forEach(children, child => {
    if (!React.isValidElement<{ children?: React.ReactNode }>(child)) return
    if (child.type === CarouselContent) count += React.Children.toArray(child.props.children).filter(isItem).length
    else count += countSlides(child.props.children)
  })
  return count
}

/** The first CarouselImage inside a slide, searched depth first. */
function firstImage(children: React.ReactNode): SlideImage | null {
  let found: SlideImage | null = null
  React.Children.forEach(children, child => {
    if (found || !React.isValidElement<{ children?: React.ReactNode; src?: unknown; alt?: string }>(child)) return
    if (child.type === CarouselImage) found = { src: typeof child.props.src === 'string' ? child.props.src : '', alt: child.props.alt ?? '' }
    else found = firstImage(child.props.children)
  })
  return found
}

/** Each slide's first image and whether CarouselThumbnails is among the children, read while rendering. */
function readSlides(children: React.ReactNode): { images: (SlideImage | null)[]; thumbnails: boolean } {
  const images: (SlideImage | null)[] = []
  let thumbnails = false
  const walk = (nodes: React.ReactNode) => React.Children.forEach(nodes, child => {
    if (!React.isValidElement<{ children?: React.ReactNode }>(child)) return
    if (child.type === CarouselThumbnails) thumbnails = true
    else if (child.type === CarouselContent)
      for (const item of React.Children.toArray(child.props.children).filter(isItem)) images.push(firstImage(item.props.children))
    else walk(child.props.children)
  })
  walk(children)
  return { images, thumbnails }
}

export type CarouselProps = React.ComponentProps<'div'> & {
  /** How many slides show at once. */
  slidesPerView?: 1 | 2 | 3
  /** `image` shows one framed image per view at `ratio`, with the next one peeking. */
  variant?: 'default' | 'image'
  /** The image frame's CSS aspect ratio, in the image variant. */
  ratio?: string
}

/**
 * Slides that snap as they scroll. Touch, trackpad and keyboard scrolling work without a script;
 * the buttons and dots only scroll a slide into view. It never autoplays.
 */
export function Carousel({ slidesPerView = 1, variant, ratio = '16 / 9', className, children, ...props }: CarouselProps) {
  const image = variant === 'image'
  const slides = readSlides(children)
  const contentId = React.useId() + '-content'
  const contentRef = React.useRef<HTMLDivElement | null>(null)
  const [count, setCount] = React.useState(() => countSlides(children))
  const [position, setPosition] = React.useState(() => ({ index: 0, atStart: true, atEnd: count <= slidesPerView }))
  const state: CarouselState = {
    contentId,
    contentRef,
    count,
    setCount,
    ...position,
    setPosition,
    scrollTo: index => {
      const content = contentRef.current
      const item = content?.querySelectorAll<HTMLElement>(':scope > [data-carousel-item]')[index]
      if (!content || !item) return
      const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches
      content.scrollTo({ left: item.offsetLeft, behavior: reduce ? 'auto' : 'smooth' })
    },
    images: slides.images,
  }
  return (
    <CarouselContext.Provider value={state}>
      <div
        role="region"
        aria-roledescription="carousel"
        {...props}
        data-slot="carousel"
        data-slides-per-view={slidesPerView}
        data-variant={image ? 'image' : undefined}
        data-carousel-thumbnails={slides.thumbnails ? '' : undefined}
        className={cn(className)}
        style={{ '--carousel-slides': slidesPerView, ...(image ? { '--carousel-ratio': ratio } : {}), ...props.style } as React.CSSProperties}
      >
        {children}
      </div>
    </CarouselContext.Provider>
  )
}

/** The scrolling, snapping viewport. Its direct CarouselItem children are the slides. */
export function CarouselContent({ className, children, onScroll, ...props }: React.ComponentProps<'div'>) {
  const carousel = useCarousel('CarouselContent')
  const items = React.Children.toArray(children).filter(isItem)
  const { setCount, setPosition, contentRef } = carousel
  React.useLayoutEffect(() => setCount(items.length), [items.length, setCount])
  // Reads the current slide from the scroll position, however it was scrolled.
  const measure = React.useCallback(() => {
    const content = contentRef.current
    if (!content) return
    const slides = [...content.querySelectorAll<HTMLElement>(':scope > [data-carousel-item]')]
    const left = Math.abs(content.scrollLeft)
    let index = 0
    slides.forEach((slide, at) => {
      if (Math.abs(slide.offsetLeft - left) < Math.abs(slides[index].offsetLeft - left)) index = at
    })
    const max = content.scrollWidth - content.clientWidth
    const atEnd = left >= max - 1
    // With several slides per view, the last ones never reach the start: at the end, the last slide is current.
    setPosition({ index: max > 1 && atEnd ? slides.length - 1 : index, atStart: left <= 1, atEnd })
  }, [contentRef, setPosition])
  React.useEffect(() => {
    measure()
    const content = contentRef.current
    if (!content || typeof ResizeObserver === 'undefined') return
    const observer = new ResizeObserver(measure)
    observer.observe(content)
    return () => observer.disconnect()
  }, [measure, contentRef, items.length])
  let index = 0
  return (
    <div
      tabIndex={0}
      {...props}
      ref={contentRef}
      id={carousel.contentId}
      data-slot="carousel-content"
      className={cn(className)}
      onScroll={(event) => {
        measure()
        onScroll?.(event)
      }}
    >
      {React.Children.map(children, child => (isItem(child) ? React.cloneElement(child, { index: index++, count: items.length }) : child))}
    </div>
  )
}

export type CarouselItemProps = React.ComponentProps<'div'> & {
  /** Set by CarouselContent. */
  index?: number
  count?: number
}

export function CarouselItem({ index = 0, count = 1, className, ...props }: CarouselItemProps) {
  return (
    <CarouselItemContext.Provider value={index}>
      <div
        role="group"
        aria-roledescription="slide"
        aria-label={`${index + 1} of ${count}`}
        {...props}
        data-slot="carousel-item"
        data-carousel-item=""
        className={cn(className)}
      />
    </CarouselItemContext.Provider>
  )
}

export type CarouselImageProps = Omit<React.ComponentProps<'img'>, 'alt'> & {
  /** Describes the image; the thumbnails are named by it. */
  alt: string
}

/** A slide's image. Images past the next slide load lazily unless `loading` is given. */
export function CarouselImage({ loading, className, alt, ...props }: CarouselImageProps) {
  const index = React.useContext(CarouselItemContext)
  return (
    <img
      {...props}
      alt={alt}
      loading={loading ?? (index !== null && index >= 2 ? 'lazy' : undefined)}
      data-slot="carousel-image"
      className={cn(className)}
    />
  )
}

export function CarouselPrevious({ className, onClick, children, ...props }: React.ComponentProps<'button'>) {
  const carousel = useCarousel('CarouselPrevious')
  return (
    <button
      type="button"
      aria-label="Previous slide"
      {...props}
      aria-controls={carousel.contentId}
      disabled={props.disabled || carousel.atStart || carousel.count <= 1}
      data-slot="carousel-previous"
      className={cn(className)}
      onClick={(event) => {
        carousel.scrollTo(carousel.index - 1)
        onClick?.(event)
      }}
    >
      {children ?? <ChevronLeftIcon aria-hidden="true" />}
    </button>
  )
}

export function CarouselNext({ className, onClick, children, ...props }: React.ComponentProps<'button'>) {
  const carousel = useCarousel('CarouselNext')
  return (
    <button
      type="button"
      aria-label="Next slide"
      {...props}
      aria-controls={carousel.contentId}
      disabled={props.disabled || carousel.atEnd || carousel.count <= 1}
      data-slot="carousel-next"
      className={cn(className)}
      onClick={(event) => {
        carousel.scrollTo(carousel.index + 1)
        onClick?.(event)
      }}
    >
      {children ?? <ChevronRightIcon aria-hidden="true" />}
    </button>
  )
}

/** One button per slide; the current one is marked with aria-current. */
export function CarouselDots({ className, ...props }: React.ComponentProps<'div'>) {
  const carousel = useCarousel('CarouselDots')
  return (
    <div role="group" aria-label="Choose slide" {...props} data-slot="carousel-dots" className={cn(className)}>
      {Array.from({ length: carousel.count }, (_, index) => (
        <button
          key={index}
          type="button"
          aria-label={`Slide ${index + 1}`}
          aria-current={index === carousel.index ? 'true' : undefined}
          aria-controls={carousel.contentId}
          data-slot="carousel-dot"
          onClick={() => carousel.scrollTo(index)}
        />
      ))}
    </div>
  )
}

/** "1 / 5", for sighted users; the slides already announce their position. */
export function CarouselCounter({ className, ...props }: React.ComponentProps<'span'>) {
  const carousel = useCarousel('CarouselCounter')
  return (
    <span aria-hidden="true" {...props} data-slot="carousel-counter" className={cn(className)}>
      {`${Math.min(carousel.index + 1, carousel.count)} / ${carousel.count}`}
    </span>
  )
}

/** One button per slide showing its image, named by the image's alt text; the current one is marked with aria-current. */
export function CarouselThumbnails({ className, ...props }: React.ComponentProps<'div'>) {
  const carousel = useCarousel('CarouselThumbnails')
  return (
    <div role="group" aria-label="Choose an image" {...props} data-slot="carousel-thumbnails" className={cn(className)}>
      {carousel.images.map((image, index) => (
        <button
          key={index}
          type="button"
          aria-label={image?.alt || `Slide ${index + 1}`}
          aria-current={index === carousel.index ? 'true' : undefined}
          aria-controls={carousel.contentId}
          data-slot="carousel-thumbnail"
          onClick={() => carousel.scrollTo(index)}
        >
          {image ? <img src={image.src} alt="" loading="lazy" /> : null}
        </button>
      ))}
    </div>
  )
}
