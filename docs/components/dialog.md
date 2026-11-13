# Dialog

Dialog shows modal content above the page with a backdrop, a title, a description and a close button. Its styling lives in each style family's shared stylesheet, keyed by `data-slot` (`dialog-overlay`, `dialog-content`, `dialog-header`, `dialog-title`, `dialog-description`, `dialog-close`).

## Install and use

```powershell
pnpm exec node packages/cli/dist/main.js add dialog --cwd APP --dry-run --json
pnpm exec node packages/cli/dist/main.js add dialog --cwd APP --yes
```

```tsx
import { Button } from '@/components/ui/button'
import {
  Dialog, DialogClose, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger,
} from '@/components/ui/dialog'

export function Example() {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="outline">Open dialog</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Example dialog</DialogTitle>
          <DialogDescription>Review this example.</DialogDescription>
        </DialogHeader>
      </DialogContent>
    </Dialog>
  )
}
```

## Variants (0.7.5)

These need CLI **0.7.5** or later, including in component recipes. Leaving a prop or part out renders what earlier releases render.

```tsx
import { Dialog, DialogBody, DialogClose, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'

<Dialog>
  <DialogTrigger>Export preset</DialogTrigger>
  <DialogContent size="lg">
    <DialogHeader>
      <DialogTitle>Export preset</DialogTitle>
      <DialogDescription>Choose what the JSON file includes.</DialogDescription>
    </DialogHeader>
    <DialogBody>{/* long content */}</DialogBody>
    <DialogFooter>
      <DialogClose>Cancel</DialogClose>
      <button type="button">Export</button>
    </DialogFooter>
  </DialogContent>
</Dialog>
```

- **`DialogBody`** (`dialog-body`) scrolls between the header and the footer. It is a region named by the dialog's title. While its content overflows it is a Tab stop (`tabIndex=0`), so keyboard users can scroll it with the arrow keys and Page Up and Page Down, and it carries `data-overflowing`; a body that fits adds no Tab stop. It also renders the marker `data-dialog-body`.
- **`DialogFooter`** (`dialog-footer`) is a row of actions at the end. It stays visible while the body scrolls, gains a top border while the body overflows, and below 640px stacks its actions in reverse order, the first action at the bottom.
- **Layout:** a `DialogContent` that holds a `DialogBody` becomes a column no taller than `100dvh - 2rem`.
- **`size`** on `DialogContent`: `sm` (24rem), `default` (the existing width), `lg` (48rem) or `fullscreen` (the viewport less 1rem on each side), set as `data-size`. Below 640px, `lg` and `fullscreen` fill the screen with no corner radius; `sm` and `default` keep their width.
- Dialog has no stylesheet of its own; these rules are in each family's stylesheet. Recipe styles accept one more media condition, `(max-width: 639.98px)`, for them.
- **Recipe:** `size`, `footer` and `scrollingBody` (booleans). The footer holds a Close named "Cancel" and a "Save changes" button; the scrolling body holds eight paragraphs.

## Radix edition

Projects whose `components.json` uses `radix-nova` or `new-york`, and projects without `components.json`, receive the Radix Dialog from `@radix-ui/react-dialog` 1.3.1. `Dialog`, `DialogTrigger` and `DialogClose` are Radix's own parts; `asChild` renders the trigger or close button as another component.

## Base UI edition

Projects whose `components.json` uses one of shadcn's `base-*` styles receive a Dialog built on `Dialog.Root`, `Trigger`, `Close`, `Portal`, `Backdrop`, `Popup`, `Title` and `Description` from `@base-ui/react/dialog` (`@base-ui/react` 1.9.0). Base UI's Backdrop and Popup take the place of Radix's Overlay and Content, with the same `data-slot` values and the built-in close button. Use `render` where the Radix edition uses `asChild`:

```tsx
<DialogTrigger render={<Button variant="outline" />}>Open dialog</DialogTrigger>
```

The backdrop and popup also carry `data-state="open"` or `"closed"` through their `render` functions, next to Base UI's `data-open`. The parity test covers the closed trigger, opening by click and by keyboard, moving focus inside the dialog, and closing with Escape. The Base UI edition has no allowed styling differences.

## Generated files and dependencies

The compiler emits `components/ui/dialog.tsx` and `examples/dialog.tsx`; its styles come with the family stylesheet. Both editions use `lucide-react` 1.55.0 for the close icon, clsx 2.1.1 and tailwind-merge 3.7.0.
