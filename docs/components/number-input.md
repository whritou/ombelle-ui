# Number Input

Number Input is a text field for a number, with decrement and increment buttons and an optional unit, such as a border radius in pixels or a duration in milliseconds. It is available in all five families in light and dark mode. One template serves both the Radix and the Base UI edition; it is a client component.

This component requires CLI **0.7.5** or later: `npx @ombelle-ui/cli@0.7.5 add number-input`. For a built local checkout:

```powershell
pnpm exec node packages/cli/dist/main.js add number-input --cwd APP --dry-run --json
pnpm exec node packages/cli/dist/main.js add number-input --cwd APP --yes
```

```tsx
import { NumberInput } from '@/components/ui/number-input'

export function Radius() {
  return (
    <>
      <label htmlFor="radius">Border radius</label>
      <NumberInput id="radius" name="radius" defaultValue={12} min={0} max={32} unit="px"
        onValueChange={(value, { text, valid }) => console.log(value, text, valid)} />
    </>
  )
}
```

## API and accessibility

- `value` or `defaultValue` is a `number`, or `null` for an empty field. `onValueChange(value, { text, valid })` fires on every edit. `value` is `null` when the text is empty or does not parse, and `text` is always the raw text.
- `text` takes the place of `value` for an editor that stores what was typed. The field shows that text as it is, such as `1.` or `-` restored after a reload, an undo or a redo, and reads the number from it.
- `min`, `max`, `step` (default 1) and `largeStep` (default 10) set the range and the steps. `unit` is shown after the number. `id`, `name`, `placeholder`, `disabled` and the `aria-*` props go to the input, so a `<label htmlFor>` or Field names it. `className` goes to the outer box.
- The input is a text field with `inputMode="decimal"` and `role="spinbutton"`. It has `aria-valuenow`, `aria-valuemin` and `aria-valuemax`. Its `aria-valuetext` adds the unit, such as "12 pixels". `px`, `ms`, `%` and `deg` have spoken names, and any other unit is read as written.
- Arrow Up and Arrow Down move one `step`. Shift with an arrow, Page Up and Page Down move one `largeStep`. Home and End go to `min` and `max`. Stepping stays within the range.
- Typed text such as `1.`, `-` or `12a` stays in the field and is reported with `valid: false`. Text that does not parse, or a number outside the range, gets `aria-invalid` when the field loses focus. The field never clamps or rewrites what was typed. An `aria-invalid` you pass takes precedence.
- When a controlled `value` changes from outside, the text follows, except while the field has focus and its text already spells that value. This is how `1.` survives a parent that stores `1`.
- The steppers are named "Decrease <label>" and "Increase <label>", from the input's `aria-label` or its label element. Use `decrementLabel` and `incrementLabel` to change the names. They are left out of the Tab order (`tabIndex={-1}`) because the arrow keys cover keyboard use. They are disabled at the bounds and are at least 24 × 24 px.
- With `name`, the form submits the field's text.

## Recipe

The recipe editor sets `min`, `max`, `step`, `unit` (`none`, `px`, `ms`, `%` or `deg`) and `value`, and the label and hint. The defaults follow the 0.7.5 board: "Border radius", 0 to 32 px, value 12. Recipe values are integers. A recipe is rejected when `min` is greater than `max`, when the value is outside the range, or when the label is blank. Compilation emits `components/ui/number-input.tsx`, `components/ui/number-input.css` and `examples/number-input.tsx`. Runtime dependencies are React 19.3.1, clsx 2.1.1, tailwind-merge 3.7.0 and lucide-react 1.55.0.

## Base UI edition

Number Input has no primitive, so the Base UI edition installs the same template. It is not Base UI `NumberField`, so a half-typed value behaves the same in both editions.

## Liquid glass

Liquid glass is experimental for Number Input, as for every glass component, and its findings do not block a release. See [liquid glass](liquid-glass.md).

See [editor inputs evidence](../evidence/editor-inputs-075.md) for the tests, the specimen audit and the board comparison.
