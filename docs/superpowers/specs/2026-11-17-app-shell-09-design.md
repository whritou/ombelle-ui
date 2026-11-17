# 0.9 app shell: Sidebar, Navigation Menu, Resizable, Data Table, Menubar and Prose, and the website rebuilt on them

0.9 adds the six app shell components to the catalog, in both editions (Radix and Base UI) and all eight style families. It then rebuilds the website's own header, docs and component navigation, editor layout and support tables on them. The work is done in two tracks: the catalog first, then the site.

## Intent

The 0.9 design artifact (https://claude.ai/artifact/1FMRGWoyJSwht9wATT838U) has one page per family, "0.9 app shell — <Family>". Each page has two boards:

- `project/<Family>09Shell.dc.html`: Sidebar, Navigation Menu and Resizable, each shown as a working example, with a light half above a dark half.
- `project/<Family>09Data.dc.html`: Data Table, Menubar and Typography / Prose, followed by "What the CLI writes", "Install step by step", "Keyboard" and "Props" panels.

The content is the same in every family; only the styling changes. The boards are the visual source of truth. Their docs copy (file lists, version numbers, counts) is illustrative, not a contract.

The roadmap (stated 13 November 2026) gives 0.9 the app shell, after 0.8's style families and before 1.0's blocks. These components are what an app needs around its content. The Ombelle website is the first real app built on them, so rebuilding the site proves they hold up under real use.

Decisions taken in brainstorming (17 November 2026):

- **The site is rebuilt on the new components.** The site's own header, sidebars, editor layout and tables are replaced, not only documented with new component pages.
- **The editor's top bar becomes a File / Edit / View menubar.** On desktop, the preview controls (mode, width, transparency, layout) move into View, and their segmented controls leave the preview area.
- **Use the new components as much as possible, even where that changes how the site works.** Wherever one of the six fits a hand-built part of the site, it replaces it. Behaviour may change; keyboard access may not be lost.
- **Both editor side panels become Sidebars:** the preset editor's Review drawer and the component editors' inspector.
- **Catalog first, then the site.** Track 1 ships all six components in the catalog. Track 2 rebuilds the site on them and branches from track 1.
- **Retro futurism is in scope.** It shipped in 0.8.2 (#163) while this doc was being written, so these six components are drawn in it too, from the `RetroFuturism09*` boards. It brings the count to eight families.

Calls I made, which were not discussed:

- **Libraries:**
  - Radix `@radix-ui/react-navigation-menu` and `@radix-ui/react-menubar` for the Radix edition.
  - `@base-ui/react/navigation-menu` and `@base-ui/react/menubar` for Base UI. Both already exist in the installed `@base-ui/react` 1.9.0.
  - `react-resizable-panels` for Resizable, shared by both editions.
  - `@tanstack/react-table` for Data Table, shared by both editions.
  - All pinned to exact versions, like the existing primitives.
- **The site keeps the Ombelle family.** It still compiles its components from `presets/ombelle.json` through `scripts/generate-www-ui.ts`. The other families are verified through specimens, the preview app and the board comparison, not the site.

## Goals, non-goals, anti-goals

- **Goals:**
  - Six components that match their boards in all eight families and pass the specimen audit and accessibility checks in both editions.
  - A website whose header, docs and component navigation, editor layout, editor top bar, guide text and support tables are built from them.
  - Every hand-built part of the site that one of the six components can take over is moved onto it. The editors may change behaviour where a component takes over, but every action stays reachable by keyboard.
- **Non-goals:**
  - 1.0 blocks: a full dashboard or app template is not a component.
  - Releasing or bumping the CLI.
  - Restyling the site.
  - Tabs as links, unless it falls out of Navigation Menu for free.
  - Server-side data fetching or pagination in Data Table.
- **Anti-goals:**
  - Any change to the default output of shipped components. Their specimens and stable hashes must not move, and Table's especially, since Data Table builds on it.
  - A page that can't be reached without JavaScript. Sidebar links and guide content must work before hydration.
    - Navigation Menu triggers are buttons in both primitives, so the header's Docs and Components panels need JavaScript. Every page they lead to must still be reachable through real links before hydration: the section index pages, the footer, and the server-rendered sidebars. (My call, from the builder check.)
  - An editor that loses a keyboard path it has today.
  - A First Load JS jump on the docs routes, where people read rather than edit.

## Shared conventions

The 0.7.5 and 0.7.6 conventions carry over. Read the "Shared conventions" sections of `2026-11-12-primitives-075-design.md` and `2026-11-13-components-076-design.md`. In short:

- **Files per component:**
  - The Radix template `packages/catalog/src/templates/<id>.tsx`, and a Base UI template `templates/base/<id>.tsx` only where the primitive differs.
  - `styles/<id>/<family>.css` for each of the eight families: flat, liquid-glass, minimalist, neo-brutalism, ombelle, organic, papier and retro-futurism.
  - Registration in `packages/contracts/src/component-ids.ts` and `style-families.ts`, and in `packages/catalog/src/component-slots.ts`, `index.ts` and `expansion-examples.ts`.
  - Tests in `packages/catalog/test/<id>.test.ts`.
- **Parts** follow shadcn names, forward native props, refs, `className` and `style`, and carry a `data-slot` named after the part.
- **Style rules:**
  - Every selector names one slot or a marker.
  - Liquid glass stays experimental and its findings do not block.
  - Forced colours keep borders and use `Highlight` for current, selected and pressed.
  - Every target is at least 24 × 24 px.
  - Reduced motion removes transitions.
- **Self-contained files:** a component that looks like another draws that look itself, with its own slots and its own copy of the family CSS. For example, Sidebar draws its own phone sheet on the dialog primitive, and Data Table draws its own toolbar and menus. Every catalog component installs as one file, and the CLI cannot make one component install another.
- **Website build:**
  - New components are added to `wwwUiComponents` in `scripts/generate-www-ui.ts`.
  - `apps/www` pins each new primitive.
  - First Load JS of the editor and docs routes is recorded before and after. Growth above 10 kB gzipped on a route stops the work for review.

## Track 1: the catalog

### Typography / Prose (`prose`, server, no dependency, one template)

Board: the Data board's "Typography / Prose" section.

- **Parts:** `Prose` (`data-slot="prose"`), a wrapper that styles the HTML elements inside it:
  - headings h1 to h4, paragraphs and lead text;
  - links, lists and blockquote;
  - inline `code`, `kbd`, `hr` and tables;
  - figures and captions.
- **Lead text:** `ProseLead` is the one optional part, for the lead paragraph.
- **Styling:** the family CSS sets the vertical rhythm, the measure (a `max-width` in `ch` that `className` can override) and the heading font from the preset's font pair. Element selectors are scoped under the `prose` slot, which counts as naming a slot.
- **Code blocks:** they are not restyled. A Code Block inside Prose keeps its own look.

### Navigation Menu (`navigation-menu`, client)

Board: the Shell board's "Navigation Menu" section, a website header with one panel open.

- **Parts:**
  - `NavigationMenu`, `NavigationMenuList` and `NavigationMenuItem`.
  - `NavigationMenuTrigger` and `NavigationMenuContent`.
  - `NavigationMenuLink`, which takes `active` for `aria-current="page"`.
  - `NavigationMenuIndicator` and `NavigationMenuViewport`.
- **Behaviour:**
  - Panels open on hover and on click.
  - Arrow keys move between top-level items, and Escape closes the panel.
  - Plain links are real `<a>` elements, so the header works before hydration.
- **Phones:** the component does not collapse itself. The board's phone header is a Sheet, and the site composes that itself; see track 2. The docs page shows the pattern.
- **Editions:** Radix `@radix-ui/react-navigation-menu`, Base UI `@base-ui/react/navigation-menu`.

### Sidebar (`sidebar`, client)

Board: the Shell board's "Sidebar" section: an editor shell and a docs site, a sidebar collapsed to icons, and the phone sheet.

- **Parts:**
  - `SidebarProvider`, `Sidebar`, `SidebarTrigger`, `SidebarRail` and `SidebarInset`.
  - `SidebarHeader`, `SidebarContent` and `SidebarFooter`.
  - `SidebarGroup`, `SidebarGroupLabel` and `SidebarGroupContent`.
  - `SidebarMenu`, `SidebarMenuItem`, `SidebarMenuButton` (with `isActive` for `aria-current`) and `SidebarMenuBadge`.
  - `SidebarMenuSub` and `SidebarMenuSubButton`.
  - `SidebarInput`, `SidebarGroupAction` and `SidebarMenuAction`, and collapsible groups built on the collapsible primitive inside `sidebar.tsx`, because the boards draw a search field, group and item actions, and a collapsible group. A workspace switcher is composed from a `SidebarMenuButton` and a menu; it is not a part of its own. (My call, from the builder check: the boards are the source of truth for which parts ship.)
  - These follow shadcn's names. A `useSidebar` hook exposes `open`, `setOpen`, `openMobile` and `isMobile`.
- **Props on `Sidebar`:**
  - `collapsible`: `offcanvas`, `icon` or `none`.
  - `side`: `left` or `right`.
  - `variant`: `sidebar`, `floating` or `inset`, but only those the boards draw. The builder confirms which against the boards.
- **Collapsed to icons:**
  - Labels hide and each button keeps its accessible name.
  - A tooltip shows the label on hover and focus, drawn with the tooltip primitive inside `sidebar.tsx`.
  - Group labels hide.
- **Phones:** the phone layout is chosen by a CSS breakpoint, not only by the `isMobile` hook, so the server renders the right layout. Before hydration a phone shows the sidebar's content inline above the page, as the site's docs navigation does today. After hydration, below 768 px (the default, overridable through the provider), the sidebar renders inside a modal sheet built on the dialog primitive inside `sidebar.tsx`, with the Sheet look copied under its own slots. The trigger opens it, and following a link closes it.
- **State:**
  - `open`, `defaultOpen` and `onOpenChange` on the provider.
  - A keyboard shortcut, Ctrl/Cmd+B, toggles it. The shortcut can be turned off with `shortcut={false}`.
  - The open state is not stored in a cookie by default. The docs show how to persist it.
- **Editions:** Radix uses `@radix-ui/react-dialog` and `@radix-ui/react-tooltip`, and Base UI uses its dialog and tooltip. One layout serves both.

### Resizable (`resizable`, client, one template)

Board: the Shell board's "Resizable" section, with preview and controls split panes.

- **Parts:** `ResizablePanelGroup` (`direction`), `ResizablePanel` and `ResizableHandle` (`withHandle` draws the grip). All three wrap `react-resizable-panels`.
- **Keyboard:**
  - The handle is a focusable separator with `aria-valuenow`.
  - Arrow keys resize in steps, and Home and End jump to the minimum and maximum.
  - The handle's hit area is at least 24 px across, even when the drawn line is 1 px.
- **Collapsing:** `ResizablePanel` passes through the library's `collapsible`, `collapsedSize`, `minSize` and `maxSize`, so a panel folds to a strip as the board shows. The board's "Reset layout" control is composed by the consumer through the library's imperative API, and the docs show how. (My call, from the builder check.)
- **Layout:** `autoSaveId` persists the layout in local storage, as the library does. It is off unless the consumer passes it.

### Menubar (`menubar`, client)

Board: the Data board's "Menubar" section: File / Edit / View, with one menu open, showing checkbox and radio items, a submenu and shortcuts.

- **Parts:**
  - `Menubar`, `MenubarMenu`, `MenubarTrigger` and `MenubarContent`.
  - `MenubarItem` (with `inset` and `variant="destructive"`), `MenubarCheckboxItem`, `MenubarRadioGroup` and `MenubarRadioItem`.
  - `MenubarLabel`, `MenubarSeparator` and `MenubarShortcut`.
  - `MenubarSub`, `MenubarSubTrigger` and `MenubarSubContent`.
- **Keyboard:**
  - One Tab stop for the bar, and arrow keys move between menus.
  - Once one menu is open, Left and Right open the neighbouring menu.
  - Escape returns focus to the trigger.
  - The component binds no Alt shortcut to reach the bar, even though the board mentions one: Alt clashes with browser and operating-system shortcuts. The docs page's keyboard table drops that line. (My call, from the builder check.)
- **Shortcuts:** `MenubarShortcut` only displays a shortcut. Binding it is the consumer's job, as in shadcn.
- **Menu styling:** the menus copy Dropdown Menu's family styles under their own slots.
- **Editions:** Radix `@radix-ui/react-menubar`, Base UI `@base-ui/react/menubar`.

### Data Table (`data-table`, client, one template)

Board: the Data board's "Data Table" section: a toolbar with a filter input, faceted filters and a column-visibility menu, a header checkbox, sortable columns, row actions (⋯), a selection count and pagination.

- **Shape:** Data Table is built on the existing Table component. `data-table.tsx` renders the Table parts' markup and slots itself, under the self-contained rule, and copies Table's family CSS for them. Table is not changed.
- **Parts and helpers:**
  - `DataTable`, a generic component that takes `columns` (TanStack `ColumnDef`) and `data`.
  - `DataTableToolbar`, `DataTableColumnHeader` (a sort button built like Table's `onSort` header, with `aria-sort`), `DataTableViewOptions` (the column-visibility menu), `DataTableFacetedFilter`, `DataTablePagination` and `DataTableRowActions`.
  - Helpers `selectColumn()` and `actionsColumn()`.
- **Behaviour:**
  - Client-side sorting, filtering, faceting, row selection, column visibility and pagination, through TanStack's row models.
  - Each state can be controlled (`sorting`, `onSortingChange`, and so on) so a consumer can move it to the server.
  - The selection count is a polite live region.
- **Menus:** the column-visibility, facet and row-action menus use the dropdown menu primitive inside `data-table.tsx`. The facet filter uses the popover primitive with a checkbox list. Each copies its family look under its own slots.
- **Empty state:** "No results." spans the table and is reported to screen readers.
- **Without JavaScript:** before hydration the table renders its first page of rows as plain HTML.
- **Editions:** TanStack is shared, and the menus use each edition's primitive.

### Recipes and the component editor

The builder settles exact field names, following 0.7.6. Proposed:

| Component | Props | Content |
| --- | --- | --- |
| Prose | `measure` (`narrow`, `default`, `wide`) | sample article (fixed) |
| Navigation Menu | `indicator` (boolean), `viewport` (boolean) | up to five items, each a link or a panel of up to six links |
| Sidebar | `collapsible` (`offcanvas`, `icon`, `none`), `side`, `variant` | header label, up to three groups of up to eight items |
| Resizable | `direction`, `withHandle` (boolean), `panels` (2 or 3) | a label for each panel |
| Menubar | `menus` (1 to 4), `shortcuts` (boolean) | up to four menus of up to eight items |
| Data Table | `selection`, `columnVisibility`, `facets`, `pagination` (booleans) | sample rows (fixed) |

`validateComposition` rejects a Navigation Menu or Menubar with no items, and a Sidebar with no groups. Every new component needs CLI 0.9.

### Preview scenes and gallery

- The preview app's dashboard scene moves onto Sidebar and Resizable, and uses Data Table for its list.
- A Docs scene shows Navigation Menu, Sidebar and Prose together.
- `fixtures/shared/preset-gallery.tsx` gets a section for each of the six components.

## Track 2: the website

Rebuild the site's parts on the new components, compiled from the Ombelle preset. Each item replaces hand-built code. The existing tests for each part are updated for the swap, and they keep checking the same behaviour.

| Site part | Built from | Replaces |
| --- | --- | --- |
| Site header | Navigation Menu, with panels for Docs and Components; on phones a Sheet | links and the Radix dialog menu in `apps/www/src/site/header.tsx` |
| Docs navigation | Sidebar (`collapsible="offcanvas"`, a sheet on phones) | `apps/www/src/site/docs/sidebar.tsx` |
| Component directory navigation | Sidebar | `apps/www/src/site/components/sidebar.tsx` |
| Editor layout (desktop, from 1200 px) | Resizable between the preview and the side panels, in all three editors | the fixed column layout in `apps/www/src/editor-shell` |
| Preset editor's Review drawer | Sidebar (`side="right"`, `collapsible="icon"`); its icon rail is the collapsed state | the drawer and rail in `editor-shell/review-drawer.tsx` |
| Component editors' inspector | Sidebar (`side="left"`, `collapsible="icon"`) | the inspector `<aside>` in `editor-shell/inspector.tsx` and the editors that place it |
| Editor top bar (desktop) | Menubar (File / Edit / View), with Undo/Redo and the command palette search kept beside it | the Toolbar and its overflow menu in `top-bar.tsx` |
| Editor preview controls (desktop) | Menubar View menu, as radio and checkbox items | the segmented mode, width, transparency and layout controls in `button-editor.tsx`, `catalog-component-editor.tsx` and `matrix-controls.tsx` |
| Guides and component pages | Prose | per-element Tailwind classes in `site/docs/guides.tsx` and the doc pages |
| Support matrix and home page matrix | Data Table, sortable by component and filterable by family | the plain tables in `site/components/support-matrix.tsx` and `site/home/sections.tsx` |

Rules for the swap:

- **Editor breakpoints are unchanged.** The phone (below 768 px) keeps its dock and More sheet, and the tablet (768 to 1199 px) keeps its current structure. The Menubar and Resizable apply from 1200 px. On narrower screens they would be hard to use, and the editors already fill the viewport there.
- **Beyond this table:** the builder looks for other hand-built parts any of the six can take over, for example long text pages such as privacy and security on Prose, or other lists on Data Table. Each one found is swapped and listed in the PR.
- **Menubar mapping:**
  - File holds Download JSON, the recovery downloads and ID & revision. Edit holds Undo, Redo and Reset. View holds the preview controls. Toggles become checkbox or radio items, and choices of one value become radio groups.
  - No existing action is dropped. The preview controls are lifted out of each editor into state the top bar can reach.
  - Below 1200 px there is no menubar, so the preview controls stay in the preview area there, as today.
  - Undo and Redo stay as visible buttons and also appear in Edit, with their shortcuts shown.
  - The command palette's Ctrl/Cmd+K stays.
  - The builder lists the mapping in the PR.
- **Review drawer on Sidebar:** the drawer's panels keep their tab semantics and Left/Right arrow keys inside the Sidebar content, because a tablist is the right model for switching panels. Sidebar supplies the layout, the collapse to an icon rail, the sheet below 768 px and Ctrl/Cmd+B. (My call.)
- **Inspector on Sidebar:**
  - Each inspector section gets an icon.
  - Collapsed, the rail shows those icons with their names as tooltips. Pressing one opens the sidebar scrolled to that section, with focus on its first control.
  - Both sidebars share the Ctrl/Cmd+B shortcut only where an editor has one of them. The preset editor's inspector and drawer each get their own trigger, and the shortcut toggles the drawer. (My call.)
- **Pinned header:** the header keeps today's rule. It stays pinned except on pages with preview iframes, and it is hidden below 1200 px in the editors.
- **Filtering by family:** families are the matrix's columns, so "filter by family" means choosing which family columns show, through `DataTableViewOptions`. There is also a text filter on the component name. No faceted filter is used on this table. (My call, from the builder check.)
- **Loading Data Table on the site:** the matrices render as server HTML. TanStack and the menus may load later, through a dynamic import, so they do not count toward First Load JS. (My call, from the builder check.)
- **When a route goes over the JS limit:** the limit is 10 kB gzipped on every route, including the docs routes. Try a code split first. If a route is still over, keep the change, record the overage and its cause in `docs/evidence/app-shell-09.md`, and flag it at the top of the PR. Do not stop the work. (My call, from the builder check.)
- **Data Table on the site:** the home page matrix stays visually compact. Filters and pagination appear only where the table is long enough to need them. The builder judges this per table and notes it in the PR.
- **Before hydration:** the docs pages still render their navigation and content.

## Verification

Record the environment of each check.

- **Both tracks:** `pnpm build:packages`, `pnpm typecheck`, `pnpm test:unit` and `pnpm test:integration`.
- **Track 1 specimen audit:** `pnpm generate:preview`, then `pnpm test:specimen-audit` limited to the six new components with `OMBELLE_AUDIT_COMPONENTS`. Table's default specimen is checked for an unchanged hash. Shipped components are not re-audited unless their output changed.
- **Track 1 browser tests, in both editions:**
  - **Navigation Menu:** open on click and hover, arrow keys between items, Escape, and links that work without JavaScript.
  - **Sidebar:** collapse to icons with names and tooltips intact, the Ctrl/Cmd+B toggle, the phone sheet trapping focus and closing on navigation.
  - **Resizable:** resize with the keyboard (arrows, Home and End), a hit area of at least 24 px, and the layout kept with `autoSaveId`.
  - **Menubar:** one Tab stop, arrows across menus, submenus, checkbox and radio items, and Escape returning focus.
  - **Data Table:**
    - sorting sets `aria-sort`, filtering and faceting, select all and select one;
    - the selection count is announced, column visibility works, and pagination works;
    - the empty state, and rows visible before hydration.
  - **Prose:** no clipping or overflow at 320 px, and Code Block keeps its look inside it.
- **Track 1 board comparison:** compare computed styles against the boards in every family, light and dark.
- **Track 2:**
  - The editor end-to-end tests, updated for the Menubar and Resizable swap. Every top bar action stays reachable by keyboard.
  - The site's header, docs and component navigation work at 375, 768 and 1440 px.
  - `next build` First Load JS for the editor, docs, components and home routes, before and after.
  - An axe pass on the rebuilt pages.

## Documentation

- `docs/components/{prose,navigation-menu,sidebar,resizable,menubar,data-table}.md`. The Navigation Menu page shows the phone Sheet pattern. The Sidebar page shows how to persist its open state.
- `docs/accessibility-review.md` rows for the six components.
- docs/03, the README component count, the CHANGELOG under Unreleased, and `docs/evidence/app-shell-09.md` for both tracks.
- Update the roadmap entry in docs/07 if it lists 0.9.

## Delivery

- **Track 1:** branch `feat/app-shell-09` from `main`, one commit per component, one PR. The order is my call: Prose, Navigation Menu, Sidebar, Resizable, Menubar, Data Table, from the simplest to the one with the most parts.
- **Track 2:** branch `feat/site-app-shell` from track 1, one commit per site part, one PR.

## Left to the builder

- Exact recipe field names and limits, within the table above.
- Which Sidebar `variant` values the boards actually draw.
- Each family's measurements, read from its boards through the canvas link above. The boards are not in the repository.
- Whether Sidebar and Data Table need a Base UI template of their own, or one template can import the edition's primitives through the existing edition mechanism.
- The exact Menubar mapping of today's top bar actions, under the rules above.
- The icon for each inspector section.
- How the preview control state is lifted so the menubar can reach it.
- Where Data Table's filters and pagination are worth showing on the site.

## Out of scope

- Blocks (1.0), Chart, and Tabs as links.
- A CLI component dependency graph.
- Server-side Data Table recipes and virtualised rows.
- Releases and the CLI version bump.
