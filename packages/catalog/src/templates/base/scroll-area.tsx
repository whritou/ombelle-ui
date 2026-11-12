'use client'
import * as React from 'react'
import { ScrollArea as ScrollAreaPrimitive } from '@base-ui/react/scroll-area'
import { cn } from './utils.js'
import './scroll-area.css'

/**
 * Whether the viewport's content overflows in either axis. A ResizeObserver on
 * the viewport and its first child keeps it current. It is false before the
 * first measurement, so the server render never carries a tab stop.
 */
export function useOverflowFocus(viewport: React.RefObject<HTMLElement | null>): boolean {
  const [overflowing, setOverflowing] = React.useState(false)
  React.useEffect(() => {
    const element = viewport.current
    if (!element) return
    const measure = () =>
      setOverflowing(
        element.scrollHeight > element.clientHeight ||
          element.scrollWidth > element.clientWidth,
      )
    measure()
    if (typeof ResizeObserver === 'undefined') return
    const observer = new ResizeObserver(measure)
    observer.observe(element)
    if (element.firstElementChild) observer.observe(element.firstElementChild)
    return () => observer.disconnect()
  }, [viewport])
  return overflowing
}

// Radix-compatible data-state: visible while hovered or scrolling, so the
// shared stylesheet shows the bar the same way on both editions.
const barState = (state: { hovering: boolean; scrolling: boolean }) =>
  state.hovering || state.scrolling ? 'visible' : 'hidden'

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
  const overflowing = useOverflowFocus(viewport)
  return (
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
      >
        <ScrollAreaPrimitive.Content>{children}</ScrollAreaPrimitive.Content>
      </ScrollAreaPrimitive.Viewport>
      <ScrollBar />
      <ScrollAreaPrimitive.Corner data-slot="scroll-area-corner" />
    </ScrollAreaPrimitive.Root>
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
