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
}

const CarouselContext = React.createContext<CarouselState | null>(null)

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

export type CarouselProps = React.ComponentProps<'div'> & {
  /** How many slides show at once. */
  slidesPerView?: 1 | 2 | 3
}

/**
 * Slides that snap as they scroll. Touch, trackpad and keyboard scrolling work without a script;
 * the buttons and dots only scroll a slide into view. It never autoplays.
 */
export function Carousel({ slidesPerView = 1, className, children, ...props }: CarouselProps) {
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
  }
  return (
    <CarouselContext.Provider value={state}>
      <div
        role="region"
        aria-roledescription="carousel"
        {...props}
        data-slot="carousel"
        data-slides-per-view={slidesPerView}
        className={cn(className)}
        style={{ '--carousel-slides': slidesPerView, ...props.style } as React.CSSProperties}
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
    <div
      role="group"
      aria-roledescription="slide"
      aria-label={`${index + 1} of ${count}`}
      {...props}
      data-slot="carousel-item"
      data-carousel-item=""
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
