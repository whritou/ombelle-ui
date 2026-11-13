'use client'
import * as React from 'react'
import * as TooltipPrimitive from '@radix-ui/react-tooltip'
import { cn } from './utils.js'
import './tooltip.css'

export function TooltipProvider({
  ...props
}: React.ComponentProps<typeof TooltipPrimitive.Provider>) {
  return <TooltipPrimitive.Provider data-slot="tooltip-provider" {...props} />
}

export function Tooltip({
  ...props
}: React.ComponentProps<typeof TooltipPrimitive.Root>) {
  return <TooltipPrimitive.Root data-slot="tooltip" {...props} />
}

export function TooltipTrigger({
  className,
  ...props
}: React.ComponentProps<typeof TooltipPrimitive.Trigger>) {
  return (
    <TooltipPrimitive.Trigger
      data-slot="tooltip-trigger"
      className={cn(className)}
      {...props}
    />
  )
}

export function TooltipContent({
  className,
  forceMount,
  sideOffset = 6,
  ...props
}: React.ComponentProps<typeof TooltipPrimitive.Content>) {
  return (
    <TooltipPrimitive.Portal forceMount={forceMount}>
      <TooltipPrimitive.Content
        data-slot="tooltip-content"
        className={cn(className)}
        sideOffset={sideOffset}
        forceMount={forceMount}
        {...props}
      />
    </TooltipPrimitive.Portal>
  )
}

export function TooltipArrow({
  className,
  ...props
}: React.ComponentProps<typeof TooltipPrimitive.Arrow>) {
  return (
    <TooltipPrimitive.Arrow
      data-slot="tooltip-arrow"
      className={cn(className)}
      {...props}
    />
  )
}

/**
 * The value for the trigger's `aria-keyshortcuts`: modifier names become their
 * ARIA key names, a single character is upper-cased, the rest is kept as given.
 */
export function ariaKeyShortcuts(keys: readonly string[]): string {
  const names: Record<string, string> = {
    ctrl: 'Control', control: 'Control',
    cmd: 'Meta', command: 'Meta', '⌘': 'Meta', meta: 'Meta',
    alt: 'Alt', option: 'Alt', '⌥': 'Alt',
    shift: 'Shift', '⇧': 'Shift',
    esc: 'Escape',
  }
  return keys
    .map((key) => {
      const name = key.toLowerCase()
      return Object.hasOwn(names, name) ? names[name]! : key.length === 1 ? key.toUpperCase() : key
    })
    .join('+')
}

/**
 * The keys that run the action, drawn as key caps after the tooltip text. Hidden
 * from assistive technology: the trigger's `aria-keyshortcuts` announces them once.
 */
export function TooltipShortcut({
  keys,
  className,
  ...props
}: Omit<React.ComponentProps<'span'>, 'children'> & { keys: string[] }) {
  return (
    <span
      data-slot="tooltip-shortcut"
      data-tooltip-shortcut=""
      aria-hidden="true"
      className={cn(className)}
      {...props}
    >
      {keys.map((key, index) => (
        <kbd key={index} data-slot="tooltip-shortcut-key">
          {key}
        </kbd>
      ))}
    </span>
  )
}
