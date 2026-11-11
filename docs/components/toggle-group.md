# Toggle Group

Toggle Group is a row of toggle buttons with one Tab stop. A single choice is a segmented control, such as a theme or density picker. Several choices make a toolbar, such as text formatting. It is available in all five families in light and dark mode, with Radix and Base UI editions; the template is a client component.

This component requires CLI **0.7.3** or later. Until 0.7.3 is published, install it from a built local checkout:

```powershell
pnpm exec node packages/cli/dist/main.js add toggle-group --cwd APP --dry-run --json
pnpm exec node packages/cli/dist/main.js add toggle-group --cwd APP --yes
```

```tsx
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
import { BoldIcon, ItalicIcon } from 'lucide-react'

export function CalendarView() {
  return (
    <ToggleGroup type="single" defaultValue="week" aria-label="Calendar view">
      <ToggleGroupItem value="day">Day</ToggleGroupItem>
      <ToggleGroupItem value="week">Week</ToggleGroupItem>
      <ToggleGroupItem value="month">Month</ToggleGroupItem>
    </ToggleGroup>
  )
}

export function Formatting() {
  return (
    <ToggleGroup type="multiple" variant="toolbar" aria-label="Text formatting">
      <ToggleGroupItem value="bold" aria-label="Bold"><BoldIcon aria-hidden="true" /></ToggleGroupItem>
      <ToggleGroupItem value="italic" aria-label="Italic"><ItalicIcon aria-hidden="true" /></ToggleGroupItem>
    </ToggleGroup>
  )
}
```

## API and accessibility

- `type` is `single` or `multiple`. With `single`, `value` and `defaultValue` are a string; with `multiple`, an array.
- `variant` is `segmented` (one bar with a raised selected item, the default) or `toolbar` (separate square buttons). `orientation` and `disabled` are also available.
- `type="single"` is a radio group: each item is a radio with `aria-checked`.
- `type="multiple"` is a toolbar of pressed buttons (`aria-pressed`).
- Name the group with `aria-label` or `aria-labelledby`, and give an icon-only item an `aria-label`.
- The group takes one Tab stop. The arrow keys move focus between items, and Space or Enter selects. Arrows move focus without selecting, unlike a strict ARIA radio group.
- Activating the checked item of a single group again clears the choice: `onValueChange` receives `''`. Ignore that value when the group must always have a choice.

## Recipe

The recipe editor sets `type`, `variant`, the selected item ids, the group label, and two to six items (`label`, and `iconOnly`, which names the item by its label). A single group may select at most one item, and only items in the recipe.

Compilation emits `components/ui/toggle-group.tsx`, `components/ui/toggle-group.css` and `examples/toggle-group.tsx`. Runtime dependencies are React 19.3.1, @radix-ui/react-toggle-group 1.2.1 (MIT), clsx 2.1.1 and tailwind-merge 3.7.0. The Base UI edition uses @base-ui/react 1.9.0 instead of the Radix package.

## Base UI edition

The Base UI edition is built on `ToggleGroup` and `Toggle`. Base UI renders pressed buttons in a group, so the template sets the roles itself, so both editions announce the same:
- `radiogroup`, with `radio` items and `aria-checked`, for a single choice;
- `toolbar` for several choices.

The string value of a single group is mapped onto Base UI's array value.

## Liquid glass

Liquid glass is experimental for Toggle Group, as for every glass component, and its findings do not block a release. See [liquid glass](liquid-glass.md).

See [form controls evidence](../evidence/form-controls-073.md) for the board comparison, the specimen audit and the browser tests.
