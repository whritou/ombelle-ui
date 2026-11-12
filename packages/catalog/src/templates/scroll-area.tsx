'use client'
import * as React from 'react'
import * as ScrollAreaPrimitive from '@radix-ui/react-scroll-area'
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

const subscribe = () => () => {}

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
  // Radix renders a hover scrollbar only after the pointer enters, so the
  // server render and first hydration use "always" to include the bar, then
  // the area switches to hover.
  const hydrated = React.useSyncExternalStore(subscribe, () => true, () => false)
  return (
    <ScrollAreaPrimitive.Root
      type={hydrated ? 'hover' : 'always'}
      data-slot="scroll-area"
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
      >
        {children}
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
  React.ComponentProps<typeof ScrollAreaPrimitive.ScrollAreaScrollbar>,
  'orientation'
>) {
  return (
    <ScrollAreaPrimitive.ScrollAreaScrollbar
      // Mounted from the first render so the bar exists before measuring.
      forceMount
      orientation={orientation}
      className={cn(className)}
      {...props}
      data-slot="scroll-area-scrollbar"
    >
      <ScrollAreaPrimitive.ScrollAreaThumb forceMount data-slot="scroll-area-thumb" />
    </ScrollAreaPrimitive.ScrollAreaScrollbar>
  )
}
