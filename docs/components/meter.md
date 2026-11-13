# Meter

Meter shows a measurement within a known range, such as a quota or storage use. For a task's progress, use [Progress](progress.md) instead. Meter draws a plain bar, discrete cells (segmented progress), or labelled parts with a legend. It is available in all five families in light and dark mode, with Radix and Base UI editions; the template is a client component.

This component requires CLI **0.7.3** or later: `npx @ombelle-ui/cli@0.7.3 add meter`. For a built local checkout:

```powershell
pnpm exec node packages/cli/dist/main.js add meter --cwd APP --dry-run --json
pnpm exec node packages/cli/dist/main.js add meter --cwd APP --yes
```

```tsx
import { Meter, MeterLabel, MeterLegend, MeterLegendItem, MeterSegment, MeterValue } from '@/components/ui/meter'

export function Deploys() {
  return (
    <Meter value={128} max={200} segments={10} warningAt={0.6}>
      <MeterLabel>Deploys this month</MeterLabel>
      <MeterValue />
    </Meter>
  )
}

export function Storage() {
  return (
    <Meter max={10}>
      <MeterLabel>Storage</MeterLabel>
      <MeterValue>7 / 10 GB</MeterValue>
      <MeterSegment value={4} tone="primary" />
      <MeterSegment value={2} tone="info" />
      <MeterSegment value={1} tone="success" />
      <MeterLegend>
        <MeterLegendItem tone="primary">Images</MeterLegendItem>
        <MeterLegendItem tone="info">Video</MeterLegendItem>
        <MeterLegendItem tone="success">Documents</MeterLegendItem>
      </MeterLegend>
    </Meter>
  )
}
```

## API and accessibility

- `max` is required; `min` and `value` default to 0. The value is clamped to the range.
- `segments` (2 to 20) switches to discrete cells. A cell lights once any part of it is reached, so 128 of 200 in ten cells lights seven. Lit cells past `warningAt`, a fraction from 0 to 1, carry `data-warning` and use the warning colour.
- With `MeterSegment` children, the value is the sum of the parts. Each part is drawn at its share of the range, and a remainder segment (`data-rest`) fills the rest. Tones are `primary`, `info`, `success` and `warning`. Colour alone carries no meaning, so name each part in a `MeterLegendItem` with the same tone.
- `MeterValue` shows the reading beside the label: `128 / 200` unless you pass children. It is visible text only; the meter's value text is separate.
- The track (`data-slot="meter-track"`) has `role="meter"` with `aria-valuenow`, `aria-valuemin`, `aria-valuemax` and `aria-valuetext`. The value text defaults to "128 of 200"; pass `aria-valuetext` to change it.
- A meter's children are presentational, so the label, value and legend sit beside the track, not inside it.
- `MeterLabel` names the track automatically. Without it, pass `aria-label` or `aria-labelledby` to `Meter`.
- The root carries `data-mode`: `bar`, `discrete` or `labelled`.

## Variants (0.7.6)

`shape` needs CLI **0.7.6** or later, including in component recipes. Leaving it out, or `shape="bar"`, renders what earlier releases render.

```tsx
<Meter shape="circle" value={72} max={100} aria-label="Storage used" />
```

- **`shape="circle"`** draws the total as a 72px ring (`meter-ring`, with `meter-ring-track` and `meter-ring-indicator`) inside the track, with the rounded percentage (`meter-ring-value`, 14px) in the centre. The ring and the number are `aria-hidden`; the track keeps `role="meter"`, its name and its value text ("72 of 100").
- Segmented and labelled meters draw their total as one ring: cells and parts are not drawn, and a legend stays below.
- Neo brutalism draws square ends; forced colours draw the ring in `Highlight` on a `GrayText` track.
- **Recipe:** `shape` (`bar` or `circle`), in both modes.

## Recipe

The recipe editor sets `mode` (`discrete` or `labelled`), `value`, `max`, `segments`, `warningPercent` (default 60), the label and up to four labelled parts. Compilation emits `components/ui/meter.tsx`, `components/ui/meter.css` and `examples/meter.tsx`. Runtime dependencies are React 19.3.1, clsx 2.1.1 and tailwind-merge 3.7.0, plus @base-ui/react 1.9.0 in the Base UI edition.

## Base UI edition

The Base UI edition renders the track with `Meter.Root` from `@base-ui/react/meter`, which supplies `role="meter"` and the value attributes. The Radix edition uses a plain element with the same ARIA. Parts, `data-slot` values, the value text and the cell rule are the same in both editions.

## Liquid glass

Liquid glass is experimental for Meter, as for every glass component, and its findings do not block a release. See [liquid glass](liquid-glass.md).

See [display components evidence](../evidence/display-components.md) for the board comparison and the specimen audit.
