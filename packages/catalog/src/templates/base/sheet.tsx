'use client'
import * as React from 'react'
import { Dialog as SheetPrimitive } from '@base-ui/react/dialog'
import { XIcon } from 'lucide-react'
import { cn } from './utils.js'
import './sheet.css'

type Part<T extends React.ElementType> = Omit<React.ComponentProps<T>, 'className'> & { className?: string }
const openState = (open: boolean) => open ? 'open' : 'closed'

export type SheetProps = React.ComponentProps<typeof SheetPrimitive.Root>
export function Sheet(props: SheetProps) {
  return <SheetPrimitive.Root {...props} />
}
/** Compose another component with render={<Button />}. */
export function SheetTrigger({ className, ...props }: Part<typeof SheetPrimitive.Trigger>) {
  return <SheetPrimitive.Trigger data-slot="sheet-trigger" className={cn(className)} {...props} />
}
export function SheetClose({ className, ...props }: Part<typeof SheetPrimitive.Close>) {
  return <SheetPrimitive.Close data-slot="sheet-close" className={cn(className)} {...props} />
}
// sheet size hook
// The same in the Radix and Base UI templates (a test compares them).
type SheetSizing = {
  /** The bottom sheet's height in vh, once a handle has set it. */
  height: number | undefined
  setHeight: (height: number) => void
  /** Closes the sheet through its own Close button, which returns focus to the trigger. */
  close: () => void
  /** Lets the sheet follow its content again, when a handle leaves it. */
  reset: () => void
}
const SheetSizingContext = React.createContext<SheetSizing | null>(null)
const clamp = (value: number, min: number, max: number) => Math.min(Math.max(value, min), max)

/** A pointer drag on a separator: reports the distance moved, and the release. */
function useDrag(onMove: (delta: { x: number; y: number }) => void, onEnd?: (delta: { x: number; y: number }) => void) {
  const start = React.useRef<{ x: number; y: number } | null>(null)
  const [dragging, setDragging] = React.useState(false)
  const delta = (event: React.PointerEvent) => ({ x: event.clientX - start.current!.x, y: event.clientY - start.current!.y })
  return {
    dragging,
    handlers: {
      onPointerDown: (event: React.PointerEvent<HTMLDivElement>) => {
        if (event.button !== 0) return
        event.currentTarget.setPointerCapture(event.pointerId)
        start.current = { x: event.clientX, y: event.clientY }
        setDragging(true)
      },
      onPointerMove: (event: React.PointerEvent<HTMLDivElement>) => { if (start.current) onMove(delta(event)) },
      onPointerUp: (event: React.PointerEvent<HTMLDivElement>) => {
        if (!start.current) return
        const moved = delta(event)
        start.current = null
        setDragging(false)
        onEnd?.(moved)
      },
      onPointerCancel: () => { start.current = null; setDragging(false) },
    },
  }
}

/**
 * The drag handle of a bottom sheet: a separator that sets the sheet's height, from 25 to 95 % of the
 * viewport, with the arrow keys (10 % a step), Home and End, or a drag. Releasing a drag below 25 % closes it.
 */
export function SheetHandle({ className, label = 'Resize sheet' }: { className?: string; label?: string }) {
  const sizing = React.useContext(SheetSizingContext)
  const self = React.useRef<HTMLDivElement | null>(null)
  const [measured, setMeasured] = React.useState(50)
  // The sheet's height in vh, read from the dialog the handle sits in.
  const measure = () => {
    const box = self.current?.closest('[role="dialog"]')
    return box ? Math.round(box.getBoundingClientRect().height / window.innerHeight * 100) : measured
  }
  const height = sizing?.height ?? measured
  const current = () => sizing?.height ?? measure()
  const startHeight = React.useRef(height)
  // A top sheet grows downwards, so its drag runs the other way.
  const down = React.useRef(1)
  React.useLayoutEffect(() => { if (sizing?.height === undefined) setMeasured(measure()) }, [sizing?.height])
  // A closed sheet opens again at its content's height, in both editions.
  const reset = sizing?.reset
  React.useEffect(() => () => reset?.(), [reset])
  const raw = (dy: number) => startHeight.current - down.current * dy / window.innerHeight * 100
  const drag = useDrag(
    ({ y }) => sizing?.setHeight(clamp(Math.round(raw(y)), 10, 95)),
    ({ y }) => { if (raw(y) < 25) sizing?.close(); else sizing?.setHeight(clamp(Math.round(raw(y)), 25, 95)) },
  )
  return (
    <div
      ref={self}
      role="separator"
      aria-orientation="horizontal"
      aria-label={label}
      aria-valuenow={clamp(height, 25, 95)}
      aria-valuemin={25}
      aria-valuemax={95}
      tabIndex={0}
      data-slot="sheet-handle"
      data-sheet-dragging={drag.dragging ? '' : undefined}
      className={cn(className)}
      onKeyDown={event => {
        const now = clamp(current(), 25, 95)
        const next = event.key === 'ArrowUp' ? now + 10 : event.key === 'ArrowDown' ? now - 10 : event.key === 'Home' ? 25 : event.key === 'End' ? 95 : undefined
        if (next === undefined) return
        event.preventDefault()
        sizing?.setHeight(clamp(next, 25, 95))
      }}
      {...drag.handlers}
      onPointerDown={event => {
        startHeight.current = current()
        down.current = self.current?.closest('[role="dialog"]')?.getAttribute('data-side') === 'top' ? -1 : 1
        drag.handlers.onPointerDown(event)
      }}
    />
  )
}

/** The resize separator on a side sheet's open edge. */
function SheetResizeHandle({ side, size, setSize, minSize, maxSize, label = 'Resize panel' }: {
  side: 'inline-start' | 'inline-end'; size: number; setSize: (size: number) => void; minSize: number; maxSize: number; label?: string
}) {
  // An inline-end sheet grows towards the start, so moving left widens it.
  const sign = side === 'inline-end' ? -1 : 1
  const startSize = React.useRef(size)
  const drag = useDrag(({ x }) => setSize(startSize.current + sign * x))
  return (
    <div
      role="separator"
      aria-orientation="vertical"
      aria-label={label}
      aria-valuenow={size}
      aria-valuemin={minSize}
      aria-valuemax={maxSize}
      tabIndex={0}
      data-slot="sheet-resize-handle"
      data-sheet-dragging={drag.dragging ? '' : undefined}
      onKeyDown={event => {
        const step = event.shiftKey ? 64 : 16
        const next = event.key === 'ArrowLeft' ? size - sign * step : event.key === 'ArrowRight' ? size + sign * step
          : event.key === 'Home' ? minSize : event.key === 'End' ? maxSize : undefined
        if (next === undefined) return
        event.preventDefault()
        setSize(next)
      }}
      {...drag.handlers}
      onPointerDown={event => { startSize.current = size; drag.handlers.onPointerDown(event) }}
    />
  )
}

/** The sizing state of one sheet: its bottom height, and its side width within its bounds and the viewport. */
function useSheetSizing({ resizable, side, defaultSize, minSize, maxSize, onSizeChange }: {
  resizable: boolean; side: string; defaultSize: number; minSize: number; maxSize: number; onSizeChange?: (size: number) => void
}) {
  const dismiss = React.useRef<HTMLButtonElement | null>(null)
  const [height, setHeight] = React.useState<number>()
  const [width, setWidth] = React.useState(defaultSize)
  // The window's width, followed while the sheet is open, so the bounds and the separator's value stay true.
  const [viewport, setViewport] = React.useState<number>()
  React.useEffect(() => {
    const follow = () => setViewport(window.innerWidth)
    follow()
    window.addEventListener('resize', follow)
    return () => window.removeEventListener('resize', follow)
  }, [])
  const fit = (value: number) => {
    const room = (viewport ?? (typeof window === 'undefined' ? maxSize + 16 : window.innerWidth)) - 16
    const upper = Math.min(maxSize, room)
    // A window narrower than minSize wins: the sheet never passes the viewport.
    return Math.round(clamp(value, Math.min(minSize, upper), upper))
  }
  const setSize = (value: number) => { const next = fit(value); setWidth(next); onSizeChange?.(next) }
  const reset = React.useCallback(() => setHeight(undefined), [])
  const sizing: SheetSizing = { height, setHeight, close: () => dismiss.current?.click(), reset }
  const inline = resizable && (side === 'inline-start' || side === 'inline-end')
  // --sheet-size caps a bottom sheet; the handle also sets its height, which otherwise follows the content.
  const style = inline ? { '--sheet-size': `${fit(width)}px` } : height !== undefined ? { '--sheet-size': `${height}vh`, blockSize: `${height}vh` } : undefined
  return { sizing, dismiss, inline, width: fit(width), min: fit(-Infinity), max: fit(Infinity), setSize, style: style as React.CSSProperties | undefined }
}
// end sheet size hook

export type SheetContentProps = Part<typeof SheetPrimitive.Popup> & {
  side?: 'inline-start' | 'inline-end' | 'top' | 'bottom'
  size?: 'sm' | 'default' | 'lg'
  /** A side sheet the user can resize from its open edge, between minSize and maxSize pixels. */
  resizable?: boolean
  defaultSize?: number
  minSize?: number
  maxSize?: number
  onSizeChange?: (size: number) => void
}
export function SheetContent({ className, children, side = 'inline-end', size = 'default', style, resizable = false,
  defaultSize = 320, minSize = 240, maxSize = 640, onSizeChange, ...props }: SheetContentProps) {
  const sheet = useSheetSizing({ resizable, side, defaultSize, minSize, maxSize, onSizeChange })
  return (
    <SheetPrimitive.Portal>
      <SheetPrimitive.Backdrop data-slot="sheet-overlay" render={(backdropProps, state) => <div {...backdropProps} data-state={openState(state.open)} />} />
      <SheetSizingContext.Provider value={sheet.sizing}>
        <SheetPrimitive.Popup data-slot="sheet-content" data-side={side} data-size={size} data-resizable={sheet.inline ? '' : undefined}
          className={cn(className)} style={sheet.style ? { ...sheet.style, ...(style as React.CSSProperties) } : style}
          render={(popupProps, state) => <div {...popupProps} data-state={openState(state.open)} />} {...props}>
          {children}
          <SheetPrimitive.Close ref={sheet.dismiss} data-slot="sheet-dismiss" type="button" aria-label="Close">
            <XIcon aria-hidden="true" />
          </SheetPrimitive.Close>
          {sheet.inline
            ? <SheetResizeHandle side={side as 'inline-start' | 'inline-end'} size={sheet.width} setSize={sheet.setSize} minSize={sheet.min} maxSize={sheet.max} />
            : null}
        </SheetPrimitive.Popup>
      </SheetSizingContext.Provider>
    </SheetPrimitive.Portal>
  )
}
export function SheetHeader({ className, ...props }: React.ComponentProps<'div'>) {
  return <div data-slot="sheet-header" className={cn(className)} {...props} />
}
export function SheetFooter({ className, ...props }: React.ComponentProps<'div'>) {
  return <div data-slot="sheet-footer" className={cn(className)} {...props} />
}
export function SheetTitle({ className, ...props }: Part<typeof SheetPrimitive.Title>) {
  return <SheetPrimitive.Title data-slot="sheet-title" className={cn(className)} {...props} />
}
export function SheetDescription({ className, ...props }: Part<typeof SheetPrimitive.Description>) {
  return <SheetPrimitive.Description data-slot="sheet-description" className={cn(className)} {...props} />
}
