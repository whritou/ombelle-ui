# Context Menu

Context Menu opens a menu at the pointer on right-click, or with Shift+F10 or the context-menu key when its area has focus. It shares Dropdown Menu's parts and item look. It is available in all five families in light and dark mode, with Radix and Base UI editions; the template is a client component.

This component requires CLI **0.7.3** or later. Until 0.7.3 is published, install it from a built local checkout:

```powershell
pnpm exec node packages/cli/dist/main.js add context-menu --cwd APP --dry-run --json
pnpm exec node packages/cli/dist/main.js add context-menu --cwd APP --yes
```

```tsx
import { ContextMenu, ContextMenuContent, ContextMenuItem, ContextMenuSeparator, ContextMenuShortcut, ContextMenuTrigger } from '@/components/ui/context-menu'

export function LayerActions() {
  return (
    <ContextMenu>
      <ContextMenuTrigger variant="zone" tabIndex={0} aria-label="Layer: Hero card">
        Right-click or Shift+F10 on a layer
      </ContextMenuTrigger>
      <ContextMenuContent>
        <ContextMenuItem>Duplicate<ContextMenuShortcut>Ctrl+D</ContextMenuShortcut></ContextMenuItem>
        <ContextMenuItem>Copy as JSX</ContextMenuItem>
        <ContextMenuSeparator />
        <ContextMenuItem variant="destructive">Delete<ContextMenuShortcut>Del</ContextMenuShortcut></ContextMenuItem>
      </ContextMenuContent>
    </ContextMenu>
  )
}
```

## API and accessibility

- The parts mirror [Dropdown Menu](dropdown-menu.md): items (with `variant="destructive"`), checkbox and radio items, label, separator, shortcut and submenus (`ContextMenuSub`, `ContextMenuSubTrigger`, `ContextMenuSubContent`).
- `ContextMenuTrigger` is the area that opens the menu. `variant="zone"` draws it as a dashed area; by default it keeps the look of what it wraps, so it can wrap a table row with `asChild` (Radix) or `render` (Base UI).
- Keyboard: give the trigger `tabIndex={0}` and a name when it is not already focusable. Shift+F10 or the context-menu key opens the menu at the trigger's corner, arrow keys move through the items, Right opens a submenu, Left closes it, and Escape closes the menu and returns focus to the trigger.
- A context menu is a shortcut. Keep its actions reachable in another way, such as a toolbar or a row menu button.

## Recipe

The recipe editor sets the zone text and up to ten items, each an item, a submenu, a separator or a destructive item, with an optional shortcut. A menu cannot start or end with a separator. Compilation emits `components/ui/context-menu.tsx`, `components/ui/context-menu.css` and `examples/context-menu.tsx`.

Runtime dependencies of the Radix edition are React 19.3.1, @radix-ui/react-context-menu 2.4.1 (MIT), clsx 2.1.1, tailwind-merge 3.7.0 and lucide-react 1.55.0. The Base UI edition uses @base-ui/react 1.9.0 in place of the Radix package.

## Editions

- **Radix edition (Context Menu):** Radix opens on the browser's `contextmenu` event; the trigger also opens it for Shift+F10 and the context-menu key, which not every browser or input method turns into that event.
- **Base UI edition (Context Menu):** Base UI handles the pointer and the keyboard itself.

Part names and `data-slot` values are the same in both editions.

## Liquid glass

Liquid glass is experimental for Context Menu, as for every glass component, and its findings do not block a release. Over the glass menu the shortcut and destructive text fall below 4.5:1 in the specimen audit. See [liquid glass](liquid-glass.md).

See [overlays and search evidence](../evidence/overlays-search-073.md) for the board comparison, the specimen audit and the browser tests.
