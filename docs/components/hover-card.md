# Hover Card

Hover Card previews what a link points to when the pointer rests on it or keyboard focus reaches it. It is available in all five families in light and dark mode, with Radix and Base UI editions; the template is a client component.

This component requires CLI **0.7.3** or later. Until 0.7.3 is published, install it from a built local checkout:

```powershell
pnpm exec node packages/cli/dist/main.js add hover-card --cwd APP --dry-run --json
pnpm exec node packages/cli/dist/main.js add hover-card --cwd APP --yes
```

```tsx
import { HoverCard, HoverCardArrow, HoverCardContent, HoverCardTrigger } from '@/components/ui/hover-card'

export function Credit() {
  return (
    <p>
      Built with{' '}
      <HoverCard>
        <HoverCardTrigger href="https://github.com/ombelle">@ombelle</HoverCardTrigger>
        <HoverCardContent>
          <strong>Ombelle UI</strong>
          <p>Reviewed React components with deterministic presets.</p>
          <HoverCardArrow />
        </HoverCardContent>
      </HoverCard>{' '}
      presets.
    </p>
  )
}
```

## API and accessibility

- `HoverCard` takes `open` or `defaultOpen`, `onOpenChange`, `openDelay` (default 500 ms) and `closeDelay` (default 200 ms).
- `HoverCardTrigger` is a link; give it an `href` so it works on its own. `HoverCardContent` takes `side` (default `bottom`), `align` (default `start`) and `sideOffset`. `HoverCardArrow` draws the caret; place it last in the content.
- The card opens on hover and on keyboard focus of the link, and closes on Escape, blur or pointer leave.
- The card is a supplement: people using touch or a screen reader may never see it. Keep anything it offers available elsewhere, and do not put controls in it that only it provides.

## Recipe

The recipe editor sets the side, the arrow, the link text, and the card's title, handle, body and initials. Compilation emits `components/ui/hover-card.tsx`, `components/ui/hover-card.css` and `examples/hover-card.tsx`.

Runtime dependencies of the Radix edition are React 19.3.1, @radix-ui/react-hover-card 1.2.1 (MIT), clsx 2.1.1 and tailwind-merge 3.7.0. The Base UI edition uses @base-ui/react 1.9.0 (Preview Card) and does not install the Radix package.

## Editions

- **Radix edition (Hover Card):** the delays sit on the root.
- **Base UI edition (Preview Card):** the root passes the delays to the trigger, where Base UI reads them, and the arrow is drawn as the same caret.

Part names and `data-slot` values are the same in both editions.

## Liquid glass

Liquid glass is experimental for Hover Card, as for every glass component, and its findings do not block a release. See [liquid glass](liquid-glass.md).

See [overlays and search evidence](../evidence/overlays-search-073.md) for the board comparison, the specimen audit and the browser tests.
