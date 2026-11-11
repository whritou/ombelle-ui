'use client'
import * as React from 'react'
import * as HoverCardPrimitive from '@radix-ui/react-hover-card'
import { cn } from './utils.js'
import './hover-card.css'

export type HoverCardProps = React.ComponentProps<typeof HoverCardPrimitive.Root>

/**
 * A preview card for a link, shown on hover and on keyboard focus. The link must work on its
 * own: keep actions that only the card offers out of it.
 */
export function HoverCard({ openDelay = 500, closeDelay = 200, ...props }: HoverCardProps) {
  return <HoverCardPrimitive.Root data-slot="hover-card" openDelay={openDelay} closeDelay={closeDelay} {...props} />
}

/** The link the card previews. */
export function HoverCardTrigger({ className, ...props }: React.ComponentProps<typeof HoverCardPrimitive.Trigger>) {
  return <HoverCardPrimitive.Trigger data-slot="hover-card-trigger" className={cn(className)} {...props} />
}

export function HoverCardContent({
  className,
  side = 'bottom',
  align = 'start',
  sideOffset = 8,
  ...props
}: React.ComponentProps<typeof HoverCardPrimitive.Content>) {
  return (
    <HoverCardPrimitive.Portal>
      <HoverCardPrimitive.Content
        data-slot="hover-card-content"
        side={side}
        align={align}
        sideOffset={sideOffset}
        className={cn(className)}
        {...props}
      />
    </HoverCardPrimitive.Portal>
  )
}

/** The caret pointing at the link. Place it last inside HoverCardContent. */
export function HoverCardArrow({ className, width = 14, height = 7, ...props }: React.ComponentProps<typeof HoverCardPrimitive.Arrow>) {
  return <HoverCardPrimitive.Arrow data-slot="hover-card-arrow" width={width} height={height} className={cn(className)} {...props} />
}
