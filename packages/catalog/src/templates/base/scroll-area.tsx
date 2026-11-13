'use client'
import * as React from 'react'
import { ScrollArea as ScrollAreaPrimitive } from '@base-ui/react/scroll-area'
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

/** Set by a horizontal ScrollBar inside the area, so the viewport scrolls sideways only with one, as in Radix. */
const HorizontalBarContext = React.createContext<((present: boolean) => void) | undefined>(undefined)

// Radix-compatible data-state: visible while hovered or scrolling and the
// content overflows on that axis, so the shared stylesheet shows the bar the
// same way on both editions.
const barState = (state: {
  hovering: boolean
  scrolling: boolean
  orientation: 'vertical' | 'horizontal'
  hasOverflowX: boolean
  hasOverflowY: boolean
}) => {
  const overflows = state.orientation === 'vertical' ? state.hasOverflowY : state.hasOverflowX
  return overflows && (state.hovering || state.scrolling) ? 'visible' : 'hidden'
}

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
  return (
    <HorizontalBarContext.Provider value={setHorizontal}>
      <ScrollAreaPrimitive.Root
        data-slot="scroll-area"
        className={cn(className)}
        {...(props as Omit<React.ComponentProps<typeof ScrollAreaPrimitive.Root>, 'className'>)}
      >
        <ScrollAreaPrimitive.Viewport
          ref={viewport}
          data-slot="scroll-area-viewport"
          role="region"
          aria-label={ariaLabel}
          aria-labelledby={ariaLabelledby}
          tabIndex={overflowing ? 0 : undefined}
          // Always a value, never removed: React warns when a longhand beside Base UI's `overflow` disappears.
          style={{ overflowX: horizontal ? 'scroll' : 'hidden' }}
        >
          <ScrollAreaPrimitive.Content>{children}</ScrollAreaPrimitive.Content>
        </ScrollAreaPrimitive.Viewport>
        <ScrollBar />
        <ScrollAreaPrimitive.Corner data-slot="scroll-area-corner" />
      </ScrollAreaPrimitive.Root>
    </HorizontalBarContext.Provider>
  )
}

/** Add `<ScrollBar orientation="horizontal" />` inside a ScrollArea for sideways scrolling. */
export function ScrollBar({
  className,
  orientation = 'vertical',
  ...props
}: { orientation?: 'vertical' | 'horizontal' } & Omit<
  React.ComponentProps<'div'>,
  'className'
> & { className?: string }) {
  const setHorizontal = React.useContext(HorizontalBarContext)
  React.useEffect(() => {
    if (orientation !== 'horizontal' || !setHorizontal) return
    setHorizontal(true)
    return () => setHorizontal(false)
  }, [orientation, setHorizontal])
  return (
    <ScrollAreaPrimitive.Scrollbar
      // Mounted from the first render so the bar exists before measuring.
      keepMounted
      orientation={orientation}
      className={cn(className)}
      {...(props as object)}
      data-slot="scroll-area-scrollbar"
      render={(barProps, state) => (
        <div {...barProps} data-state={barState(state)} />
      )}
    >
      <ScrollAreaPrimitive.Thumb
        data-slot="scroll-area-thumb"
        render={(thumbProps, state) => (
          <div {...thumbProps} data-state={state.scrolling ? 'visible' : 'hidden'} />
        )}
      />
    </ScrollAreaPrimitive.Scrollbar>
  )
}
