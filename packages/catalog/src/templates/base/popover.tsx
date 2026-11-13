'use client'
import * as React from 'react'
import { Popover as PopoverPrimitive } from '@base-ui/react/popover'
import { cn } from './utils.js'
import './popover.css'

/** Base UI parts accept a className function; these components take a string. */
type Part<T extends React.ElementType> = Omit<React.ComponentProps<T>, 'className'> & {
  className?: string
}
// Radix-compatible data-state next to Base UI's data-open/data-closed, so the
// shared stylesheet applies. A custom render prop replaces this bridge.
const openState = (open: boolean) => (open ? 'open' : 'closed')

// Base UI positions against an anchor prop instead of an Anchor part.
const AnchorContext = React.createContext<{
  anchor: HTMLElement | null
  setAnchor: (element: HTMLElement | null) => void
} | null>(null)

export type PopoverProps = React.ComponentProps<typeof PopoverPrimitive.Root>

export function Popover({ ...props }: PopoverProps) {
  const [anchor, setAnchor] = React.useState<HTMLElement | null>(null)
  return (
    <AnchorContext.Provider value={{ anchor, setAnchor }}>
      <PopoverPrimitive.Root data-slot="popover" {...props} />
    </AnchorContext.Provider>
  )
}

export function PopoverTrigger({
  className,
  ...props
}: Part<typeof PopoverPrimitive.Trigger>) {
  return (
    <PopoverPrimitive.Trigger
      data-slot="popover-trigger"
      className={cn(className)}
      render={(triggerProps, state) => (
        <button {...triggerProps} data-state={openState(state.open)} />
      )}
      {...props}
    />
  )
}

/** Positions the content against this element instead of the trigger. */
export function PopoverAnchor({ ...props }: React.ComponentProps<'div'>) {
  const context = React.useContext(AnchorContext)
  return <div data-slot="popover-anchor" ref={context?.setAnchor} {...props} />
}

type PositionerProps = React.ComponentProps<typeof PopoverPrimitive.Positioner>
export type PopoverContentProps = Part<typeof PopoverPrimitive.Popup> &
  Pick<
    PositionerProps,
    'side' | 'sideOffset' | 'align' | 'alignOffset' | 'collisionPadding' | 'sticky'
  >

export function PopoverContent({
  className,
  style,
  side = 'bottom',
  align = 'center',
  sideOffset,
  alignOffset,
  collisionPadding,
  sticky,
  ...props
}: PopoverContentProps) {
  const anchor = React.useContext(AnchorContext)?.anchor
  return (
    <PopoverPrimitive.Portal>
      <PopoverPrimitive.Positioner
        side={side}
        align={align}
        sideOffset={sideOffset ?? (hasArrow(props.children) ? ARROW_HEIGHT : 6)}
        alignOffset={alignOffset}
        collisionPadding={collisionPadding}
        sticky={sticky}
        {...(anchor ? { anchor } : {})}
      >
        <PopoverPrimitive.Popup
          data-slot="popover-content"
          className={cn(className)}
          // The shared stylesheet reads Radix's available-size variables.
          style={{
            '--radix-popover-content-available-height': 'var(--available-height)',
            '--radix-popover-content-available-width': 'var(--available-width)',
            ...(style as React.CSSProperties),
          } as React.CSSProperties}
          render={(popupProps, state) => (
            <div
              {...popupProps}
              data-state={openState(state.open)}
              data-side={state.side}
              data-align={state.align}
            />
          )}
          {...props}
        />
      </PopoverPrimitive.Positioner>
    </PopoverPrimitive.Portal>
  )
}

export type PopoverTitleProps = React.ComponentProps<'h2'> & {
  level?: 2 | 3 | 4 | 5 | 6
}

/** Give PopoverContent aria-labelledby pointing at this title's id. */
export function PopoverTitle({
  className,
  level = 2,
  ...props
}: PopoverTitleProps) {
  const Heading = `h${level}` as 'h2' | 'h3' | 'h4' | 'h5' | 'h6'
  return (
    <Heading {...props} data-slot="popover-title" className={cn(className)} />
  )
}

export function PopoverDescription({
  className,
  ...props
}: React.ComponentProps<'p'>) {
  return (
    <p {...props} data-slot="popover-description" className={cn(className)} />
  )
}

// The arrow is 20 x 10: it fills the 10px gap PopoverContent leaves when it holds one.
const ARROW_WIDTH = 20
const ARROW_HEIGHT = 10
const hasArrow = (children: React.ReactNode) =>
  React.Children.toArray(children).some(child => React.isValidElement(child) && child.type === PopoverArrow)
// Base UI places the arrow along the edge; its distance from the content and its turn come from the side.
// The shape points down, and its base overlaps the content's border.
const overlap = 'calc(var(--border-width, 1px) - ' + ARROW_HEIGHT + 'px)'
const across = 'calc(var(--border-width, 1px) - ' + (ARROW_WIDTH + ARROW_HEIGHT) / 2 + 'px)'
const arrowPlacement: Record<string, React.CSSProperties> = {
  top: { bottom: overlap },
  bottom: { top: overlap, rotate: '180deg' },
  left: { right: across, rotate: '-90deg' },
  right: { left: across, rotate: '90deg' },
}

/** A decorative arrow pointing at the trigger. Place it inside PopoverContent. */
export function PopoverArrow({ className, ...props }: Omit<Part<typeof PopoverPrimitive.Arrow>, 'children'>) {
  return (
    <PopoverPrimitive.Arrow
      data-slot="popover-arrow"
      aria-hidden="true"
      className={cn(className)}
      render={(arrowProps, state) => (
        <svg
          {...(arrowProps as React.SVGProps<SVGSVGElement>)}
          style={{ ...(arrowProps.style as React.CSSProperties), overflow: 'visible', ...arrowPlacement[state.side] }}
          width={ARROW_WIDTH}
          height={ARROW_HEIGHT}
          viewBox="0 0 30 10"
          preserveAspectRatio="none"
        >
          <polygon data-popover-arrow-fill="" points="0,0 30,0 15,10" />
          <polyline data-popover-arrow-edge="" points="0,0 15,10 30,0" />
        </svg>
      )}
      {...props}
    />
  )
}
