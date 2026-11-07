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
  sideOffset = 6,
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
        sideOffset={sideOffset}
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
