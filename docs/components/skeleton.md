# Skeleton

Skeleton is a decorative placeholder shaped like the content that is loading. It is available in flat, minimalist, neo brutalism, and ombelle, in light and dark mode. Liquid glass is unavailable. It has no client boundary and no dependency beyond the shared utility.

## Install and compose

```powershell
pnpm exec node packages/cli/dist/main.js add skeleton --cwd APP --dry-run --json
pnpm exec node packages/cli/dist/main.js add skeleton --cwd APP --yes
```

```tsx
import { Skeleton } from '@/components/ui/skeleton'

export function LoadingProject() {
  return (
    <div aria-busy="true" aria-label="Loading project">
      <Skeleton shape="circle" />
      <Skeleton style={{ inlineSize: '60%' }} />
      <Skeleton />
      <Skeleton shape="block" />
    </div>
  )
}
```

Every Skeleton is `aria-hidden`. Mark the region that is loading with `aria-busy="true"` and an accessible name, and remove `aria-busy` when the content arrives. For long waits, also announce progress in text or with [Progress](progress.md).

## API

- `shape` is one of:
  - `text` (the default): a full-width line;
  - `circle`: an avatar placeholder;
  - `block`: a 6rem card or image area.
- Size placeholders with `style` or `className`, for example `style={{ inlineSize: '60%' }}`.
- Other `div` props and the ref are forwarded.

## Styles and artifacts

- Ombelle: pill lines and circles on the muted colour.
- Flat: softly rounded muted shapes.
- Minimalist: thin lines with a small radius.
- Neo brutalism: square shapes with a 2px ink border.

The pulse lasts ten times the preset's motion duration, so reduced-motion presets and the OS reduced-motion setting show still placeholders. In forced colors placeholders are `Canvas` with a `GrayText` border.

Compilation emits `components/ui/skeleton.tsx`, `components/ui/skeleton.css` and `examples/skeleton.tsx`. Skeleton adds no dependency versions.

See [the batch 4 verification record](../evidence/next-components-batch-4.md).
