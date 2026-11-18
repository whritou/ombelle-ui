'use client'

import { useEffect, useRef, type ReactNode } from 'react'
import type { GroupImperativeHandle } from 'react-resizable-panels'
import { ResizableHandle, ResizablePanel, ResizablePanelGroup, readSavedLayout } from '../generated/ui/components/ui/resizable'

/** The browser's local storage, or nothing on the server and when the browser blocks it. */
function storage(): Storage | null {
  try {
    return typeof window === 'undefined' ? null : window.localStorage
  } catch {
    return null
  }
}

/**
 * The editors' inspector and main area, split by a handle that the pointer drags and the arrow keys move.
 * The same tree renders at every width, so nothing remounts when the viewport class settles after hydration:
 * from 1200 px the split lays the two areas out; below it, CSS flattens the split into `className`'s grid and
 * hides the handle, so the tablet and phone structures stay as they were. The remembered split is applied
 * through the group's API after hydration, and saved when the user resizes.
 */
export function EditorSplit({ id, className, inspector, children, after }: {
  /** Storage key for the remembered split, such as "ombelle-editor-component". */
  id: string
  className?: string
  inspector: ReactNode
  children: ReactNode
  /** Rendered after the split, outside it, such as the preset editor's review drawer. */
  after?: ReactNode
}) {
  const group = useRef<GroupImperativeHandle | null>(null)
  // Read before the group reports its first layout, which would otherwise overwrite the saved one.
  const saved = useRef<string | null | undefined>(undefined)
  if (saved.current === undefined) {
    const store = storage()
    saved.current = store ? readSavedLayout(store, id) : null
  }
  useEffect(() => {
    if (saved.current) group.current?.setLayout(JSON.parse(saved.current))
  }, [])
  return (
    <div className={className} data-editor-split="">
      <ResizablePanelGroup direction="horizontal" groupRef={group} data-editor-split-group=""
        onLayoutChanged={layout => { try { storage()?.setItem(id, JSON.stringify(layout)) } catch { /* Blocked storage keeps the split for this visit. */ } }}>
        <ResizablePanel id="inspector" defaultSize="27%" minSize="20%" maxSize="45%">{inspector}</ResizablePanel>
        <ResizableHandle withHandle aria-label="Resize the inspector and the preview" />
        <ResizablePanel id="main" defaultSize="73%" minSize="40%">{children}</ResizablePanel>
      </ResizablePanelGroup>
      {after}
    </div>
  )
}
