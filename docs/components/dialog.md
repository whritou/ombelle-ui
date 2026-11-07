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
