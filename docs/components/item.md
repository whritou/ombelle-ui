# Item

Item is a row of media, text and actions, such as a preset in a list. For a table of records use [Table](table.md). It is available in all five families in light and dark mode. One template serves both editions.

This component requires CLI **0.7.5** or later: `npx @ombelle-ui/cli@0.7.5 add item`. For a built local checkout:

```powershell
pnpm exec node packages/cli/dist/main.js add item --cwd APP --dry-run --json
pnpm exec node packages/cli/dist/main.js add item --cwd APP --yes
```

```tsx
import { Item, ItemActions, ItemContent, ItemDescription, ItemGroup, ItemMedia, ItemTitle } from '@/components/ui/item'

export function Presets() {
  return (
    <ItemGroup aria-label="Presets">
      <Item variant="outline">
        <ItemMedia variant="icon" aria-hidden="true">O</ItemMedia>
        <ItemContent>
          <ItemTitle>Ombelle</ItemTitle>
          <ItemDescription>Built-in · stable in light and dark</ItemDescription>
        </ItemContent>
        <ItemActions>
          <button type="button">Apply</button>
        </ItemActions>
      </Item>
      <Item variant="muted" asChild>
        <a href="/presets/studio-warm">
          <ItemContent>
            <ItemTitle>Studio warm</ItemTitle>
            <ItemDescription>Your preset · edited 2 h ago</ItemDescription>
          </ItemContent>
        </a>
      </Item>
    </ItemGroup>
  )
}
```

## API and accessibility

- `variant` is `default`, `outline` or `muted`; `size` is `default` or `sm`. They appear as `data-variant` and `data-size`.
- Parts: `Item`, `ItemGroup`, `ItemSeparator`, `ItemMedia` (`variant` `default`, `icon` or `image`), `ItemContent`, `ItemTitle`, `ItemDescription` and `ItemActions`.
- With `asChild`, the first element child that is not `ItemActions` (usually a link) becomes the row. It is cloned, with no dependency, so it keeps its `link` role.
- `ItemActions` inside an `asChild` Item stay outside the link as its siblings, so a button is never nested in a link. The link then takes `data-item-link`.
- `ItemGroup` is a `div` with `role="list"`. It wraps each `Item` and `ItemSeparator` child in a `div` with `role="listitem"`, so a link Item keeps its link role and the list stays valid. Name the group with `aria-label`.
- Every Item link is a keyboard stop, with its focus ring drawn on the link.
- Give an icon or initial in `ItemMedia` `aria-hidden="true"` when the title already names the row.

## Recipe

The recipe editor sets `variant` (default outline), `size`, `media` (`none`, `icon` or `image`), whether to show an action, and the title and description. Compilation emits `components/ui/item.tsx`, `components/ui/item.css` and `examples/item.tsx`. Runtime dependencies are React 19.3.1, clsx 2.1.1 and tailwind-merge 3.7.0.

## Base UI edition

Item has no Base UI-specific template. Its `asChild` clones the child element instead of using a Slot, so both editions use the same file and no extra dependency.

## Liquid glass

Liquid glass is experimental for Item, as for every glass component, and its findings do not block a release. See [liquid glass](liquid-glass.md).

See [primitives evidence](../evidence/primitives-075.md) for the specimen audit, the board comparison and the differences that remain.
