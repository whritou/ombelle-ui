# Popover

Popover is a non-modal panel anchored to a trigger, built on the reviewed Radix Popover primitive. Use it for short forms, share links and details that the user dismisses by clicking away. It is available in flat, minimalist, neo brutalism, and ombelle, in light and dark mode, and as an experimental liquid glass style. The template is a client component. Use [Dialog](../03-components-styles-accessibility.md) for anything that needs a decision or blocks the page.

## Install and compose

```powershell
pnpm exec node packages/cli/dist/main.js add popover --cwd APP --dry-run --json
pnpm exec node packages/cli/dist/main.js add popover --cwd APP --yes
```

```tsx
import {
  Popover, PopoverTrigger, PopoverContent, PopoverTitle, PopoverDescription,
} from '@/components/ui/popover'
import { Button } from '@/components/ui/button'

export function SharePreset() {
  return (
    <Popover>
      <PopoverTrigger asChild><Button>Share preset</Button></PopoverTrigger>
      <PopoverContent aria-labelledby="share-title">
        <PopoverTitle id="share-title">Share preset</PopoverTitle>
        <PopoverDescription>Anyone with the link can install this preset.</PopoverDescription>
      </PopoverContent>
    </Popover>
  )
}
```

Radix gives the content `role="dialog"` and the trigger `aria-haspopup="dialog"` and `aria-expanded`. Name the content: point `aria-labelledby` at the `PopoverTitle` id, or pass `aria-label`.

## API and keyboard

- `Popover`, `PopoverTrigger` and `PopoverAnchor` forward the Radix Root, Trigger and Anchor props: `open`, `defaultOpen`, `onOpenChange`, `modal`, `asChild`.
- `PopoverContent` renders in a portal. It defaults to `align="center"` and a 6px `sideOffset`, and forwards `side`, `align`, `collisionPadding`, `onOpenAutoFocus` and the other Content props. Its width is `min(22rem, available width)`, and it scrolls when taller than the space available.
- `PopoverTitle` is a heading. `level` (2–6) defaults to 2.
- `PopoverDescription` is a `p`.

Opening moves focus into the content, to its first focusable element or the content itself. Tab moves through the content, Escape closes and returns focus to the trigger, and clicking outside closes it.

## Styles and artifacts

- Ombelle: an outlined panel with a large radius, a bold title and an offset shadow in the preset shadow colour.
- Flat: an elevated panel with no border.
- Minimalist: a hairline panel with a soft shadow.
- Neo brutalism: a bordered panel with an uppercase title and a 1.5× offset shadow.
- Liquid glass (experimental): a translucent blurred panel. The blur drops under reduced transparency and in forced colors.

Forced colors use `Canvas` with a `CanvasText` border, remove shadows, and use `Highlight` for focus. Reduced motion removes the fade.

Compilation emits `components/ui/popover.tsx`, `components/ui/popover.css` and `examples/popover.tsx`. Runtime dependencies are exactly React 19.3.1, @radix-ui/react-popover 1.3.1 (MIT), clsx 2.1.1 and tailwind-merge 3.7.0.

See [the batch 2 verification record](../evidence/next-components-batch-2.md). Consumer-matrix rows, the browser e2e suite, and human screen-reader review are pending.

## Base UI edition

Projects whose `components.json` uses one of shadcn's `base-*` styles receive a Popover built on `Popover.Root`, `Trigger`, `Portal`, `Positioner` and `Popup` from `@base-ui/react/popover` (`@base-ui/react` 1.9.0) instead of `@radix-ui/react-popover`. Part names and `data-slot` values match the Radix edition. `PopoverContent` renders in a portal and keeps `side` (bottom by default), `align` (center), `sideOffset` (6px), `alignOffset`, `collisionPadding` and `sticky`, passed to Base UI's positioner. Base UI has no Anchor part: `PopoverAnchor` renders a `div` that the content positions against, through Base UI's `anchor` option. Use `render` on `PopoverTrigger` where the Radix edition uses `asChild`.

State bridge: the trigger and popup carry `data-state="open"` or `"closed"`, and the popup `data-side` and `data-align`, through each part's `render` function; a custom `render` replaces it. The popup maps Base UI's `--available-height` and `--available-width` to the `--radix-popover-content-available-*` variables. The parity test covers the closed trigger, hover, opening by click and by keyboard, and closing with Escape. The Base UI edition has no allowed styling differences.
