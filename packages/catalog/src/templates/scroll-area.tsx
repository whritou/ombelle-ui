'use client'
import * as React from 'react'
import * as ScrollAreaPrimitive from '@radix-ui/react-scroll-area'
import { cn } from './utils.js'
import './scroll-area.css'

/**
 * Whether the viewport's content overflows on an axis the viewport scrolls. An
 * axis whose computed overflow is `hidden` or `clip` does not count, so a long
 * line clipped in a vertical-only area adds no tab stop. A ResizeObserver on
 * the viewport and its first child keeps it current, and `axes` measures again
 * when the area's scrollbars change. It is false before the first measurement,
 * so the server render never carries a tab stop.
 */
export function useOverflowFocus(viewport: React.RefObject<HTMLElement | null>, axes?: string): boolean {
  const [overflowing, setOverflowing] = React.useState(false)
  React.useEffect(() => {
    const element = viewport.current
    if (!element) return
    const scrolls = (overflow: string | undefined) => overflow !== 'hidden' && overflow !== 'clip'
    const measure = () => {
      const style = typeof getComputedStyle === 'function' ? getComputedStyle(element) : undefined
      setOverflowing(
        (scrolls(style?.overflowY) && element.scrollHeight > element.clientHeight) ||
          (scrolls(style?.overflowX) && element.scrollWidth > element.clientWidth),
      )
    }
    measure()
    if (typeof ResizeObserver === 'undefined') return
    const observer = new ResizeObserver(measure)
    observer.observe(element)
    if (element.firstElementChild) observer.observe(element.firstElementChild)
    return () => observer.disconnect()
  }, [viewport, axes])
  return overflowing
}

/**
 * Whether the viewport's content is taller than the viewport, kept current by a
 * ResizeObserver. The root carries it as `data-overflow-y`, so the styles can
 * keep a gutter for the vertical bar and content never sits under it.
 */
function useVerticalOverflow(viewport: React.RefObject<HTMLElement | null>): boolean {
  const [overflowing, setOverflowing] = React.useState(false)
  React.useEffect(() => {
    const element = viewport.current
    if (!element) return
    const measure = () => setOverflowing(element.scrollHeight > element.clientHeight)
    measure()
    if (typeof ResizeObserver === 'undefined') return
    const observer = new ResizeObserver(measure)
    observer.observe(element)
    if (element.firstElementChild) observer.observe(element.firstElementChild)
    return () => observer.disconnect()
  }, [viewport])
  return overflowing
}

type Scrolling = { x: boolean; y: boolean }

/** Which axes scrolled in the last half second, by any means: wheel, keyboard, touch or script. */
function useScrolling(viewport: React.RefObject<HTMLElement | null>): Scrolling {
  const [scrolling, setScrolling] = React.useState<Scrolling>({ x: false, y: false })
  React.useEffect(() => {
    const element = viewport.current
    if (!element) return
    let top = element.scrollTop
    let left = element.scrollLeft
    const timers: Partial<Record<keyof Scrolling, ReturnType<typeof setTimeout>>> = {}
    const mark = (axis: keyof Scrolling) => {
      setScrolling(current => (current[axis] ? current : { ...current, [axis]: true }))
      clearTimeout(timers[axis])
      timers[axis] = setTimeout(() => setScrolling(current => ({ ...current, [axis]: false })), 500)
    }
    const onScroll = () => {
      if (element.scrollTop !== top) mark('y')
      if (element.scrollLeft !== left) mark('x')
      top = element.scrollTop
      left = element.scrollLeft
    }
    element.addEventListener('scroll', onScroll, { passive: true })
    return () => {
      element.removeEventListener('scroll', onScroll)
      clearTimeout(timers.x)
      clearTimeout(timers.y)
    }
  }, [viewport])
  return scrolling
}

const subscribe = () => () => {}

/** False on the server and during hydration, true afterwards. */
function useHydrated() {
  return React.useSyncExternalStore(subscribe, () => true, () => false)
}

const ScrollAreaContext = React.createContext<{
  scrolling: Scrolling
  setHorizontal?: (present: boolean) => void
}>({ scrolling: { x: false, y: false } })

type ScrollAreaProps = React.ComponentProps<'div'> & {
  'aria-label'?: string
  'aria-labelledby'?: string
}

/**
 * A scrollable region with a styled scrollbar that shows on hover or scroll.
 * Name it with `aria-label` or `aria-labelledby`; the viewport becomes a
 * keyboard stop only while its content overflows.
 */
export function ScrollArea({
  className,
  children,
  'aria-label': ariaLabel,
  'aria-labelledby': ariaLabelledby,
  ...props
}: ScrollAreaProps) {
  const viewport = React.useRef<HTMLDivElement>(null)
  // The vertical bar is always there; a horizontal ScrollBar child reports itself.
  const [horizontal, setHorizontal] = React.useState(false)
  const overflowing = useOverflowFocus(viewport, horizontal ? 'xy' : 'y')
  const tall = useVerticalOverflow(viewport)
  const scrolling = useScrolling(viewport)
  const context = React.useMemo(() => ({ scrolling, setHorizontal }), [scrolling])
  // Radix shows a hover scrollbar only once the pointer enters, so the server
  // render uses "scroll" to include the bar, hidden; after hydration the area
  // shows it on hover, and the scroll listener above shows it while scrolling.
  const hydrated = useHydrated()
  return (
    <ScrollAreaContext.Provider value={context}>
      <ScrollAreaPrimitive.Root
        type={hydrated ? 'hover' : 'scroll'}
        data-slot="scroll-area"
        data-overflow-y={tall ? '' : undefined}
        data-horizontal={horizontal ? '' : undefined}
        data-scrolling={scrolling.x || scrolling.y ? '' : undefined}
        className={cn(className)}
        {...(props as React.ComponentProps<typeof ScrollAreaPrimitive.Root>)}
      >
        <ScrollAreaPrimitive.Viewport
          ref={viewport}
          data-slot="scroll-area-viewport"
          role="region"
          aria-label={ariaLabel}
          aria-labelledby={ariaLabelledby}
          tabIndex={overflowing ? 0 : undefined}
          // Set from the first render, so the overflow measurement never sees Radix's initial hidden axes.
          style={{ overflowX: horizontal ? 'scroll' : 'hidden', overflowY: 'scroll' }}
        >
          {children}
        </ScrollAreaPrimitive.Viewport>
        <ScrollBar />
        <ScrollAreaPrimitive.Corner data-slot="scroll-area-corner" />
      </ScrollAreaPrimitive.Root>
    </ScrollAreaContext.Provider>
  )
}

/** Add `<ScrollBar orientation="horizontal" />` inside a ScrollArea for sideways scrolling. */
export function ScrollBar({
  className,
  orientation = 'vertical',
  ...props
}: { orientation?: 'vertical' | 'horizontal' } & Omit<
  React.ComponentProps<typeof ScrollAreaPrimitive.ScrollAreaScrollbar>,
  'orientation'
>) {
  const { scrolling, setHorizontal } = React.useContext(ScrollAreaContext)
  React.useEffect(() => {
    if (orientation !== 'horizontal' || !setHorizontal) return
    setHorizontal(true)
    return () => setHorizontal(false)
  }, [orientation, setHorizontal])
  // The bar stays mounted while its axis overflows, so scrolling can show it
  // without a hover; the thumb is forced only for the server render.
  const hydrated = useHydrated()
  const shown = scrolling[orientation === 'vertical' ? 'y' : 'x'] ? ({ 'data-state': 'visible' } as const) : {}
  return (
    <ScrollAreaPrimitive.ScrollAreaScrollbar
      forceMount
      orientation={orientation}
      className={cn(className)}
      {...props}
      {...shown}
      data-slot="scroll-area-scrollbar"
    >
      <ScrollAreaPrimitive.ScrollAreaThumb {...(hydrated ? {} : ({ forceMount: true } as const))} data-slot="scroll-area-thumb" />
    </ScrollAreaPrimitive.ScrollAreaScrollbar>
  )
}
