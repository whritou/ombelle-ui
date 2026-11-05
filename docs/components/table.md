# Table

Table styles a native HTML table for tabular data. It provides a header, a footer, a caption, right-aligned numeric columns and a selected-row state, all inside a container that scrolls horizontally when the table is wider than its space. It is available in flat, minimalist, neo brutalism, and ombelle, in light and dark mode. Liquid glass is experimental; see [Liquid glass](#liquid-glass). It has no client boundary and no dependency beyond the shared utility.

## Install and compose

```powershell
pnpm exec node packages/cli/dist/main.js add table --cwd APP --dry-run --json
pnpm exec node packages/cli/dist/main.js add table --cwd APP --yes
```

```tsx
import {
  Table, TableCaption, TableHeader, TableBody, TableFooter, TableRow, TableHead, TableCell,
} from '@/components/ui/table'

export function Projects() {
  return (
    <Table>
      <TableCaption>4 of 12 projects</TableCaption>
      <TableHeader>
        <TableRow>
          <TableHead>Project</TableHead>
          <TableHead numeric>Components</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        <TableRow selected>
          <TableCell>Billing migration</TableCell>
          <TableCell numeric>5</TableCell>
        </TableRow>
      </TableBody>
      <TableFooter>
        <TableRow><TableCell>Total</TableCell><TableCell numeric>5</TableCell></TableRow>
      </TableFooter>
    </Table>
  )
}
```

Name every table with `TableCaption` or an `aria-label` on `Table`. Native table semantics give screen readers row and column navigation and header announcements.

## API

- `Table` renders `<div data-slot="table-container"><table>`. Props, including `aria-label`, `className` and the ref, go to the `table`.
- `TableCaption`, `TableHeader`, `TableBody`, `TableFooter` and `TableCell` forward native `caption`, `thead`, `tbody`, `tfoot` and `td` props.
- `TableHead` renders a `th` with `scope="col"` by default. Pass `scope="row"` for row headers.
- `numeric` on `TableHead` and `TableCell` right-aligns the cell in tabular, monospaced digits.
- `selected` on `TableRow` sets `data-state="selected"` and highlights the row. It is visual only: pair it with a visible control such as a Checkbox so the selection is perceivable without colour and operable by keyboard.

## Styles and artifacts

- Ombelle: an outlined card with a muted uppercase header, hairline row dividers and an accent selected row.
- Flat: a 1px inset frame, a filled header and a secondary selected row.
- Minimalist: no frame, an ink rule under the header and hairlines between rows. The selected row is muted, with a 2px ink bar on its leading edge that follows the text direction.
- Neo brutalism: a bordered card with an offset shadow, a primary header, ruled columns and rows, and a secondary selected row.

In forced colors the rules and frame use `CanvasText`, and the selected row uses `Highlight` and `HighlightText`.

Compilation emits `components/ui/table.tsx`, `components/ui/table.css` and `examples/table.tsx`. Table adds no dependency versions.

See [the batch 3 verification record](../evidence/next-components-batch-3.md).

## Liquid glass

In liquid glass, the container is one card glass surface with the glass edge and a drop shadow, and rows are separated by hairlines. The header is `muted` glass with `mutedForeground` labels at 12px / 600; it paints at the full nested glass opacity, denser than the design kit's overlay, so the declared `muted` pair describes it. A selected row mixes 12% `primary` into the card at the same nested coverage and keeps `foreground` text, a declared contrast pair. Reduced transparency and missing backdrop filters paint every surface opaque; in forced colours a selected row is `Highlight` with `HighlightText` at weight 600. Installing it in a glass project needs `@ombelle-ui/cli` 0.5.0 or later. See [liquid glass](liquid-glass.md) for the contrast bound and fallbacks, and [glass display evidence](../evidence/glass-display.md) for screenshots.
