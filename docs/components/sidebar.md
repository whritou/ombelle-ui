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

- `SidebarProvider` holds the state: `open`, `defaultOpen` and `onOpenChange`; `mobileBreakpoint` (768 px); `shortcut` (true: Ctrl or Cmd + B toggles the sidebar). The shortcut does nothing while focus is in an input, a textarea, a select or editable text, so it never steals Bold. `useSidebar()` returns `state`, `open`, `setOpen`, `openMobile`, `setOpenMobile`, `isMobile` and `toggleSidebar`.
- `Sidebar` takes `side` (`left` or `right`), `variant` (`sidebar`, `floating` or `inset`), `collapsible` (`offcanvas`, `icon` or `none`) and `label`, which names it as navigation and names the phone sheet. Slid away, it is inert.
- Collapsed to icons, item labels take no room and each item keeps its accessible name; its `tooltip` shows the name on hover and keyboard focus. Group labels, badges, actions, sub-menus and the search field hide.
- `SidebarMenuButton` is a link when it has an `href`, otherwise a button; `isActive` marks the current page with `aria-current="page"`. To render a framework link, such as Next's `Link`, pass it as the only child with `asChild` in the Radix edition, or as `render={<Link href="/docs" />}` in the Base UI edition.
- `SidebarTrigger` toggles the sidebar and reports `aria-expanded`; `SidebarRail` is a pointer-only edge that toggles it too.
- On phones, after hydration, the sidebar renders in a modal sheet that keeps focus and closes when a link is followed. Before hydration, a CSS breakpoint at 768 px shows the sidebar's content inline above the page, so its links work without JavaScript; a slid-away sidebar becomes inert only after hydration. The CSS breakpoint applies before hydration only, so a different `mobileBreakpoint` decides the layout once the page has loaded.
- Also exported: `SidebarHeader`, `SidebarContent`, `SidebarFooter`, `SidebarInput`, `SidebarGroup`, `SidebarGroupLabel`, `SidebarGroupAction`, `SidebarGroupContent`, `SidebarGroupCollapsible`, `SidebarGroupCollapsibleTrigger`, `SidebarGroupCollapsibleContent`, `SidebarMenu`, `SidebarMenuItem`, `SidebarMenuAction`, `SidebarMenuBadge`, `SidebarMenuSub`, `SidebarMenuSubItem` and `SidebarMenuSubButton`.

To keep the open state across visits, store it yourself:

```tsx
const [open, setOpen] = React.useState(() => localStorage.getItem('sidebar') !== 'closed')
<SidebarProvider open={open} onOpenChange={next => { setOpen(next); localStorage.setItem('sidebar', next ? 'open' : 'closed') }}>
```

## Recipe

The recipe sets `collapsible`, `side`, `variant`, the header label and up to three groups of up to eight items. Compilation emits `components/ui/sidebar.tsx`, `components/ui/sidebar.css` and `examples/sidebar.tsx`. Runtime dependencies are React 19.3.1, @radix-ui/react-dialog 1.3.1, @radix-ui/react-collapsible 1.2.1, @radix-ui/react-tooltip 1.4.1, clsx 2.1.1, tailwind-merge 3.7.0 and lucide-react 1.55.0. The sheet, tooltips, items, small buttons and search field repeat the family's Sheet, Tooltip, Dropdown Menu, Toolbar and Input styles under their own slots.

## Base UI edition

The Base UI edition uses `Dialog`, `Tooltip` and `Collapsible` from `@base-ui/react`. Base UI shows tooltips on keyboard focus and hover, not after a click.

## Liquid glass

Liquid glass support is experimental.
