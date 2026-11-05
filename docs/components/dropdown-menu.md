# Dropdown Menu

Dropdown Menu shows a list of actions from a trigger, built on the reviewed Radix Dropdown Menu primitive. It is available in flat, minimalist, neo brutalism, and ombelle, in light and dark mode, and as an experimental liquid glass style. The template is a client component.

## Install and compose

```powershell
pnpm exec node packages/cli/dist/main.js add dropdown-menu --cwd APP --dry-run --json
pnpm exec node packages/cli/dist/main.js add dropdown-menu --cwd APP --yes
```

```tsx
import {
  DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuLabel,
  DropdownMenuItem, DropdownMenuShortcut, DropdownMenuSeparator,
  DropdownMenuSub, DropdownMenuSubTrigger, DropdownMenuSubContent,
} from '@/components/ui/dropdown-menu'
import { Button } from '@/components/ui/button'

export function ProjectActions() {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="icon-sm" aria-label="Project actions">…</Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuLabel>Project</DropdownMenuLabel>
        <DropdownMenuItem>Rename<DropdownMenuShortcut>F2</DropdownMenuShortcut></DropdownMenuItem>
        <DropdownMenuSub>
          <DropdownMenuSubTrigger>Share</DropdownMenuSubTrigger>
          <DropdownMenuSubContent>
            <DropdownMenuItem>Copy link</DropdownMenuItem>
          </DropdownMenuSubContent>
        </DropdownMenuSub>
        <DropdownMenuSeparator />
        <DropdownMenuItem variant="destructive">Archive</DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
```

An icon-only trigger needs `aria-label`. Radix supplies `aria-haspopup="menu"`, `aria-expanded`, the `menu` and `menuitem` roles, `menuitemcheckbox` and `menuitemradio` with `aria-checked`, roving focus and focus return.

## API and keyboard

- `DropdownMenu`, `DropdownMenuTrigger`, `DropdownMenuPortal`, `DropdownMenuGroup`, `DropdownMenuRadioGroup` and `DropdownMenuSub` forward their Radix parts.
- `DropdownMenuContent` renders in a portal with a 6px `sideOffset`. It forwards `align`, `side`, `loop`, `collisionPadding` and the other Content props.
- `DropdownMenuItem` adds `variant` (`default` or `destructive`) and `inset`. `DropdownMenuLabel` and `DropdownMenuSubTrigger` also take `inset`.
- `DropdownMenuCheckboxItem` (`checked`, `onCheckedChange`) and `DropdownMenuRadioItem` (`value`) render an indicator box (`dropdown-menu-item-indicator`). It follows the family Checkbox (a box with a check) or Radio Group (a circle with a dot).
- `DropdownMenuShortcut` is a `span` for a keyboard hint. Its text is visual only, so the action itself must still be bound by the application.
- `DropdownMenuSubTrigger` renders a chevron (`dropdown-menu-sub-icon`) that mirrors in right-to-left layouts. `DropdownMenuSubContent` renders in a portal with the same surface as the menu.

Enter, Space and ArrowDown open the menu; arrows move the highlight, skipping disabled items; typing jumps to a matching item; ArrowRight opens a submenu and ArrowLeft closes it; Escape closes and returns focus to the trigger.

## Styles and artifacts

- Ombelle: an outlined panel with an offset shadow and pill-highlighted rows. Labels are uppercase, separators are dashed, and destructive items are red.
- Flat: an elevated panel with a secondary highlight.
- Minimalist: a hairline panel with a muted highlight.
- Neo brutalism: a bordered panel with a pink label band, rules between groups and a primary highlight. Shortcuts sit in bordered key caps, destructive items have a tinted row, and disabled items are striped.
- Liquid glass (experimental): a translucent blurred panel. The blur drops to a solid panel under reduced transparency and in forced colors.

Highlighted rows and open submenu triggers use `Highlight` in forced colors, and checked indicators fill with `Highlight`. Disabled items use `GrayText`. Rows are at least 34px tall.

Compilation emits `components/ui/dropdown-menu.tsx`, `components/ui/dropdown-menu.css` and `examples/dropdown-menu.tsx`. Runtime dependencies are exactly React 19.3.1, @radix-ui/react-dropdown-menu 2.2.1 (MIT), clsx 2.1.1, tailwind-merge 3.7.0 and lucide-react 1.55.0.

See [the batch 1 verification record](../evidence/next-components-batch-1.md). Consumer-matrix rows, the browser e2e suite, and human screen-reader review are pending.
