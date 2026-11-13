'use client'
import * as React from 'react'
import { Collapsible as CollapsiblePrimitive } from '@base-ui/react/collapsible'
import { ChevronDownIcon } from 'lucide-react'
import { cn } from './utils.js'
import './collapsible.css'

/** Base UI parts accept a className function; these components take a string. */
type Part<T extends React.ElementType> = Omit<React.ComponentProps<T>, 'className'> & {
  className?: string
}
// Radix-compatible data-state next to Base UI's data-open, so the shared
// stylesheet applies.
const openState = (open: boolean) => (open ? 'open' : 'closed')

type RootProps = Omit<Part<typeof CollapsiblePrimitive.Root>, 'onOpenChange'> & {
  onOpenChange?(open: boolean): void
}

/** A region that shows or hides its content. Put the trigger and the content inside it. */
export function Collapsible({ className, onOpenChange, ...props }: RootProps) {
  return (
    <CollapsiblePrimitive.Root
      data-slot="collapsible"
      className={cn(className)}
      onOpenChange={onOpenChange ? (open: boolean) => onOpenChange(open) : undefined}
      {...props}
      render={(rootProps, state) => (
        <div {...rootProps} data-state={openState(state.open)} />
      )}
    />
  )
}

/**
 * The button that toggles the content, with a chevron that turns when open.
 * Pass `render` to use your own element instead; it then has no chevron.
 */
export function CollapsibleTrigger({
  className,
  children,
  render,
  ...props
}: Part<typeof CollapsiblePrimitive.Trigger>) {
  return (
    <CollapsiblePrimitive.Trigger
      data-slot="collapsible-trigger"
      className={cn(className)}
      {...props}
      render={(triggerProps, state) => {
        const dataState = openState(state.open)
        if (React.isValidElement(render))
          return React.cloneElement(render as React.ReactElement<Record<string, unknown>>, {
            ...triggerProps,
            'data-state': dataState,
          })
        if (typeof render === 'function') return render({ ...triggerProps, 'data-state': dataState } as never, state)
        return <button {...triggerProps} data-state={dataState} />
      }}
    >
      {render ? (
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

/** Closed content is hidden and unmounted, so its links and buttons leave the Tab order. */
export function CollapsibleContent({
  className,
  style,
  ...props
}: Part<typeof CollapsiblePrimitive.Panel>) {
  return (
    <CollapsiblePrimitive.Panel
      data-slot="collapsible-content"
      className={cn(className)}
      // The shared stylesheet animates with one height variable.
      style={{
        '--collapsible-height': 'var(--collapsible-panel-height)',
        ...(style as React.CSSProperties),
      } as React.CSSProperties}
      {...props}
      render={(panelProps, state) => (
        <div {...panelProps} data-state={openState(state.open)} />
      )}
    />
  )
}
