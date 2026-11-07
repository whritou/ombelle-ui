'use client'
import * as React from 'react'
import { Accordion as AccordionPrimitive } from '@base-ui/react/accordion'
import { ChevronDownIcon, PlusIcon } from 'lucide-react'
import { cn } from './utils.js'
import './accordion.css'

/** Base UI parts accept a className function; these components take a string. */
type Part<T extends React.ElementType> = Omit<React.ComponentProps<T>, 'className'> & {
  className?: string
}
// Radix-compatible data-state next to Base UI's data-open, so the shared
// stylesheet applies. A custom render prop replaces this bridge.
const openState = (open: boolean) => (open ? 'open' : 'closed')

type RootProps = Omit<
  Part<typeof AccordionPrimitive.Root>,
  'value' | 'defaultValue' | 'onValueChange' | 'multiple'
>
/** The Radix edition's API: one open item (optionally collapsible) or many. */
export type AccordionProps = RootProps &
  (
    | {
        type: 'single'
        collapsible?: boolean
        value?: string
        defaultValue?: string
        onValueChange?: (value: string) => void
      }
    | {
        type: 'multiple'
        value?: string[]
        defaultValue?: string[]
        onValueChange?: (value: string[]) => void
      }
  )

// Base UI's Accordion has no arrow-key navigation; this keeps the Radix
// edition's ArrowUp, ArrowDown, Home and End between enabled triggers.
const navigationKeys = ['ArrowDown', 'ArrowUp', 'Home', 'End']
function moveTriggerFocus(event: React.KeyboardEvent<HTMLDivElement>) {
  const root = event.currentTarget
  const target = event.target as HTMLElement
  if (!navigationKeys.includes(event.key) || target.dataset.slot !== 'accordion-trigger') return
  const triggers = [
    ...root.querySelectorAll<HTMLElement>('[data-slot="accordion-trigger"]'),
  ].filter(
    (trigger) =>
      trigger.closest('[data-slot="accordion"]') === root &&
      !trigger.hasAttribute('disabled') &&
      !trigger.hasAttribute('data-disabled'),
  )
  const index = triggers.indexOf(target)
  if (index < 0) return
  const next =
    event.key === 'Home'
      ? 0
      : event.key === 'End'
        ? triggers.length - 1
        : (index + (event.key === 'ArrowDown' ? 1 : -1) + triggers.length) % triggers.length
  event.preventDefault()
  triggers[next]?.focus()
}

export function Accordion({ className, ...props }: AccordionProps) {
  const { type, value, defaultValue, onValueChange, onKeyDown, ...rest } = props
  const collapsible = 'collapsible' in rest ? rest.collapsible : undefined
  if ('collapsible' in rest) delete rest.collapsible
  const multiple = type === 'multiple'
  const toList = (v: string | string[] | undefined) =>
    v === undefined ? undefined : Array.isArray(v) ? v : v ? [v] : []
  const [uncontrolled, setUncontrolled] = React.useState<string[]>(
    () => toList(defaultValue) ?? [],
  )
  const controlled = value !== undefined
  return (
    <AccordionPrimitive.Root
      data-slot="accordion"
      className={cn(className)}
      multiple={multiple}
      onKeyDown={(event: React.KeyboardEvent<HTMLDivElement>) => {
        onKeyDown?.(event as never)
        if (!event.defaultPrevented) moveTriggerFocus(event)
      }}
      value={controlled ? toList(value) : uncontrolled}
      onValueChange={(next: string[]) => {
        // A single, non-collapsible accordion keeps one item open.
        if (!multiple && !collapsible && next.length === 0) return
        if (!controlled) setUncontrolled(next)
        ;(onValueChange as ((v: string | string[]) => void) | undefined)?.(
          multiple ? next : (next[0] ?? ''),
        )
      }}
      {...rest}
    />
  )
}

export function AccordionItem({
  className,
  ...props
}: Part<typeof AccordionPrimitive.Item>) {
  return (
    <AccordionPrimitive.Item
      data-slot="accordion-item"
      className={cn(className)}
      render={(itemProps, state) => (
        <div {...itemProps} data-state={openState(state.open)} />
      )}
      {...props}
    />
  )
}

/**
 * The trigger sits in a heading (h3 by default; set `level` to fit the
 * page outline). Families show either a chevron or a plus icon.
 */
export function AccordionTrigger({
  className,
  children,
  level = 3,
  ...props
}: Part<typeof AccordionPrimitive.Trigger> & {
  level?: 2 | 3 | 4 | 5 | 6
}) {
  const Heading = `h${level}` as 'h2' | 'h3' | 'h4' | 'h5' | 'h6'
  return (
    <AccordionPrimitive.Header
      data-slot="accordion-header"
      render={(headerProps, state) => (
        <Heading {...headerProps} data-state={openState(state.open)} />
      )}
    >
      <AccordionPrimitive.Trigger
        data-slot="accordion-trigger"
        className={cn(className)}
        render={(triggerProps, state) => (
          <button {...triggerProps} data-state={openState(state.open)} />
        )}
        {...props}
      >
        {children}
        <span data-slot="accordion-icon" aria-hidden="true">
          <ChevronDownIcon data-accordion-icon="chevron" />
          <PlusIcon data-accordion-icon="plus" />
        </span>
      </AccordionPrimitive.Trigger>
    </AccordionPrimitive.Header>
  )
}

/** Closed panels stay in the DOM, hidden and empty, as in the Radix edition. */
export function AccordionContent({
  className,
  children,
  style,
  keepMounted = true,
  ...props
}: Part<typeof AccordionPrimitive.Panel>) {
  return (
    <AccordionPrimitive.Panel
      data-slot="accordion-content"
      className={cn(className)}
      // The shared stylesheet animates with Radix's height variable.
      style={{
        '--radix-accordion-content-height': 'var(--accordion-panel-height)',
        ...(style as React.CSSProperties),
      } as React.CSSProperties}
      keepMounted={keepMounted}
      render={(panelProps, state) => (
        <div {...panelProps} data-state={openState(state.open)}>
          {state.open ? panelProps.children : null}
        </div>
      )}
      {...props}
    >
      <div data-slot="accordion-content-inner">{children}</div>
    </AccordionPrimitive.Panel>
  )
}
