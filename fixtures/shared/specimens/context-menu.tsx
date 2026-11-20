'use client'
import { ContextMenu, ContextMenuContent, ContextMenuItem, ContextMenuSeparator, ContextMenuShortcut, ContextMenuTrigger } from '@/components/ui/context-menu'

export function Specimen() {
  return (
    <section aria-label="Context Menu" data-component="context-menu">
      <h2>Context Menu</h2>
      <ContextMenu>
        <ContextMenuTrigger variant="zone" tabIndex={0} aria-label="Layer: Hero card">Right-click or Shift+F10 on a layer</ContextMenuTrigger>
        <ContextMenuContent>
          <ContextMenuItem>Duplicate<ContextMenuShortcut>Ctrl+D</ContextMenuShortcut></ContextMenuItem>
          <ContextMenuItem>Copy as JSX</ContextMenuItem>
          <ContextMenuSeparator />
          <ContextMenuItem variant="destructive">Delete<ContextMenuShortcut>Del</ContextMenuShortcut></ContextMenuItem>
        </ContextMenuContent>
      </ContextMenu>
    </section>
  )
}
