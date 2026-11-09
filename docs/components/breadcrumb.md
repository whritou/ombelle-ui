# Breadcrumb

Breadcrumb shows a page's place in a hierarchy using a named native `nav`, an
ordered list and links. The current page is a noninteractive span with
`aria-current="page"`. The same template serves both primitive editions and
does not require a client boundary or a navigation runtime.

This component is implemented in the local source catalog. Its website minimum
CLI is **0.7.2**, pending a separate release; published CLI 0.7.1 does not install
it. For a built local checkout:

```powershell
pnpm exec node packages/cli/dist/main.js add breadcrumb --cwd APP --dry-run --json
pnpm exec node packages/cli/dist/main.js add breadcrumb --cwd APP --yes
```

## Compose a trail

```tsx
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb'

export function ComponentTrail() {
  return (
    <Breadcrumb>
      <BreadcrumbList>
        <BreadcrumbItem>
          <BreadcrumbLink href="/docs">Docs</BreadcrumbLink>
        </BreadcrumbItem>
        <BreadcrumbSeparator />
        <BreadcrumbItem>
          <BreadcrumbLink href="/docs/components">Components</BreadcrumbLink>
        </BreadcrumbItem>
        <BreadcrumbSeparator />
        <BreadcrumbItem>
          <BreadcrumbPage>Breadcrumb</BreadcrumbPage>
        </BreadcrumbItem>
      </BreadcrumbList>
    </Breadcrumb>
  )
}
```

`Breadcrumb` defaults to `aria-label="Breadcrumb"`; replace it with a localized
name or use `aria-labelledby` for a visible label. Give multiple navigation
landmarks distinct names. Use `BreadcrumbPage` once, for the final page.

## API

| Part                  | Native element | Purpose                                            |
| --------------------- | -------------- | -------------------------------------------------- |
| `Breadcrumb`          | `nav`          | Named navigation landmark.                         |
| `BreadcrumbList`      | `ol`           | Ordered trail, with wrapping for narrow layouts.   |
| `BreadcrumbItem`      | `li`           | A link, current page, or overflow control.         |
| `BreadcrumbLink`      | `a`            | Caller-owned `href`, routing and link attributes.  |
| `BreadcrumbPage`      | `span`         | Current page with enforced `aria-current="page"`.  |
| `BreadcrumbSeparator` | `li`           | Decorative chevron; custom children replace it.    |
| `BreadcrumbEllipsis`  | `span`         | Decorative overflow marker, placed inside an item. |

All parts accept their native props, React 19 refs, `className` and `style`.
Separators and ellipses enforce `role="presentation"` and `aria-hidden="true"`
and do not enter the tab order. They are decoration, so do not put interactive
content inside them. Chevron direction follows inherited `dir="rtl"`.

## Overflow composition

`BreadcrumbEllipsis` alone does not reveal omitted pages. If visitors need those
destinations, compose a real menu trigger inside `BreadcrumbItem`, using the
installed Dropdown Menu parts:

```tsx
<BreadcrumbItem>
  <DropdownMenu>
    <DropdownMenuTrigger aria-label="Show parent pages">
      <BreadcrumbEllipsis />
    </DropdownMenuTrigger>
    <DropdownMenuContent>
      <DropdownMenuItem asChild>
        <a href="/docs/guides">Guides</a>
      </DropdownMenuItem>
    </DropdownMenuContent>
  </DropdownMenu>
</BreadcrumbItem>
```

This example uses Radix composition (`asChild`). Use the Base UI edition's
`render` composition for the linked menu item. The trigger's accessible name
belongs on the trigger, because the ellipsis is hidden from accessibility APIs.
The menu supplies its own keyboard behavior and focus management.

## Style families

- Flat uses a quiet muted current-page surface.
- Minimalist removes inline padding and highlights the trail with typography.
- Neo brutalism uses outlined links and an accent current page with offset ink.
- Ombelle uses pill links and an ink-filled current page.
- Liquid glass is experimental: a glass trail surface with an opaque current
  page. Missing backdrop-filter support and reduced transparency retain an
  opaque surface. Nested surfaces respect the shared glass filter variables.

Styles use logical sizing and spacing, wrap long labels, and keep visible link
focus outlines. Forced colors use system link and canvas colors; shadows and
backdrop filters are removed. No motion is introduced.

Compilation emits `components/ui/breadcrumb.tsx`, its stylesheet and a specimen.
Dependencies are React and the shared `clsx` / `tailwind-merge` utilities; no
Radix or Base UI package is needed for this component.
