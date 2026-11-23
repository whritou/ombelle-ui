# Sidebar

Sidebar is an app or docs sidebar. On desktop it collapses to a strip of icons or slides away; on phones it opens as a sheet; Ctrl or Cmd + B toggles it. It is available in all eight families in light and dark mode, with Radix and Base UI editions; the template is a client component.

This component requires CLI **0.9.0** or later: `npx @ombelle-ui/cli@0.9.0 add sidebar`. For a built local checkout:

```powershell
pnpm exec node packages/cli/dist/main.js add sidebar --cwd APP --dry-run --json
pnpm exec node packages/cli/dist/main.js add sidebar --cwd APP --yes
```

```tsx
import { Sidebar, SidebarContent, SidebarGroup, SidebarGroupContent, SidebarGroupLabel, SidebarInset, SidebarMenu, SidebarMenuButton, SidebarMenuItem, SidebarProvider, SidebarRail, SidebarTrigger } from '@/components/ui/sidebar'
import { FolderOpen, LayoutDashboard } from 'lucide-react'

export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <SidebarProvider>
      <Sidebar collapsible="icon" label="Workspace">
        <SidebarContent>
          <SidebarGroup>
            <SidebarGroupLabel>Workspace</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                <SidebarMenuItem><SidebarMenuButton href="/" isActive tooltip="Overview"><LayoutDashboard aria-hidden="true" /><span>Overview</span></SidebarMenuButton></SidebarMenuItem>
                <SidebarMenuItem><SidebarMenuButton href="/projects" tooltip="Projects"><FolderOpen aria-hidden="true" /><span>Projects</span></SidebarMenuButton></SidebarMenuItem>
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        </SidebarContent>
        <SidebarRail />
      </Sidebar>
      <SidebarInset><header><SidebarTrigger /></header>{children}</SidebarInset>
    </SidebarProvider>
  )
}
```

## API and accessibility

- `SidebarProvider` holds the state: `open`, `defaultOpen` and `onOpenChange`; `mobileBreakpoint` (768 px; it compares the width of the window the sidebar renders in, so lower it, or set 0, for a sidebar in a narrow frame such as a preview); `shortcut` (true: Ctrl or Cmd + B toggles the sidebar). The shortcut does nothing while focus is in an input, a textarea, a select or editable text, so it never steals Bold. `useSidebar()` returns `state`, `open`, `setOpen`, `openMobile`, `setOpenMobile`, `isMobile` and `toggleSidebar`.
- `Sidebar` takes `side` (`left` or `right`), `variant` (`sidebar`, `floating` or `inset`), `collapsible` (`offcanvas`, `icon` or `none`) and `label`, which names it as navigation and names the phone sheet. Slid away, it is inert.
- Collapsed to icons, item labels take no room and each item keeps its accessible name; its `tooltip` shows the name on hover and keyboard focus. Group labels, badges, actions, sub-menus and the search field hide.
- `SidebarMenuButton` is a link when it has an `href`, otherwise a button; `isActive` marks the current page with `aria-current="page"`. To render a framework link, such as Next's `Link`, pass it as the only child with `asChild` in the Radix edition, or as `render={<Link href="/docs" />}` in the Base UI edition. The composed link keeps its own props; class names and styles merge, both refs are set, and when the item and the link both have a handler for an event, the link's runs first, then the item's (Radix `Slot` in the Radix edition, the same merge by hand in the Base UI edition). Its props and `ref` are typed for the element rendered: button props by default, anchor props with `href`, and `HTMLElement` with `asChild` or `render`.
- `SidebarTrigger` toggles the sidebar, reports `aria-expanded` and points at the sidebar with `aria-controls` (the sidebar's `id`, or a generated one; on phones only while the sheet is open, since the closed sheet is not in the page). `SidebarRail` is a pointer-only edge that toggles it too; an `onClick` you pass runs first, and calling `event.preventDefault()` in it stops the toggle.
- On phones, after hydration, the sidebar renders in a modal sheet that keeps focus and closes when a link is followed. Before hydration, a CSS breakpoint at 768 px shows the sidebar's content inline above the page, so its links work without JavaScript; a slid-away sidebar becomes inert only after hydration. The CSS breakpoint applies before hydration only, so a different `mobileBreakpoint` decides the layout once the page has loaded.
- `SidebarInset` renders the page's `<main>`. Make it the only `main` on the page: put the layout at the top of the page, not inside your own `main`, or axe reports a nested and duplicate main landmark. To show a sidebar layout as a demo inside a page that already has a `main`, put the inset content in a `div data-slot="sidebar-inset"`, which takes the same look.
- Also exported: `SidebarHeader`, `SidebarContent`, `SidebarFooter`, `SidebarInput`, `SidebarGroup`, `SidebarGroupLabel`, `SidebarGroupAction`, `SidebarGroupContent`, `SidebarGroupCollapsible`, `SidebarGroupCollapsibleTrigger`, `SidebarGroupCollapsibleContent`, `SidebarMenu`, `SidebarMenuItem`, `SidebarMenuAction`, `SidebarMenuBadge`, `SidebarMenuSub`, `SidebarMenuSubItem` and `SidebarMenuSubButton`.

To keep the open state across visits, store it yourself:

```tsx
const [open, setOpen] = React.useState(() => localStorage.getItem('sidebar') !== 'closed')
<SidebarProvider open={open} onOpenChange={next => { setOpen(next); localStorage.setItem('sidebar', next ? 'open' : 'closed') }}>
```

## Recipe

The recipe sets `collapsible`, `side`, `variant`, the header label and up to three groups of up to eight items. Compilation emits `components/ui/sidebar.tsx`, `components/ui/sidebar.css` and `examples/sidebar.tsx`. Runtime dependencies are React 19.3.1, @radix-ui/react-dialog 1.3.1, @radix-ui/react-collapsible 1.2.1, @radix-ui/react-slot 1.5.0, @radix-ui/react-tooltip 1.4.1, clsx 2.1.1, tailwind-merge 3.7.0 and lucide-react 1.55.0. The sheet, tooltips, items, small buttons and search field repeat the family's Sheet, Tooltip, Dropdown Menu, Toolbar and Input styles under their own slots.

## Base UI edition

The Base UI edition uses `Dialog`, `Tooltip` and `Collapsible` from `@base-ui/react`. Base UI shows tooltips on keyboard focus and hover, not after a click.

## Liquid glass

Liquid glass is supported, without an accessibility guarantee.
