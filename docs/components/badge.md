# Badge

Badge displays a short status or category as a native `span`. It is available in flat, minimalist, neo brutalism, and ombelle, in light and dark mode. Use descriptive text such as “Needs attention” so a destructive state does not rely on color alone. Interactive tags or filters need a real button or link.

## Install and use

Initialize the project with a local preset, then install using the private built CLI:

```powershell
pnpm exec node packages/cli/dist/main.js add badge --cwd APP --dry-run --json
pnpm exec node packages/cli/dist/main.js add badge --cwd APP --yes
```

```tsx
import { Badge, BadgeDot } from '@/components/ui/badge'

export function Status() {
  return <>
    <Badge><BadgeDot />Synced</Badge>
    <Badge size="sm" variant="secondary">Draft</Badge>
    <Badge variant="destructive">Needs attention</Badge>
  </>
}
```

`BadgeProps` extends native span props, including `children`, `className`, `style`, attributes, and React 19's `ref`. `variant` accepts `default` (the default), `secondary`, `outline`, `accent` or `destructive`. `size` accepts `default` (the default) or `sm`, exposed as `data-size`. Default size preserves each family's existing badge dimensions; small uses a 1.25rem minimum block size, 0.375rem inline padding and 0.625rem text. There is no interactive composition API or client boundary. Text is rendered as React children, without HTML interpolation.

`BadgeDot` is an optional decorative span with `data-slot="badge-dot"` and
`aria-hidden="true"`. It inherits the badge's text color and is spaced from its
siblings when composed as a direct child. Keep meaningful status text visible:
the dot adds no status role, live region, interaction or automatic semantics.
It accepts native span props, classes and React 19 refs; its decorative ARIA
marker remains owned by the component. Forced colors paint it with `CanvasText`.
Size and dot composition require the planned CLI 0.7.2 source; published CLI
0.7.1 does not include them.

The default variant uses each family's existing primary or secondary color pair; destructive uses the destructive treatment. Radius, border width, font, and neo brutalist shadows use the saved preset's design tokens. Long text wraps within its container. Forced colors use system colors and a double border for the destructive variant. Liquid glass is experimental and keeps its solid badge fills; the small size and dot add no backdrop filtering.

## Generated files and ownership

The compiler emits `components/ui/badge.tsx`, colocated `badge.css`, and `examples/badge.tsx`, plus the shared utility and existing theme artifacts. The installer applies the configured component, utility, and usage paths. Importing Badge loads its CSS. Keep that CSS import when moving the source.

Badge adds no new dependency versions: its production requirements are React 19.3.1, clsx 2.1.1, and tailwind-merge 3.7.0. Generated source has no Ombelle runtime dependency. The standard registry item contains the component, utility, and exact CSS bytes.

The colocated stylesheet avoids changing the shared family stylesheet or existing component artifacts when adding Badge. Its source and CSS have independent ownership hashes: identical repeats are no-ops, and local edits to either file conflict even with `--yes`. Dry-run performs no writes. Other installation, dependency, path, and recovery rules are unchanged.

Badge uses the project's global preset. A theme operation can change its semantic token values; it does not rewrite the installed family's Badge stylesheet. Switching that source styling requires an explicit migration. Variant and size are component props and can be recorded in component recipes; a status dot is composed as a child.

This is one catalog slice toward M2. It does not award stable status to the twelve-component catalog, certify arbitrary preset colors, or replace application accessibility review. See the [Badge verification record](../evidence/badge.md) for the measured scope.
