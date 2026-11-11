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
- `TableProps` adds `density?: 'default' | 'compact'` (default `default`) and `striped?: boolean` (default `false`). These become `data-density` and the optional presence marker `data-striped` on the native table, not the scroll container.
- `TableCaption`, `TableHeader`, `TableBody`, `TableFooter` and `TableCell` forward native `caption`, `thead`, `tbody`, `tfoot` and `td` props.
- `TableHead` renders a `th` with `scope="col"` by default. Pass `scope="row"` for row headers.
- `numeric` on `TableHead` and `TableCell` right-aligns the cell in tabular, monospaced digits.
- `selected` on `TableRow` sets `data-state="selected"` and highlights the row. It is visual only: pair it with a visible control such as a Checkbox so the selection is perceivable without colour and operable by keyboard.

## Variants (0.7.3)

These need CLI **0.7.3** or later, including in component recipes. Leaving a prop out renders what earlier releases render.

- **`stickyHeader`**: keeps the header in view while the rows scroll.
  - The rows scroll inside the table's container, whose height is at most `maxBlockSize` (24rem by default).
  - The header cells stay on top, on the table's surface.
- **Sorting**:
  - `TableHead sort` (`ascending`, `descending` or `none`) sets `aria-sort` on the header.
  - With `onSort`, the header becomes a button with an arrow, and a click calls `onSort`. Sorting the rows is yours.
  - Without `onSort`, a sorted column states its order but has no button.
- **Actions column**:
  - `TableHead actions` and `TableCell actions` make a narrow column at the end.
  - An empty actions header is named "Actions" with visually hidden text.
  - Name each row's button after its row, for example "Actions for Website refresh".
- **Loading**:
  - `Table loading` marks the table `aria-busy`.
  - `<TableSkeletonRows rows={3} columns={4} />` stands in for the rows with decorative bars, which pulse unless reduced motion is set.
- **Dependency**: Table now depends on lucide-react, for the sort arrows.

## Styles and artifacts

Use `<Table density="compact" striped>` for a denser data view. Compact reduces
header and body/footer cell padding to `0.375rem` vertically and `0.625rem`
logically inline, keeping native table semantics and the existing typography.
Striping fills alternating body rows with the muted surface. It does not affect
the header, footer or selected rows, so the selected treatment retains priority.
The options work independently in every family and do not change the default
table appearance. When rows contain interactive controls, preserve adequate
target sizes for those controls in the consuming application.

In forced colors, optional stripes become the system canvas while selected rows
retain `Highlight` and `HighlightText`. Experimental glass stripes use an opaque
muted fill; the container retains its existing opaque and reduced-transparency
fallbacks. These props require CLI 0.7.2 or later.

- Ombelle: an outlined card with a muted uppercase header, hairline row dividers and an accent selected row.
- Flat: a 1px inset frame, a filled header and a secondary selected row.
- Minimalist: no frame, an ink rule under the header and hairlines between rows. The selected row is muted, with a 2px ink bar on its leading edge that follows the text direction.
- Neo brutalism: a bordered card with an offset shadow, a primary header, ruled columns and rows, and a secondary selected row.

In forced colors the rules and frame use `CanvasText`, and the selected row uses `Highlight` and `HighlightText`.

Compilation emits `components/ui/table.tsx`, `components/ui/table.css` and `examples/table.tsx`. Table adds no dependency versions.

See [the batch 3 verification record](../evidence/next-components-batch-3.md).

## Liquid glass

In liquid glass, the container is one card glass surface with the glass edge and a drop shadow, and rows are separated by hairlines. The header is `muted` glass with `mutedForeground` labels at 12px / 600; it paints at the full nested glass opacity, denser than the design kit's overlay, so the declared `muted` pair describes it. A selected row mixes 12% `primary` into the card at the same nested coverage and keeps `foreground` text, a declared contrast pair. Reduced transparency and missing backdrop filters paint every surface opaque; in forced colours a selected row is `Highlight` with `HighlightText` at weight 600. Installing it in a glass project needs `@ombelle-ui/cli` 0.5.0 or later. See [liquid glass](liquid-glass.md) for the contrast bound and fallbacks, and [glass display evidence](../evidence/glass-display.md) for screenshots.
