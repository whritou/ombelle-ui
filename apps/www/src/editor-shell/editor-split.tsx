'use client'

import { useEffect, useRef, type ReactNode } from 'react'
import type { GroupImperativeHandle, PanelImperativeHandle } from 'react-resizable-panels'
import { ResizableHandle, ResizablePanel, ResizablePanelGroup, readSavedLayout } from '../generated/ui/components/ui/resizable'

/** The browser's local storage, or nothing on the server and when the browser blocks it. */
function storage(): Storage | null {
  try {
    return typeof window === 'undefined' ? null : window.localStorage
  } catch {
    return null
  }
}

/** The panel ids, sorted; they are DOM ids too, so they must not repeat the page's `main` skip-link target. */
const splitPanels = ['editor-inspector', 'editor-main']
/** The width from which the split lays out its panels. */
const splitMedia = '(min-width: 1200px)'

/**
 * The editors' inspector and main area, split by a handle that the pointer drags and the arrow keys move.
 * The same tree renders at every width, so nothing remounts when the viewport class settles after hydration:
 * from 1200 px the split lays the two areas out; below it, CSS flattens the split into `className`'s grid and
 * hides the handle, so the tablet and phone structures stay as they were. The remembered split is applied
 * through the group's API after hydration, and saved when the user resizes.
 */
export function EditorSplit({ id, className, inspector, children, after, collapsed = false, onCollapsedChange }: {
  /** Storage key for the remembered split, such as "ombelle-editor-component". */
  id: string
  className?: string
  inspector: ReactNode
  children: ReactNode
  /** Rendered after the split, outside it, such as the preset editor's review drawer. */
  after?: ReactNode
  /** Folds the inspector panel to its icon rail's width. */
  collapsed?: boolean
  /** Called when dragging the handle folds or unfolds the inspector panel. */
  onCollapsedChange?(collapsed: boolean): void
}) {
  const inspectorPanel = useRef<PanelImperativeHandle | null>(null)
  useEffect(() => {
    const panel = inspectorPanel.current
    if (!panel || panel.isCollapsed() === collapsed) return
    if (collapsed) panel.collapse()
    else panel.expand()
  }, [collapsed])
  const group = useRef<GroupImperativeHandle | null>(null)
  // Read before the group reports its first layout, which would otherwise overwrite the saved one.
  const saved = useRef<string | null | undefined>(undefined)
  if (saved.current === undefined) {
    const store = storage()
    saved.current = store ? readSavedLayout(store, id) : null
  }
  useEffect(() => {
    if (!saved.current) return
    let layout: Record<string, number>
    try {
      layout = JSON.parse(saved.current) as Record<string, number>
      // A split saved under other panel ids (an older layout) is dropped, never applied: the group would throw.
      if (Object.keys(layout).sort().join() !== splitPanels.join()) throw new Error('stale split')
    } catch {
      try { storage()?.removeItem(id) } catch { /* Blocked storage has nothing to drop. */ }
      return
    }
    // The split lays out only from 1200 px; below it the group has no width, so the split waits for desktop.
    const media = window.matchMedia(splitMedia)
    let applied = false
    const apply = () => {
      if (applied || !media.matches) return
      try { group.current?.setLayout(layout); applied = true } catch { /* The default split stays. */ }
    }
    apply()
    media.addEventListener('change', apply)
    return () => media.removeEventListener('change', apply)
  }, [id])
  return (
    <div className={className} data-editor-split="">
      <ResizablePanelGroup direction="horizontal" groupRef={group} data-editor-split-group=""
        onLayoutChanged={layout => {
          // Below 1200 px the split is flattened and has no width, so whatever it reports is not the user's split.
          if (!window.matchMedia(splitMedia).matches) return
          try { storage()?.setItem(id, JSON.stringify(layout)) } catch { /* Blocked storage keeps the split for this visit. */ }
        }}>
        <ResizablePanel id="editor-inspector" defaultSize="27%" minSize="20%" maxSize="45%" collapsible collapsedSize="4.25rem" panelRef={inspectorPanel}
          onResize={() => { const folded = inspectorPanel.current?.isCollapsed() ?? false; if (folded !== collapsed) onCollapsedChange?.(folded) }}>{inspector}</ResizablePanel>
        <ResizableHandle withHandle aria-label="Resize the inspector and the preview" />
        <ResizablePanel id="editor-main" defaultSize="73%" minSize="40%">{children}</ResizablePanel>
      </ResizablePanelGroup>
      {after}
      {/* Last in the streamed HTML: on phones the inspector stays hidden until the panes above it have arrived. */}
      <span data-editor-split-end="" hidden />
    </div>
  )
}
