# Scroll Area

Scroll Area is a scrollable region with a styled scrollbar that appears on hover or while scrolling. It is available in all five families in light and dark mode, with Radix and Base UI editions; the template is a client component.

This component requires CLI **0.7.5** or later: `npx @ombelle-ui/cli@0.7.5 add scroll-area`. For a built local checkout:

```powershell
pnpm exec node packages/cli/dist/main.js add scroll-area --cwd APP --dry-run --json
pnpm exec node packages/cli/dist/main.js add scroll-area --cwd APP --yes
```

```tsx
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area'

export function Components() {
  return (
    <ScrollArea aria-label="Components" style={{ blockSize: 200 }}>
      <ul>
        <li>Accordion</li>
        <li>Alert</li>
        <li>Alert Dialog</li>
        <li>Avatar</li>
      </ul>
    </ScrollArea>
  )
}

export function Wide() {
  return (
    <ScrollArea aria-label="Tokens" style={{ blockSize: 200 }}>
      <div style={{ inlineSize: '40rem' }}>Wide content</div>
      <ScrollBar orientation="horizontal" />
    </ScrollArea>
  )
}
```

## API and accessibility

- The area scrolls the content that goes past its size, so give it a height (or a width, for sideways scrolling), such as `style={{ blockSize: 200 }}` or a class.
- The vertical scrollbar is always included. Add `<ScrollBar orientation="horizontal" />` inside the area for sideways scrolling.
- The viewport is a `region` named by `aria-label` or `aria-labelledby`, so name every Scroll Area.
- The viewport is a keyboard stop only while its content overflows in either axis, so it can be scrolled with the arrow, Page Up and Page Down keys. An area that does not overflow has no `tabindex`, so it adds no empty Tab stop. The server render never carries one: it appears after the first measurement and goes when the content shrinks.
- The scrollbar and thumb show while the pointer is over the area or it is scrolling, and only on an axis that overflows.
- In the flat, minimalist, neo-brutalism and ombelle families, a vertical area fades its last rows into the surface while more content is below. The fade is a scroll-driven animation, so it follows vertical scrolling only, and reduced motion removes it. Liquid glass has no fade.
- Parts: `scroll-area`, `scroll-area-viewport`, `scroll-area-scrollbar`, `scroll-area-thumb` and `scroll-area-corner`.

## Existing lists

Command, Combobox, Select and Sheet draw the same family scrollbar on their own lists. Existing projects get it with their next `add` or `theme add`.

## Recipe

The recipe editor sets `orientation` (`vertical`, `horizontal` or `both`), `height` (120 to 480), the label and 4 to 40 items. Compilation emits `components/ui/scroll-area.tsx`, `components/ui/scroll-area.css` and `examples/scroll-area.tsx`. Runtime dependencies are React 19.3.1, clsx 2.1.1 and tailwind-merge 3.7.0, plus @radix-ui/react-scroll-area 1.4.0 in the Radix edition.

## Base UI edition

The Base UI edition uses `ScrollArea` from `@base-ui/react/scroll-area` and adds no dependency. It writes the same `data-state` on the scrollbar and thumb, and keeps the scrollbar mounted so the content can be measured. The Radix edition renders the scrollbar on the server so it is there on first paint, then switches to showing it on hover. Parts, `data-slot` values and the overflow rule for the Tab stop are the same in both editions.

## Liquid glass

Liquid glass is experimental for Scroll Area, as for every glass component, and its findings do not block a release. See [liquid glass](liquid-glass.md).

See [primitives evidence](../evidence/primitives-075.md) for the specimen audit, the board comparison and the differences that remain.
