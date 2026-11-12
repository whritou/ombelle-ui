# Toggle

Toggle is a two-state button that reports its state with `aria-pressed`, such as "Show grid" or a theme switch. For a set of related choices use [Toggle Group](toggle-group.md). It is available in all five families in light and dark mode, with Radix and Base UI editions; the template is a client component.

This component requires CLI **0.7.5** or later: `npx @ombelle-ui/cli@0.7.5 add toggle`. For a built local checkout:

```powershell
pnpm exec node packages/cli/dist/main.js add toggle --cwd APP --dry-run --json
pnpm exec node packages/cli/dist/main.js add toggle --cwd APP --yes
```

```tsx
import { Toggle } from '@/components/ui/toggle'

export function Options() {
  return (
    <>
      <Toggle defaultPressed>Show grid</Toggle>
      <Toggle variant="outline" aria-label="Pin preview">Pin</Toggle>
    </>
  )
}
```

## API and accessibility

- `variant` is `default` (the family's resting look) or `outline` (always drawn with a border). `size` is `sm`, `default` or `lg`. They appear as `data-variant` and `data-size`.
- It is controlled with `pressed` and `onPressedChange`, or uncontrolled with `defaultPressed`. Every other button prop passes through.
- The root is a button with `aria-pressed` and `data-state` (`on` or `off`).
- An icon-only Toggle has no text to name it, so give it an `aria-label`.
- Toggle changes something at once and keeps the same name when pressed. Use [Switch](switch.md) for a setting that is saved with a form.

## Recipe

The recipe editor sets `variant`, `size`, `iconOnly` and `pressed`, and the label. Compilation emits `components/ui/toggle.tsx`, `components/ui/toggle.css` and `examples/toggle.tsx`. Recipes carry no icon set, so an icon-only recipe shows the label's first letter, named by the label. A recipe with an empty or blank label is rejected, icon-only or not, because the toggle would have no name. Runtime dependencies are React 19.3.1, clsx 2.1.1 and tailwind-merge 3.7.0, plus @radix-ui/react-toggle 1.2.1 in the Radix edition.

## Base UI edition

The Base UI edition uses `Toggle` from `@base-ui/react/toggle` and adds no dependency. It writes the same `data-state` (`on` or `off`) next to Base UI's own attributes, so the stylesheet is shared. The props, `data-slot` and `data-variant` values are the same in both editions.

## Liquid glass

Liquid glass is experimental for Toggle, as for every glass component, and its findings do not block a release. See [liquid glass](liquid-glass.md).

See [primitives evidence](../evidence/primitives-075.md) for the specimen audit, the board comparison and the differences that remain.
