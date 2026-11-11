# Spinner

Spinner is a busy indicator: an SVG ring with a turning arc. It is available in all five families in light and dark mode, in one template for both editions, with no client boundary.

This component requires CLI **0.7.3** or later: `npx @ombelle-ui/cli@0.7.3 add spinner`. For a built local checkout:

```powershell
pnpm exec node packages/cli/dist/main.js add spinner --cwd APP --dry-run --json
pnpm exec node packages/cli/dist/main.js add spinner --cwd APP --yes
```

```tsx
import { Spinner } from '@/components/ui/spinner'
import { Button } from '@/components/ui/button'

export function Saving() {
  return <Spinner />
}

export function SaveButton({ saving }: { saving: boolean }) {
  return (
    <Button disabled={saving}>
      {saving && <Spinner size="sm" aria-hidden="true" />}
      Save
    </Button>
  )
}
```

## API and accessibility

- `size` is `sm`, `default` or `lg`, exposed as `data-size`.
- By default the spinner is `role="status"` named "Loading". Pass `aria-label` to rename it.
- Pass `aria-hidden="true"` when a labelled control around it already says what is happening; the spinner then has no role or name.
- Other SVG props, `className` and the ref are forwarded. The track carries `data-spinner-track` and the arc `data-spinner-arc`.

The arc turns once every 0.9 seconds. Under the OS reduced-motion setting it keeps turning, slowed to once every 3 seconds, because a spinner that stops looks like a hang. In forced colors the arc uses `CanvasText`.

## Recipe

The recipe editor sets `size` and the accessible label (default "Loading"). Compilation emits `components/ui/spinner.tsx`, `components/ui/spinner.css` and `examples/spinner.tsx`. Runtime dependencies are React 19.3.1, clsx 2.1.1 and tailwind-merge 3.7.0.

## Liquid glass

Liquid glass is experimental for Spinner, as for every glass component, and its findings do not block a release. See [liquid glass](liquid-glass.md).

See [display components evidence](../evidence/display-components.md) for the board comparison and the specimen audit.
