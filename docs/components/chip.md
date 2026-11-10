# Chip

Chip is a compact token. A pressable chip is a filter that turns on and off; a static chip is a label, optionally with a remove button. ChipGroup names a row of chips. It is available in all five families in light and dark mode, in one template for both editions; the template is a client component.

This component requires CLI **0.7.3** or later. Until 0.7.3 is published, install it from a built local checkout:

```powershell
pnpm exec node packages/cli/dist/main.js add chip --cwd APP --dry-run --json
pnpm exec node packages/cli/dist/main.js add chip --cwd APP --yes
```

```tsx
import { Chip, ChipGroup, ChipRemove } from '@/components/ui/chip'

export function StatusFilters() {
  return (
    <ChipGroup aria-label="Status filter">
      <Chip defaultPressed>On track</Chip>
      <Chip defaultPressed={false}>Needs attention</Chip>
      <Chip defaultPressed={false}>Shipped</Chip>
    </ChipGroup>
  )
}

export function Topic({ onRemove }: { onRemove(): void }) {
  return <Chip>glass<ChipRemove onRemove={onRemove} /></Chip>
}
```

## API and accessibility

- A `Chip` with `pressed`, `defaultPressed` or `onPressedChange` is a toggle button with `aria-pressed`. A pressed chip shows a decorative check. `disabled` is also available.
- Any other `Chip` is a `span`.
- `ChipRemove` inside a static chip is a button named "Remove" plus the chip's text, such as "Remove glass". Pass `label` to name it otherwise. It calls `onRemove`, and its icon is decorative.
- `ChipGroup` is a `role="group"`. Name it with `aria-label` or `aria-labelledby`.
- The remove button is a 24px target, so a chip stays at least 28px tall.

## Recipe

The recipe editor sets `mode` (`pressable` or `removable`), the pressed chip ids, the group label, and one to six chips. Only chips in the recipe may be pressed.

Compilation emits `components/ui/chip.tsx`, `components/ui/chip.css` and `examples/chip.tsx`. Runtime dependencies are React 19.3.1, clsx 2.1.1, tailwind-merge 3.7.0 and lucide-react 1.55.0.

## Liquid glass

Liquid glass is experimental for Chip, as for every glass component, and its findings do not block a release. See [liquid glass](liquid-glass.md).

See [form controls evidence](../evidence/form-controls-073.md) for the board comparison and the specimen audit.
