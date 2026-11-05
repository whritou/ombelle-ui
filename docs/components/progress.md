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

In liquid glass, the track is a 10px pill of `card` with 10% `foreground` at half the glass opacity, with the glass edge and an inner shadow. The fill is solid `primary` with a gloss and a glow, complete is `#16A34A`, and indeterminate is a faded full fill with a sweep that stops under reduced motion. No text sits on the bar, so it adds no contrast pair. Reduced transparency and missing backdrop filters paint the track opaque; forced colours fill with `Highlight`. Installing it in a glass project needs `@ombelle-ui/cli` 0.5.0 or later. See [liquid glass](liquid-glass.md) for the contrast bound and fallbacks, and [glass display evidence](../evidence/glass-display.md) for screenshots.
