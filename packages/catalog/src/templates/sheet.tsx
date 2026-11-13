'use client'
import * as React from 'react'
import * as SheetPrimitive from '@radix-ui/react-dialog'
import { XIcon } from 'lucide-react'
import { cn } from './utils.js'
import './sheet.css'

export type SheetProps = React.ComponentProps<typeof SheetPrimitive.Root>
export function Sheet(props: SheetProps) {
  return <SheetPrimitive.Root {...props} />
}
export function SheetTrigger({ className, ...props }: React.ComponentProps<typeof SheetPrimitive.Trigger>) {
  return <SheetPrimitive.Trigger data-slot="sheet-trigger" className={cn(className)} {...props} />
}
export function SheetClose({ className, ...props }: React.ComponentProps<typeof SheetPrimitive.Close>) {
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
  /** Lets the sheet follow its content again, or return to its first snap point, when a handle leaves it. */
  reset: () => void
  /** A bottom sheet's snap points, as fractions of the viewport height, lowest first. */
  snapPoints?: number[]
}
const SheetSizingContext = React.createContext<SheetSizing | null>(null)
const clamp = (value: number, min: number, max: number) => Math.min(Math.max(value, min), max)

/** A bottom sheet's finite snap points, lowest first and within 0.25..0.95; other sides, and a list without one, have none. */
function sheetSnapPoints(side: string, points: readonly number[] | undefined) {
  const finite = side === 'bottom' ? points?.filter(point => Number.isFinite(point)) : undefined
  if (!finite?.length) return undefined
  return [...new Set(finite.map(point => clamp(point, 0.25, 0.95)))].sort((a, b) => a - b)
}
/** A snap point's height in vh. */
const snapHeight = (point: number) => Math.round(point * 100)

/** The snap point (a fraction) nearest to a height in vh; a tie goes to the higher point; none without points. */
export function nearestSnapPoint(height: number, points: readonly number[]): number | undefined {
  // Rounded to a hundredth of a percent, so 0.29 * 100 counts as 29 and a tie stays a tie.
  const away = (point: number) => Math.abs(Math.round(point * 10000) / 100 - height)
  return points.reduce<number | undefined>((best, point) => {
    if (best === undefined) return point
    const distance = away(point), bestDistance = away(best)
    return distance < bestDistance || (distance === bestDistance && point > best) ? point : best
  }, undefined)
}

/** The words a handle reads for a snap point: Half height, Full height (the highest, from 0.9), or a percentage. */
export function snapPointText(point: number, points: readonly number[]): string {
  if (point === 0.5) return 'Half height'
  if (point >= 0.9 && point === Math.max(...points)) return 'Full height'
  return `${snapHeight(point)}%`
}

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
 * With snap points, a released drag settles on the nearest point, and the keys step between the points:
 * Arrow Down on the lowest closes the sheet.
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
  // A closed sheet opens again at its content's height, or at its first snap point, in both editions.
  const reset = sizing?.reset
  React.useEffect(() => () => reset?.(), [reset])
  const raw = (dy: number) => startHeight.current - down.current * dy / window.innerHeight * 100
  const points = sizing?.snapPoints
  // A released drag settles on the nearest snap point, or anywhere from 25 to 95 % without them.
  const settle = (value: number) => points ? snapHeight(nearestSnapPoint(value, points)!) : clamp(Math.round(value), 25, 95)
  const drag = useDrag(
    ({ y }) => sizing?.setHeight(clamp(Math.round(raw(y)), 10, 95)),
    ({ y }) => { if (raw(y) < 25) sizing?.close(); else sizing?.setHeight(settle(raw(y))) },
  )
  const [min, max] = points ? [snapHeight(points[0]!), snapHeight(points[points.length - 1]!)] : [25, 95]
  // The key a snap handle moves to: the next point up or down from the nearest, or the lowest or the highest.
  const step = (key: string, snaps: readonly number[]) => {
    const index = snaps.indexOf(nearestSnapPoint(current(), snaps)!), last = snaps.length - 1
    const next = key === 'ArrowUp' ? Math.min(index + 1, last) : key === 'ArrowDown' ? index - 1
      : key === 'Home' ? 0 : key === 'End' ? last : undefined
    return next === undefined ? undefined : next < 0 ? 'close' : snapHeight(snaps[next]!)
  }
  return (
    <div
      ref={self}
      role="separator"
      aria-orientation="horizontal"
      aria-label={label}
      aria-valuenow={clamp(height, min, max)}
      aria-valuemin={min}
      aria-valuemax={max}
      aria-valuetext={points ? snapPointText(nearestSnapPoint(height, points)!, points) : undefined}
      tabIndex={0}
      data-slot="sheet-handle"
      data-sheet-dragging={drag.dragging ? '' : undefined}
      className={cn(className)}
      onKeyDown={event => {
        if (points) {
          const next = step(event.key, points)
          if (next === undefined) return
          event.preventDefault()
          if (next === 'close') sizing?.close()
          else sizing?.setHeight(next)
          return
        }
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
function useSheetSizing({ resizable, side, defaultSize, minSize, maxSize, onSizeChange, snapPoints }: {
  resizable: boolean; side: string; defaultSize: number; minSize: number; maxSize: number; onSizeChange?: (size: number) => void
  snapPoints?: readonly number[]
}) {
  const dismiss = React.useRef<HTMLButtonElement | null>(null)
  const points = sheetSnapPoints(side, snapPoints)
  // A snap sheet starts at its first point; any other bottom sheet follows its content until a handle sets it.
  const first = points ? snapHeight(points[0]!) : undefined
  const [height, setHeight] = React.useState<number | undefined>(first)
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
  // Base UI keeps the content mounted while closed, so a closed snap sheet returns to its first point here.
  const reset = React.useCallback(() => setHeight(first), [first])
  const sizing: SheetSizing = { height, setHeight, close: () => dismiss.current?.click(), reset, snapPoints: points }
  const inline = resizable && (side === 'inline-start' || side === 'inline-end')
  // --sheet-size caps a bottom sheet; the handle or a snap point also sets its height, which otherwise follows the content.
  const style = inline ? { '--sheet-size': `${fit(width)}px` } : height !== undefined ? { '--sheet-size': `${height}vh`, blockSize: `${height}vh` } : undefined
  return { sizing, dismiss, inline, snap: points !== undefined, width: fit(width), min: fit(-Infinity), max: fit(Infinity), setSize, style: style as React.CSSProperties | undefined }
}
// end sheet size hook

export type SheetContentProps = React.ComponentProps<typeof SheetPrimitive.Content> & {
  side?: 'inline-start' | 'inline-end' | 'top' | 'bottom'
  size?: 'sm' | 'default' | 'lg'
  /** A side sheet the user can resize from its open edge, between minSize and maxSize pixels. */
  resizable?: boolean
  defaultSize?: number
  minSize?: number
  maxSize?: number
  onSizeChange?: (size: number) => void
  /** A bottom sheet's heights, as fractions of the viewport (0.25 to 0.95), where its handle settles; it opens at the first. */
  snapPoints?: number[]
}
export function SheetContent(props: SheetContentProps) {
  return (
    <SheetPrimitive.Portal>
      <SheetPrimitive.Overlay data-slot="sheet-overlay" />
      <SheetPanel {...props} />
    </SheetPrimitive.Portal>
  )
}
/** The panel itself, which holds the sizing state. */
function SheetPanel({ className, children, side = 'inline-end', size = 'default', asChild, style, resizable = false,
  defaultSize = 320, minSize = 240, maxSize = 640, onSizeChange, snapPoints, ...props }: SheetContentProps) {
  const sheet = useSheetSizing({ resizable, side, defaultSize, minSize, maxSize, onSizeChange, snapPoints })
  const dismiss = <SheetPrimitive.Close ref={sheet.dismiss} data-slot="sheet-dismiss" type="button" aria-label="Close">
    <XIcon aria-hidden="true" />
  </SheetPrimitive.Close>
  const handle = sheet.inline
    ? <SheetResizeHandle side={side as 'inline-start' | 'inline-end'} size={sheet.width} setSize={sheet.setSize} minSize={sheet.min} maxSize={sheet.max} />
    : null
  // Slot receives exactly one element in asChild mode. Put the built-in close
  // inside that element so native content composition retains both controls.
  const content = asChild && React.isValidElement<{ children?: React.ReactNode }>(children)
    ? React.cloneElement(children, undefined, children.props.children, dismiss, handle)
    : <>{children}{dismiss}{handle}</>
  return (
    <SheetSizingContext.Provider value={sheet.sizing}>
      <SheetPrimitive.Content data-slot="sheet-content" data-side={side} data-size={size} data-resizable={sheet.inline ? '' : undefined} data-sheet-snap={sheet.snap ? '' : undefined}
        className={cn(className)} asChild={asChild} style={sheet.style ? { ...sheet.style, ...style } : style} {...props}>
        {content}
      </SheetPrimitive.Content>
    </SheetSizingContext.Provider>
  )
}
export function SheetHeader({ className, ...props }: React.ComponentProps<'div'>) {
  return <div data-slot="sheet-header" className={cn(className)} {...props} />
}
export function SheetFooter({ className, ...props }: React.ComponentProps<'div'>) {
  return <div data-slot="sheet-footer" className={cn(className)} {...props} />
}
export function SheetTitle({ className, ...props }: React.ComponentProps<typeof SheetPrimitive.Title>) {
  return <SheetPrimitive.Title data-slot="sheet-title" className={cn(className)} {...props} />
}
export function SheetDescription({ className, ...props }: React.ComponentProps<typeof SheetPrimitive.Description>) {
  return <SheetPrimitive.Description data-slot="sheet-description" className={cn(className)} {...props} />
}
