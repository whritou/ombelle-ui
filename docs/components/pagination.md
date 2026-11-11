# Pagination

Pagination presents caller-owned page destinations using a named native `nav`,
list and links. It does not fetch data or calculate page ranges. The same
template serves both primitive editions and does not require a client boundary
or a navigation runtime.

This component requires CLI **0.7.2** or later:
`npx @ombelle-ui/cli@0.7.2 add pagination`. For a built local checkout:

```powershell
pnpm exec node packages/cli/dist/main.js add pagination --cwd APP --dry-run --json
pnpm exec node packages/cli/dist/main.js add pagination --cwd APP --yes
```

## Compose page destinations

```tsx
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from '@/components/ui/pagination'

export function SearchPages() {
  return (
    <Pagination aria-label="Search result pages">
      <PaginationContent>
        <PaginationItem>
          <PaginationPrevious disabled />
        </PaginationItem>
        <PaginationItem>
          <PaginationLink href="?page=1" isActive aria-label="Page 1">
            1
          </PaginationLink>
        </PaginationItem>
        <PaginationItem>
          <PaginationLink href="?page=2" aria-label="Page 2">
            2
          </PaginationLink>
        </PaginationItem>
        <PaginationItem>
          <PaginationEllipsis />
        </PaginationItem>
        <PaginationItem>
          <PaginationLink href="?page=12" aria-label="Page 12">
            12
          </PaginationLink>
        </PaginationItem>
        <PaginationItem>
          <PaginationNext href="?page=2" />
        </PaginationItem>
      </PaginationContent>
    </Pagination>
  )
}
```

`Pagination` defaults to `aria-label="Pagination"`. Use a localized or
context-specific name, especially when the page has more than one navigation
landmark. Mark exactly one visible page link active. When navigation updates
results without a document load, the application owns focus placement, loading
feedback and announcements.

## API and disabled behavior

| Part                 | Native element | Props and purpose                                 |
| -------------------- | -------------- | ------------------------------------------------- |
| `Pagination`         | `nav`          | Named navigation landmark.                        |
| `PaginationContent`  | `ul`           | Wrapping list of page choices.                    |
| `PaginationItem`     | `li`           | A link or decorative gap.                         |
| `PaginationLink`     | `a`            | `isActive` and `disabled`, both false by default. |
| `PaginationPrevious` | `a`            | Link props, previous chevron and default text.    |
| `PaginationNext`     | `a`            | Link props, next chevron and default text.        |
| `PaginationEllipsis` | `span`         | Decorative marker for omitted page numbers.       |

All parts accept native props, React 19 refs, `className` and `style`.
`isActive` adds `aria-current="page"` and `data-active`. `disabled` adds
`aria-disabled="true"` and `data-disabled`, removes `href`, and sets
`tabIndex={-1}` even when callers supply a destination or a different tab index.
The component also omits caller click and auxiliary-click handlers on disabled
links. Applications should avoid attaching delegated navigation handlers to
disabled controls.

Previous and Next default to “Go to previous page” and “Go to next page” as
accessible names. Supply `aria-label` and children together to localize them.
Their arrows are decorative and mirror in RTL. Both reuse `pagination-link`,
with `data-direction="previous"` or `data-direction="next"`.

Ellipsis enforces `aria-hidden="true"`, `role="presentation"` and no tab stop.
It has no overflow interaction; render actual page links or compose an
independently named menu if omitted destinations need to be exposed.

## Variants (0.7.3)

These need CLI **0.7.3** or later, including in component recipes. Leaving a prop out renders what earlier releases render.

- **`PaginationCompact`**: previous, "Page 2 of 12" and next, for narrow tables and phones.
  - It goes inside `Pagination`, with `page`, `pageCount`, `previousHref` and `nextHref`.
  - `onPrevious` and `onNext` are click handlers.
  - With an href, each end is a link; with a handler alone, it is a button, so the keyboard can use it either way.
  - The ends are named "Previous page" and "Next page", and are disabled at the ends.
- **`PaginationPageSize`**: a labelled native select for rows per page.
  - Props: `value`, `options` (10, 25, 50 and 100 by default), `onValueChange`, `label` ("Rows per page") and `range`, a text such as "1–25 of 290".
  - Without `onValueChange`, `value` is only the initial choice, so it also renders from a server component.

## Style families

- Flat uses a filled primary active page.
- Minimalist underlines the active page without a filled surface.
- Neo brutalism uses outlined page tiles, offset ink shadows and an accent
  current page.
- Ombelle uses pill links and an ink-filled active page.
- Liquid glass is experimental: one glass list surface surrounds opaque active
  links. Missing backdrop-filter support and reduced transparency retain an
  opaque surface. Nested surfaces respect the shared glass filter variables.

Links have a minimum 44px logical target size, and the list wraps on narrow
screens. Focus outlines remain visible; forced colors use system colors for
links, current pages and disabled pages. Shadows and backdrop filters are
removed in forced colors. No motion is introduced.

Compilation emits `components/ui/pagination.tsx`, its stylesheet and a specimen.
Dependencies are React and the shared `clsx` / `tailwind-merge` utilities; no
Radix or Base UI package is needed for this component.
