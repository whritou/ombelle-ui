# Empty

Empty is a zero-data screen: optional media, a title, a description, then actions. It is available in all five families in light and dark mode, with Radix and Base UI editions and no client boundary.

This component requires CLI **0.7.3** or later: `npx @ombelle-ui/cli@0.7.3 add empty`. For a built local checkout:

```powershell
pnpm exec node packages/cli/dist/main.js add empty --cwd APP --dry-run --json
pnpm exec node packages/cli/dist/main.js add empty --cwd APP --yes
```

```tsx
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from '@/components/ui/empty'
import { Button } from '@/components/ui/button'
import { FolderIcon } from 'lucide-react'

export function NoPresets() {
  return (
    <Empty>
      <EmptyHeader>
        <EmptyMedia variant="icon">
          <FolderIcon aria-hidden="true" />
        </EmptyMedia>
        <EmptyTitle asChild>
          <h2>No presets yet</h2>
        </EmptyTitle>
        <EmptyDescription>Start from a built-in family or import a preset file.</EmptyDescription>
      </EmptyHeader>
      <EmptyContent>
        <Button variant="outline">Import file</Button>
        <Button>New preset</Button>
      </EmptyContent>
    </Empty>
  )
}
```

## API and accessibility

- `EmptyMedia` holds an illustration, or with `variant="icon"` an icon on a tile. Mark decorative icons `aria-hidden`.
- `EmptyTitle` is a `div`, not a heading, because the right level depends on the page. Pass `asChild` with the heading you need (Radix edition), or `render={<h2 />}` (Base UI edition).
- `EmptyContent` holds the actions. As on every 0.7.3 board, the secondary action comes first and the primary last.
- Every part forwards its props and ref and carries a `data-slot`.

## Recipe

The recipe editor sets `media` (`icon` or `none`), the title, the description and the two action labels; an empty secondary label drops that action. A recipe compiles only its own component, so its preview draws the actions as native buttons marked `data-empty-action="primary"` or `"secondary"`, styled like each family's Button. Compilation emits `components/ui/empty.tsx`, `components/ui/empty.css` and `examples/empty.tsx`. Runtime dependencies are React 19.3.1, clsx 2.1.1 and tailwind-merge 3.7.0, plus @radix-ui/react-slot 1.5.0 in the Radix edition or @base-ui/react 1.9.0 (for `useRender`) in the Base UI edition.

## Liquid glass

Liquid glass is experimental for Empty, as for every glass component, and its findings do not block a release. See [liquid glass](liquid-glass.md).

See [display components evidence](../evidence/display-components.md) for the board comparison and the specimen audit.
