# Collapsible

Collapsible shows or hides one region of content behind a trigger. For several related sections, use [Accordion](accordion.md). It is available in all five families in light and dark mode, with Radix and Base UI editions; the template is a client component.

This component requires CLI **0.7.5** or later: `npx @ombelle-ui/cli@0.7.5 add collapsible`. For a built local checkout:

```powershell
pnpm exec node packages/cli/dist/main.js add collapsible --cwd APP --dry-run --json
pnpm exec node packages/cli/dist/main.js add collapsible --cwd APP --yes
```

```tsx
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'

export function Shadow() {
  return (
    <Collapsible defaultOpen>
      <CollapsibleTrigger>Advanced shadow</CollapsibleTrigger>
      <CollapsibleContent>
        <p>Offset X and Offset Y</p>
      </CollapsibleContent>
    </Collapsible>
  )
}
```

## API and accessibility

- `Collapsible` takes `open`, `defaultOpen` and `onOpenChange`, and `disabled`.
- `CollapsibleTrigger` is a button with `aria-expanded`. It draws a chevron (`data-slot="collapsible-icon"`) that turns when the content is open. The chevron stays turned under reduced motion, so an open and a closed trigger still look different.
- With `asChild` (Radix) or `render` (Base UI) the trigger becomes your own element, and it then has no chevron.
- Closed content is not rendered, so links and buttons inside it are out of the Tab order and are reached once it is open.
- Opening and closing animate the content's height; reduced motion removes the animation.
- The root, trigger and content carry `data-state` (`open` or `closed`).

## Recipe

The recipe editor sets `defaultOpen`, the trigger label and one to six rows. Compilation emits `components/ui/collapsible.tsx`, `components/ui/collapsible.css` and `examples/collapsible.tsx`. Runtime dependencies are React 19.3.1, clsx 2.1.1, tailwind-merge 3.7.0 and lucide-react 1.55.0 for the chevron, plus @radix-ui/react-collapsible 1.2.1 in the Radix edition.

## Base UI edition

The Base UI edition uses `Collapsible` from `@base-ui/react/collapsible` and adds no dependency beyond lucide-react. Its trigger takes `render` where the Radix trigger takes `asChild`: `<CollapsibleTrigger render={<a href="/docs" />}>`. Both editions write the same `data-state` and one height variable, so the stylesheet and the other props are the same.

## Liquid glass

Liquid glass is experimental for Collapsible, as for every glass component, and its findings do not block a release. See [liquid glass](liquid-glass.md).

See [primitives evidence](../evidence/primitives-075.md) for the specimen audit, the board comparison and the differences that remain.
