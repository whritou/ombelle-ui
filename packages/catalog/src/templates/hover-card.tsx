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
  return <HoverCardPrimitive.Root openDelay={openDelay} closeDelay={closeDelay} {...props} data-slot="hover-card" />
}

/** The link the card previews. */
export function HoverCardTrigger({ className, ...props }: React.ComponentProps<typeof HoverCardPrimitive.Trigger>) {
  return <HoverCardPrimitive.Trigger className={cn(className)} {...props} data-slot="hover-card-trigger" />
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
        side={side}
        align={align}
        sideOffset={sideOffset}
        className={cn(className)}
        {...props}
        data-slot="hover-card-content"
      />
    </HoverCardPrimitive.Portal>
  )
}

/** The caret pointing at the link. Place it last inside HoverCardContent. */
export function HoverCardArrow({ className, width = 14, height = 7, ...props }: React.ComponentProps<typeof HoverCardPrimitive.Arrow>) {
  return <HoverCardPrimitive.Arrow width={width} height={height} className={cn(className)} {...props} data-slot="hover-card-arrow" />
}
