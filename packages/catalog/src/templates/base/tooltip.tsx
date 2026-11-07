'use client'
import * as React from 'react'
import { Tooltip as TooltipPrimitive } from '@base-ui/react/tooltip'
import { cn } from './utils.js'
import './tooltip.css'

/** Base UI parts accept a className function; these components take a string. */
type Part<T extends React.ElementType> = Omit<React.ComponentProps<T>, 'className'> & {
  className?: string
}
// Radix-compatible data-state next to Base UI's data-open/data-closed, so the
// shared stylesheet applies. A custom render prop replaces this bridge.
const openState = (open: boolean) => (open ? 'delayed-open' : 'closed')

/**
 * Shares open delays between tooltips. `delayDuration` and
 * `skipDelayDuration` keep the Radix edition's names and defaults.
 */
export function TooltipProvider({
  delayDuration = 700,
  skipDelayDuration = 300,
  ...props
}: Omit<React.ComponentProps<typeof TooltipPrimitive.Provider>, 'delay' | 'timeout'> & {
  delayDuration?: number
  skipDelayDuration?: number
}) {
  return (
    <TooltipPrimitive.Provider
      data-slot="tooltip-provider"
      delay={delayDuration}
      timeout={skipDelayDuration}
      {...props}
    />
  )
}

export function Tooltip({
  ...props
}: React.ComponentProps<typeof TooltipPrimitive.Root>) {
  return <TooltipPrimitive.Root data-slot="tooltip" {...props} />
}

export function TooltipTrigger({
  className,
  ...props
}: Part<typeof TooltipPrimitive.Trigger>) {
  return (
    <TooltipPrimitive.Trigger
      data-slot="tooltip-trigger"
      className={cn(className)}
      render={(triggerProps, state) => (
        <button {...triggerProps} data-state={openState(state.open)} />
      )}
      {...props}
    />
  )
}

type PositionerProps = React.ComponentProps<typeof TooltipPrimitive.Positioner>
export type TooltipContentProps = Part<typeof TooltipPrimitive.Popup> &
  Pick<
    PositionerProps,
    'side' | 'sideOffset' | 'align' | 'alignOffset' | 'collisionPadding' | 'sticky'
  >

/** Positioned next to the trigger in a portal, 6px away by default. */
export function TooltipContent({
  className,
  style,
  side = 'top',
  sideOffset = 6,
  align,
  alignOffset,
  collisionPadding,
  sticky,
  ...props
}: TooltipContentProps) {
  return (
    <TooltipPrimitive.Portal>
      <TooltipPrimitive.Positioner
        side={side}
        sideOffset={sideOffset}
        align={align}
        alignOffset={alignOffset}
        collisionPadding={collisionPadding}
        sticky={sticky}
      >
        <TooltipPrimitive.Popup
          data-slot="tooltip-content"
          className={cn(className)}
          // The shared stylesheet reads Radix's available-width variable.
          style={{
            '--radix-tooltip-content-available-width': 'var(--available-width)',
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
      </TooltipPrimitive.Positioner>
    </TooltipPrimitive.Portal>
  )
}

/** The same SVG arrow as the Radix edition, so its fill and stroke apply. */
export function TooltipArrow({
  className,
  ...props
}: Part<typeof TooltipPrimitive.Arrow>) {
  return (
    <TooltipPrimitive.Arrow
      data-slot="tooltip-arrow"
      className={cn(className)}
      render={(arrowProps) => (
        <svg
          {...(arrowProps as React.SVGProps<SVGSVGElement>)}
          width={10}
          height={5}
          viewBox="0 0 30 10"
          preserveAspectRatio="none"
        >
          <polygon points="0,0 30,0 15,10" />
        </svg>
      )}
      {...props}
    />
  )
}
