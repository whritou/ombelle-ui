# Toolbar

Toolbar groups buttons, links and toggles into one Tab stop. Arrow keys move between items, Home and End jump to the ends, and items that no longer fit move into a More menu, in the same order. It is available in all five families in light and dark mode, with Radix and Base UI editions; the template is a client component.

Use Toolbar for a row of related actions that should cost one Tab stop. A Button Group adds no arrow-key navigation and each of its children is its own Tab stop.

This component requires CLI **0.7.6** or later: `npx @ombelle-ui/cli@0.7.6 add toolbar`. For a built local checkout:

```powershell
pnpm exec node packages/cli/dist/main.js add toolbar --cwd APP --dry-run --json
pnpm exec node packages/cli/dist/main.js add toolbar --cwd APP --yes
```

```tsx
import { Toolbar, ToolbarLink, ToolbarOverflow, ToolbarOverflowItem, ToolbarSeparator, ToolbarToggleGroup, ToolbarToggleItem } from '@/components/ui/toolbar'

export function ViewOptions() {
  return (
    <Toolbar aria-label="View options">
      <ToolbarToggleGroup type="single" defaultValue="light" aria-label="Theme">
        <ToolbarToggleItem value="light">Light</ToolbarToggleItem>
        <ToolbarToggleItem value="dark">Dark</ToolbarToggleItem>
      </ToolbarToggleGroup>
      <ToolbarSeparator />
      <ToolbarToggleGroup type="multiple" aria-label="Guides">
        <ToolbarToggleItem value="grid">Grid</ToolbarToggleItem>
      </ToolbarToggleGroup>
      <ToolbarLink href="#preview">Open preview</ToolbarLink>
      <ToolbarOverflow label="More tools">
        <ToolbarOverflowItem onSelect={() => {}}>Duplicate</ToolbarOverflowItem>
        <ToolbarOverflowItem destructive onSelect={() => {}}>Delete</ToolbarOverflowItem>
      </ToolbarOverflow>
    </Toolbar>
  )
}
```

## API and accessibility

- `Toolbar` is a `role="toolbar"`; name it with `aria-label`. `orientation` and `loop` follow the primitive.
- `ToolbarButton`, `ToolbarLink`, `ToolbarToggleGroup` (`type` `single` or `multiple`, `value`, `defaultValue`, `onValueChange`), `ToolbarToggleItem` and `ToolbarSeparator` are the toolbar's items. Toggles keep their pressed state: `aria-pressed`, or `aria-checked` inside a single-choice group in the Radix edition.
- `ToolbarOverflow` is rendered last. When items do not fit, they are hidden from the end and listed in its menu in order: a button or link as a menu item, a toggle as a checkbox item showing its pressed state. Choosing an entry activates the hidden item. When the bar widens, items come back in the same order. Its trigger, named by `label` ("More" by default), shows only when the menu has something in it; when the focused item overflows, focus moves to it.
- `ToolbarOverflowItem` adds an entry that always stays in the menu, after the overflowed items; `destructive` entries come last, after their own separator.
- Each item takes `menuLabel` for its menu entry; otherwise the menu uses its `aria-label` or text.
- In the Radix edition, `ToolbarButton` takes `asChild` to make another element the button. In the Base UI edition, pass `render`.

## Recipe

The recipe editor sets `overflow`, `toggles` (`none`, `single` or `multiple`) and the label and up to eight items. Compilation emits `components/ui/toolbar.tsx`, `components/ui/toolbar.css` and `examples/toolbar.tsx`. Runtime dependencies are React 19.3.1, @radix-ui/react-toolbar 1.2.1, @radix-ui/react-dropdown-menu 2.2.1, clsx 2.1.1, tailwind-merge 3.7.0 and lucide-react 1.55.0. The menu repeats each family's Dropdown Menu styles under its own slots; it does not install the Dropdown Menu component.

## Base UI edition

The Base UI edition uses `Toolbar`, `ToggleGroup`, `Toggle` and `Menu` from `@base-ui/react`, with the Radix value API for toggle groups. Base UI's toolbar leaves Home and End off, so the template adds them.

## Liquid glass

Liquid glass support is experimental: the bar is translucent, and its blur stays inside the family's `@supports` fallback.
