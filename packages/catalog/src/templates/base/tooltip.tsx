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

/**
 * Closes an open tooltip when the pointer leaves the document. Both libraries keep a
 * hover tooltip open while the pointer may be moving to it, and a document the pointer
 * has left (an embedded preview, or the window's edge) sends no later move to close it.
 */
function useCloseOnDocumentLeave(open: boolean, close: () => void) {
  React.useEffect(() => {
    if (!open || typeof document === 'undefined') return
    const root = document.documentElement
    const leave = (event: MouseEvent) => {
      if (!event.relatedTarget) close()
    }
    root.addEventListener('mouseleave', leave)
    return () => root.removeEventListener('mouseleave', leave)
  }, [open, close])
}

type TooltipRootProps = React.ComponentProps<typeof TooltipPrimitive.Root>
type OpenChangeRest = TooltipRootProps['onOpenChange'] extends ((open: boolean, ...rest: infer Rest) => void) | undefined ? Rest : never

export function Tooltip({
  open: openProp,
  defaultOpen = false,
  onOpenChange,
  ...props
}: TooltipRootProps) {
  const [ownOpen, setOwnOpen] = React.useState(defaultOpen)
  const open = openProp ?? ownOpen
  const setOpen = React.useCallback((next: boolean, ...rest: OpenChangeRest) => {
    if (openProp === undefined) setOwnOpen(next)
    onOpenChange?.(next, ...rest)
  }, [openProp, onOpenChange])
  // A close from outside the library carries no event details; the consumer's callback gets only the state.
  const close = React.useCallback(() => {
    if (openProp === undefined) setOwnOpen(false)
    ;(onOpenChange as ((open: boolean) => void) | undefined)?.(false)
  }, [openProp, onOpenChange])
  useCloseOnDocumentLeave(open, close)
  return <TooltipPrimitive.Root data-slot="tooltip" {...props} open={open} onOpenChange={setOpen} />
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
