# Progress

Progress shows how far a task has got, or that it is running when the amount is unknown, built on the reviewed Radix Progress primitive. It is available in flat, minimalist, neo brutalism, and ombelle, in light and dark mode. Liquid glass is experimental; see [Liquid glass](#liquid-glass). The template is a client component.

## Install and compose

```powershell
pnpm exec node packages/cli/dist/main.js add progress --cwd APP --dry-run --json
pnpm exec node packages/cli/dist/main.js add progress --cwd APP --yes
```

```tsx
import { Progress } from '@/components/ui/progress'

export function InstallProgress({ done, total }: { done: number; total: number }) {
  return (
    <>
      <p id="install-label">Installing components</p>
      <Progress value={done} max={total} aria-labelledby="install-label" />
    </>
  )
}
```

Name every bar with `aria-labelledby` or `aria-label`. Radix renders `role="progressbar"` with `aria-valuemin`, `aria-valuemax` and, when the amount is known, `aria-valuenow` and a value text. Pass `getValueLabel` for a custom announcement such as "3 of 8 checks". Show the visible figure, such as "64%", next to the label yourself.

## Variants (0.7.5)

These need CLI **0.7.5** or later, including in component recipes. Leaving a prop or part out renders what earlier releases render.

```tsx
import { Progress, ProgressLabel, ProgressValue } from '@/components/ui/progress'

<Progress value={64} size="lg" tone="success">
  <ProgressLabel>Publishing preset, on track</ProgressLabel>
  <ProgressValue />
</Progress>
```

- **`size`** (`sm`, `default` or `lg`) and **`tone`** (`default`, `success`, `warning` or `destructive`) set `data-size` and `data-tone` on the bar. `sm` is half the family's default track and `lg` one and a half times it. Tones use the same strong colours as Meter segments; in forced colours every tone fill is `Highlight`.
- **Tone is never the only signal.** Say the status in the label, as in "Upload failed at 35 %".
- **`ProgressLabel`** and **`ProgressValue`**, passed as children:
  - With either part, Progress renders a wrapper (`progress-field`) with a header row (`progress-header`: the label, then the value at the end) above the bar, because the bar's own children are presentational.
  - The bar takes `aria-labelledby` set to the label.
  - `ProgressValue` shows the rounded percentage ("64%"), or `format(value, max)` with the value clamped to `0`..`max`. It is `aria-hidden`; the bar's `aria-valuetext` carries the same text. While indeterminate it is empty and the bar has no `aria-valuetext`.
  - Without either part, Progress renders exactly as before.
  - `progressValueText(value, max, format?)` is exported for your own readouts.
- The header and readout inherit the surrounding text colour, so they add no contrast pair on glass.
- **Recipe:** `size`, `tone`, `showLabel` and `showValue` (booleans).

## API and states

- `value` is a number from 0 to `max` (default 100). Omit it, or pass `null`, for an indeterminate bar.
- The indicator width follows `value / max`, clamped to the range, as an inline `inline-size`, so it fills from the start edge in either text direction.
- Radix sets `data-state` to `loading`, `complete` (when `value` equals `max`) or `indeterminate`.
- Other Root props (`className`, `style`, `getValueLabel` and the ref) are forwarded.

## Styles and artifacts

- Ombelle: an outlined pill with a small offset shadow and a primary fill with an ink edge. The fill turns green when complete.
- Flat: a 10px muted track with a rounded primary fill, green when complete.
- Minimalist: a 2px hairline with an ink fill.
- Neo brutalism: a bordered bar with an offset shadow, a striped primary fill with an ink edge, and a green fill when complete.

The indeterminate segment sweeps along the track. Its duration is ten times the preset's motion duration, so reduced-motion presets and the OS reduced-motion setting hold it still at the start. Width changes animate the same way. In forced colors the track uses `Canvas` with a `CanvasText` border and the fill uses `Highlight`.

Compilation emits `components/ui/progress.tsx`, `components/ui/progress.css` and `examples/progress.tsx`. Runtime dependencies are exactly React 19.3.1, @radix-ui/react-progress 1.2.1 (MIT), clsx 2.1.1 and tailwind-merge 3.7.0.

See [the batch 4 verification record](../evidence/next-components-batch-4.md).

## Liquid glass

In liquid glass, the track is a 10px pill of `card` with 10% `foreground` at the glass opacity, as in the kit, with the glass edge and an inner shadow. The fill is solid `primary` with a gloss and a glow, complete is `#16A34A`, and indeterminate is a faded full fill with a sweep that stops under reduced motion. No text sits on the bar, so it adds no contrast pair. Reduced transparency and missing backdrop filters paint the track opaque; forced colours fill with `Highlight`. Installing it in a glass project needs `@ombelle-ui/cli` 0.5.0 or later. See [liquid glass](liquid-glass.md) for the contrast bound and fallbacks, and [glass display evidence](../evidence/glass-display.md) for screenshots.

## Base UI edition

Projects whose `components.json` uses one of shadcn's `base-*` styles receive a Progress built on `Progress.Root` and `Progress.Indicator` from `@base-ui/react/progress` (`@base-ui/react` 1.9.0) instead of `@radix-ui/react-progress`. `value`, `max`, labelling and `data-slot` values match the Radix edition; the indicator renders directly in the root, without Base UI's optional `Progress.Track`.

State bridge: the root and indicator carry `data-state` `loading`, `complete` or `indeterminate`, plus `data-value` and `data-max`, computed from `value` and `max` as Radix does. Base UI's own `data-progressing`, `data-complete` and `data-indeterminate` attributes remain. The template clears the inline `height: inherit` Base UI puts on the indicator, so the stylesheet sizes it. The Base UI edition has no allowed styling differences.
