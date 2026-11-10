'use client'
import * as React from 'react'
import { PreviewCard as PreviewCardPrimitive } from '@base-ui/react/preview-card'
import { cn } from './utils.js'
import './hover-card.css'

/** Base UI parts accept a className function; these components take a string. */
type Part<T extends React.ElementType> = Omit<React.ComponentProps<T>, 'className'> & {
  className?: string
}
// Radix-compatible data-state next to Base UI's data-open/data-closed, so the
// shared stylesheet applies.
const openState = (open: boolean) => (open ? 'open' : 'closed')

// Base UI sets the delays on the trigger; the root takes them as in the Radix edition.
const DelayContext = React.createContext({ openDelay: 500, closeDelay: 200 })

export type HoverCardProps = React.ComponentProps<typeof PreviewCardPrimitive.Root> & {
  openDelay?: number
  closeDelay?: number
}

/**
 * A preview card for a link, shown on hover and on keyboard focus. The link must work on its
 * own: keep actions that only the card offers out of it.
 */
export function HoverCard({ openDelay = 500, closeDelay = 200, ...props }: HoverCardProps) {
  return (
    <DelayContext.Provider value={{ openDelay, closeDelay }}>
      <PreviewCardPrimitive.Root data-slot="hover-card" {...props} />
    </DelayContext.Provider>
  )
}

/** The link the card previews. */
export function HoverCardTrigger({ className, ...props }: Part<typeof PreviewCardPrimitive.Trigger>) {
  const { openDelay, closeDelay } = React.useContext(DelayContext)
  return (
    <PreviewCardPrimitive.Trigger
      data-slot="hover-card-trigger"
      delay={openDelay}
      closeDelay={closeDelay}
      className={cn(className)}
      render={(triggerProps, state) => <a {...triggerProps} data-state={openState(state.open)} />}
      {...props}
    />
  )
}

type PositionerProps = React.ComponentProps<typeof PreviewCardPrimitive.Positioner>
export type HoverCardContentProps = Part<typeof PreviewCardPrimitive.Popup> &
  Pick<PositionerProps, 'side' | 'sideOffset' | 'align' | 'alignOffset' | 'collisionPadding'>

export function HoverCardContent({
  className,
  style,
  side = 'bottom',
  align = 'start',
  sideOffset = 8,
  alignOffset,
  collisionPadding,
  ...props
}: HoverCardContentProps) {
  return (
    <PreviewCardPrimitive.Portal>
      <PreviewCardPrimitive.Positioner side={side} align={align} sideOffset={sideOffset} alignOffset={alignOffset} collisionPadding={collisionPadding}>
        <PreviewCardPrimitive.Popup
          data-slot="hover-card-content"
          className={cn(className)}
          // The shared stylesheet reads Radix's available-size variables.
          style={{
            '--radix-hover-card-content-available-height': 'var(--available-height)',
            '--radix-hover-card-content-available-width': 'var(--available-width)',
            ...(style as React.CSSProperties),
          } as React.CSSProperties}
          render={(popupProps, state) => (
            <div {...popupProps} data-state={openState(state.open)} data-side={state.side} data-align={state.align} />
          )}
          {...props}
        />
      </PreviewCardPrimitive.Positioner>
    </PreviewCardPrimitive.Portal>
  )
}

/** The caret pointing at the link. Place it last inside HoverCardContent. */
export function HoverCardArrow({ className, ...props }: Part<typeof PreviewCardPrimitive.Arrow>) {
  return (
    <PreviewCardPrimitive.Arrow
      data-slot="hover-card-arrow"
      className={cn(className)}
      render={(arrowProps, state) => (
        <div {...arrowProps} data-side={state.side}>
          <svg width="14" height="7" viewBox="0 0 30 10" preserveAspectRatio="none" aria-hidden="true">
            <polygon points="0,0 30,0 15,10" />
          </svg>
        </div>
      )}
      {...props}
    />
  )
}
