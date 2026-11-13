# Slider

Slider picks a value, or a range with two thumbs, along a track, with an optional row of tick labels. It is available in all five families in light and dark mode, with Radix and Base UI editions; the template is a client component.

This component requires CLI **0.7.3** or later: `npx @ombelle-ui/cli@0.7.3 add slider`. For a built local checkout:

```powershell
pnpm exec node packages/cli/dist/main.js add slider --cwd APP --dry-run --json
pnpm exec node packages/cli/dist/main.js add slider --cwd APP --yes
```

```tsx
import { Slider, SliderTicks } from '@/components/ui/slider'

export function Radius() {
  return <Slider defaultValue={[12]} max={24} aria-label="Border radius" getValueText={(value) => `${value} pixels`} />
}

export function PriceRange() {
  return (
    <>
      <Slider defaultValue={[20, 80]} thumbLabels={['Minimum price', 'Maximum price']} />
      <SliderTicks values={[0, 25, 50, 75, 100]} />
    </>
  )
}
```

## API and accessibility

- `value` or `defaultValue` is an array: one number gives one thumb, two give a range. `min` (default 0), `max` (default 100), `step` (default 1), `orientation`, `disabled`, `name`, `onValueChange` and `onValueCommit` work as in the primitive.
- Each thumb is a slider with its own name:
  - a single thumb takes the Slider's `aria-label` or `aria-labelledby`;
  - a range needs `thumbLabels`, one name per thumb.
- `getValueText(value, index)` sets each thumb's spoken value, such as "12 pixels".
- `aria-describedby` reaches every thumb. In the Radix edition `aria-invalid` does too; Base UI's thumb input takes no `aria-invalid`, and inside a Base UI Field the field sets it.
- Keyboard:
  - the arrow keys move one step;
  - Page Up and Page Down move a large step;
  - Home and End jump to the ends.
  In a Radix range, Home always moves the first thumb and End the last, whichever thumb has focus.
- Range thumbs keep their order and do not pass each other.
- `SliderTicks` (`values`, `min`, `max`) draws labelled marks under the track. It is hidden from assistive technology, since the thumbs carry the value.

## Variants (0.7.6)

`SliderValue` needs CLI **0.7.6** or later, including in component recipes. Leaving it out renders what earlier releases render.

```tsx
import { Slider, SliderValue } from '@/components/ui/slider'

<Slider defaultValue={[12]} max={48} aria-labelledby="radius-label" getValueText={(value) => `${value} px`}>
  <label id="radius-label">Radius</label>
  <SliderValue />
</Slider>
<Slider defaultValue={[0.75]} max={1} step={0.05} aria-labelledby="opacity-label">
  <label id="opacity-label">Shadow opacity</label>
  <SliderValue editable />
</Slider>
```

- **`SliderValue`** goes inside the Slider. The Slider then renders a field (`slider-field`) with a header row (`slider-header`: the other children, then the value at the end) above the track. Without it, the Slider renders exactly as before.
- The value is an `<output>` (`slider-value`) whose `for` names the thumbs. It shows `format(value, index)`, or `getValueText`, or the number; a range reads `20 – 80`. When the Slider has no `getValueText`, the thumbs speak `format` too. It is not a live region: the thumbs already announce their value.
- **`editable`** turns a single thumb's value into a text field (`slider-value-input`, 76 × 34 px, centred mono text, drawn like the family's Number Input), named by the Slider's own label:
  - Enter or leaving the field moves the thumb to the typed value, clamped to `min`..`max` and rounded to `step` (`0.33` with step 0.05 becomes 0.35); Enter keeps focus in the field;
  - text that is not a number, or an empty field, restores the current value; Escape restores it without moving the thumb;
  - dragging the thumb, or pressing on the track, updates the field.
  On a range, `editable` shows the readout instead.
- `stepValue(value, min, max, step)` is exported.
- **Recipe:** `valueDisplay` is `none`, `readout` or `editable`; `editable` is rejected with `mode: 'range'`.

## Recipe

The recipe editor sets `mode` (`single` or `range`), `min`, `max`, `step`, `ticks`, the single `value`, the `rangeStart` and `rangeEnd`, the label and the two thumb labels. A value outside the range, a range whose start passes its end, or a maximum not above the minimum is rejected.

Compilation emits `components/ui/slider.tsx`, `components/ui/slider.css` and `examples/slider.tsx`. Runtime dependencies are React 19.3.1, @radix-ui/react-slider 1.6.1 (MIT), clsx 2.1.1 and tailwind-merge 3.7.0. The Base UI edition uses @base-ui/react 1.9.0 instead of the Radix package.

## Base UI edition

The Base UI edition is built on `Slider.Root`, `Slider.Control`, `Slider.Track`, `Slider.Indicator` and `Slider.Thumb`. Each thumb wraps a native range input. Part names, `data-slot` values and the labelling props match the Radix edition.

## Liquid glass

Liquid glass is experimental for Slider, as for every glass component, and its findings do not block a release. See [liquid glass](liquid-glass.md).

See [form controls evidence](../evidence/form-controls-073.md) for the board comparison, the specimen audit and the browser tests.
