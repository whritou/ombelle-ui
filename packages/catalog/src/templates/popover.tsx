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
  sideOffset = 6,
  ...props
}: React.ComponentProps<typeof PopoverPrimitive.Content>) {
  return (
    <PopoverPrimitive.Portal>
      <PopoverPrimitive.Content
        data-slot="popover-content"
        align={align}
        sideOffset={sideOffset}
        className={cn(className)}
        {...props}
      />
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
