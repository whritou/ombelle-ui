'use client'
import * as React from 'react'
import { Group, Panel, Separator, useDefaultLayout, type LayoutStorage } from 'react-resizable-panels'
import { cn } from './utils.js'
import './resizable.css'

/**
 * Reads a saved layout only when it is a JSON object of finite sizes adding up to about 100, so a stale or
 * hand-edited value falls back to the default sizes instead of throwing. Blocked storage counts as empty.
 */
export function readSavedLayout(storage: LayoutStorage, key: string): string | null {
  try {
    const value = storage.getItem(key)
    if (value === null) return null
    const layout: unknown = JSON.parse(value)
    if (!layout || typeof layout !== 'object' || Array.isArray(layout)) return null
    const sizes = Object.values(layout)
    if (!sizes.length || !sizes.every(size => typeof size === 'number' && Number.isFinite(size) && size >= 0 && size <= 100)) return null
    const total = sizes.reduce((sum: number, size) => sum + (size as number), 0)
    return Math.abs(total - 100) < 1 ? value : null
  } catch {
    return null
  }
}

/** Local storage, checked on read and silent when the browser blocks it. */
const checkedStorage: LayoutStorage = {
  getItem: key => (typeof window === 'undefined' ? null : readSavedLayout(window.localStorage, key)),
  setItem: (key, value) => {
    try {
      window.localStorage.setItem(key, value)
    } catch {
      // Private windows and blocked site data keep the layout for this visit only.
    }
  },
}

export type ResizablePanelGroupProps = Omit<React.ComponentProps<typeof Group>, 'orientation'> & {
  direction?: 'horizontal' | 'vertical'
  /** Remembers the layout in local storage under this key; off unless given. */
  autoSaveId?: string
}

function SavedGroup({ autoSaveId, ...props }: React.ComponentProps<typeof Group> & { autoSaveId: string }) {
  const saved = useDefaultLayout({ id: autoSaveId, storage: checkedStorage })
  return <Group {...props} defaultLayout={saved.defaultLayout ?? props.defaultLayout} onLayoutChanged={(layout, meta) => { saved.onLayoutChanged(layout, meta); props.onLayoutChanged?.(layout, meta) }} />
}

/** Panels side by side or stacked, split by handles a pointer drags and the arrow keys move. */
export function ResizablePanelGroup({ direction = 'horizontal', autoSaveId, className, ...props }: ResizablePanelGroupProps) {
  const shared = { ...props, orientation: direction, resizeTargetMinimumSize: { coarse: 44, fine: 24 }, className: cn(className) } as const
  return autoSaveId
    ? <SavedGroup {...shared} autoSaveId={autoSaveId} data-slot="resizable-panel-group" data-direction={direction} />
    : <Group {...shared} data-slot="resizable-panel-group" data-direction={direction} />
}

/** One panel; minSize, maxSize, collapsible and collapsedSize pass to the library, and panelRef exposes collapse, expand and resize. */
export function ResizablePanel({ className, ...props }: React.ComponentProps<typeof Panel>) {
  return <Panel {...props} data-slot="resizable-panel" className={cn(className)} />
}

export type ResizableHandleProps = React.ComponentProps<typeof Separator> & {
  /** Draws a grip in the middle of the handle. */
  withHandle?: boolean
}

/** The separator between two panels: focusable, with arrow keys, Home and End. */
export function ResizableHandle({ withHandle = false, className, children, ...props }: ResizableHandleProps) {
  return (
    <Separator {...props} data-slot="resizable-handle" className={cn(className)}>
      {withHandle ? <div data-slot="resizable-handle-grip" aria-hidden="true" /> : null}
      {children}
    </Separator>
  )
}
