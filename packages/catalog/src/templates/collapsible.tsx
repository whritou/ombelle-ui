'use client'
import * as React from 'react'
import * as CollapsiblePrimitive from '@radix-ui/react-collapsible'
import { ChevronDownIcon } from 'lucide-react'
import { cn } from './utils.js'
import './collapsible.css'

/** A region that shows or hides its content. Put the trigger and the content inside it. */
export function Collapsible({
  className,
  ...props
}: React.ComponentProps<typeof CollapsiblePrimitive.Root>) {
  return (
    <CollapsiblePrimitive.Root
      data-slot="collapsible"
      className={cn(className)}
      {...props}
    />
  )
}

/**
 * The button that toggles the content, with a chevron that turns when open.
 * With `asChild` it renders your own element, without the chevron.
 */
export function CollapsibleTrigger({
  className,
  children,
  asChild,
  ...props
}: React.ComponentProps<typeof CollapsiblePrimitive.Trigger>) {
  return (
    <CollapsiblePrimitive.Trigger
      data-slot="collapsible-trigger"
      className={cn(className)}
      asChild={asChild}
      {...props}
    >
      {asChild ? (
        children
      ) : (
        <>
          {children}
          <ChevronDownIcon data-slot="collapsible-icon" aria-hidden="true" />
        </>
      )}
    </CollapsiblePrimitive.Trigger>
  )
}

/** Closed content is not rendered, so its links and buttons leave the Tab order. */
export function CollapsibleContent({
  className,
  style,
  ...props
}: React.ComponentProps<typeof CollapsiblePrimitive.Content>) {
  return (
    <CollapsiblePrimitive.Content
      data-slot="collapsible-content"
      className={cn(className)}
      // The shared stylesheet animates with one height variable.
      style={{
        '--collapsible-height': 'var(--radix-collapsible-content-height)',
        ...(style as React.CSSProperties),
      } as React.CSSProperties}
      {...props}
    />
  )
}
