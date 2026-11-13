'use client'
import * as React from 'react'
import * as PopoverPrimitive from '@radix-ui/react-popover'
import { cn } from './utils.js'
import './popover.css'

export type PopoverProps = React.ComponentProps<typeof PopoverPrimitive.Root>

export function Popover({ ...props }: PopoverProps) {
  return <PopoverPrimitive.Root data-slot="popover" {...props} />
}

export function PopoverTrigger({
  ...props
}: React.ComponentProps<typeof PopoverPrimitive.Trigger>) {
  return <PopoverPrimitive.Trigger data-slot="popover-trigger" {...props} />
}

export function PopoverAnchor({
  ...props
}: React.ComponentProps<typeof PopoverPrimitive.Anchor>) {
  return <PopoverPrimitive.Anchor data-slot="popover-anchor" {...props} />
}

export function PopoverContent({
  className,
  align = 'center',
  sideOffset,
  children,
  ...props
}: React.ComponentProps<typeof PopoverPrimitive.Content>) {
  return (
    <PopoverPrimitive.Portal>
      <PopoverPrimitive.Content
        data-slot="popover-content"
        align={align}
        // Radix adds the arrow's height to the offset, so the 10px gap needs no extra offset.
        sideOffset={sideOffset ?? (hasArrow(children) ? 0 : 6)}
        className={cn(className)}
        {...props}
      >
        {children}
      </PopoverPrimitive.Content>
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

/** A decorative arrow pointing at the trigger. Place it inside PopoverContent. */
export function PopoverArrow({
  className,
  style,
  ...props
}: Omit<React.ComponentProps<typeof PopoverPrimitive.Arrow>, 'children' | 'asChild'>) {
  return (
    <PopoverPrimitive.Arrow
      data-slot="popover-arrow"
      aria-hidden="true"
      width={ARROW_WIDTH}
      height={ARROW_HEIGHT}
      className={cn(className)}
      // Overlap the content's border so the arrow's base covers it.
      style={{ translate: '0 calc(var(--border-width, 1px) * -1)', overflow: 'visible', ...style }}
      {...props}
      asChild
    >
      {/* With asChild, Radix sets its svg props on this svg. */}
      <svg>
        <polygon data-popover-arrow-fill="" points="0,0 30,0 15,10" />
        <polyline data-popover-arrow-edge="" points="0,0 15,10 30,0" />
      </svg>
    </PopoverPrimitive.Arrow>
  )
}
