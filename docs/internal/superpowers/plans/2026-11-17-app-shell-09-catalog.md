# 0.9 App Shell, Track 1 (Catalog) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add six catalog components to the catalog: Prose, Navigation Menu, Sidebar, Resizable, Menubar and Data Table. Each ships in both editions and all eight style families, with recipes, specimens, scenes and docs.

**Architecture:** The plan follows the 0.7.6 sequence (commits `a98362af` to `4a3327b1`):

1. Contracts first: the component ids, recipe fields and a 0.9.0 CLI gate.
2. One commit per component: the Radix template, a Base UI template where the primitive differs, eight family stylesheets, the slot registration, a unit test, and a section in the browser scenario.
3. Then compiler recipe specimens, preview scenes, the board and audit fixes, and the docs.

Each component file is self-contained: it draws any look it borrows (sheet, tooltip, menus, table) under its own slots.

**Tech Stack:**
- TypeScript, React 19, Radix and `@base-ui/react` 1.9.0.
- `react-resizable-panels` and `@tanstack/react-table`.
- Vitest with `renderToStaticMarkup`, and Playwright.

**Spec:** `docs/internal/superpowers/specs/2026-11-17-app-shell-09-design.md`. Read it with this plan, especially the Shared conventions and Track 1 sections. The visual source is the canvas https://claude.ai/artifact/1FMRGWoyJSwht9wATT838U, pages "0.9 app shell — <Family>", boards `project/<Family>09Shell.dc.html` and `project/<Family>09Data.dc.html`. Read them with the Artifact tool.

**Branch:** `feat/app-shell-09` (already holds the spec). One PR at the end.

## Global Constraints

- **Families:** `flat`, `liquid-glass`, `minimalist`, `neo-brutalism`, `ombelle`, `organic`, `papier` and `retro-futurism`. Each new component gets `packages/catalog/src/styles/<id>/<family>.css` for all eight.
- **Liquid glass** support is `experimental` for all six components. Its audit findings do not block.
- **Component ids:** `prose`, `navigation-menu`, `sidebar`, `resizable`, `menubar` and `data-table`.
- **Selectors:** every one names one slot (`[data-slot='…']`) or a marker. `pnpm build:packages` fails otherwise.
- **Accessibility:**
  - Every target is at least 24 × 24 px.
  - Forced colours keep borders and use `Highlight` for current, selected and pressed.
  - Reduced motion removes transitions.
- **Dependencies:** pinned to exact versions in `packages/catalog/src/manifest.ts` and `packages/catalog/package.json`:
  - `@radix-ui/react-navigation-menu`, `@radix-ui/react-menubar`, `react-resizable-panels` and `@tanstack/react-table`.
  - Pin the current npm release of each, and record the versions in the evidence.
- **Unchanged output:** default output of shipped components must not change. Table's especially: Data Table copies Table's markup and CSS and does not import or modify `table.tsx`.
- **Edits:** edit `schemas/` and `templates/`, `styles/` and `presets/` only. Never edit `packages/contracts/src/component-recipe-schema.ts` or `packages/catalog/src/generated.ts` by hand. `pnpm build:packages` regenerates them; commit the generated changes with their sources.
- **CLI gate:** every new component needs CLI `0.9.0`.
- **Commits:** Conventional Commits, one per task.

## Review Focus

1. **Ctrl/Cmd+B while typing.** With focus in an input, textarea or contenteditable, the Sidebar shortcut must do nothing, so it never steals Bold. Covered in Task 4.
2. **Corrupt or stale saved layouts.** Resizable with `autoSaveId` and a malformed or out-of-range value in local storage must fall back to the default sizes without throwing. Covered in Task 5.
3. **Selection hidden by a filter.** A Data Table filter that hides selected rows must keep them selected. The count must still say "2 of 40 row(s) selected", and select-all only toggles visible rows. Covered in Task 7.
4. **Long content in Prose.** URLs, long words and wide tables inside Prose at 320 px must wrap or scroll inside their own box, never widen the page. Covered in Task 2.
5. **A collapsed Sidebar with a keyboard.** Every icon button keeps its accessible name and shows its tooltip on focus, and a collapsible group inside an icon-collapsed Sidebar is not focusable while hidden. Covered in Task 4.

---

### Task 1: Contracts, recipe fields, dependencies and the 0.9.0 gate

**Files:**
- Modify: `packages/contracts/src/component-ids.ts`, `packages/contracts/src/style-families.ts` (all six `experimental` for liquid glass) and `packages/contracts/src/component-recipe.ts` (`validateComposition` cases).
- Modify: `schemas/component-recipe.schema.json`, then regenerate `component-recipe-schema.ts`.
- Modify: `packages/contracts/src/component-recipe-appearance.ts`, if the new ids need appearance entries as 0.7.6's did.
- Modify: `apps/www/src/snapshots/install-command.ts`. Add `catalog09MinimumCli = '0.9.0'`, `catalog09InstallNotice` and a `catalog09Components` set, wired in exactly as `catalog076*` is.
- Modify: `packages/catalog/src/manifest.ts`, `packages/catalog/package.json` and `pnpm-lock.yaml`.
- Test: `packages/contracts/test/component-recipe.test.ts`, `packages/contracts/test/style-support.test.ts` and `apps/www/src/snapshots/display-install.test.ts`.

**Interfaces:**
- **Produces:**
  - The six ids in `componentIds`.
  - The recipe `props` and `content` shapes below.
  - `catalog09MinimumCli` and `catalog09InstallNotice`.

**Recipe fields.** The spec's table; settle names here, and later tasks use them as written:

| id | props | content |
| --- | --- | --- |
| prose | `measure: 'narrow' \| 'default' \| 'wide'` | none (fixed sample article) |
| navigation-menu | `indicator: boolean`, `viewport: boolean` | `label: string`, `items: { label: string; href?: string; links?: { label: string; href: string; description?: string }[] }[]` (1 to 5 items, up to 6 links) |
| sidebar | `collapsible: 'offcanvas' \| 'icon' \| 'none'`, `side: 'left' \| 'right'`, `variant: 'sidebar' \| 'floating' \| 'inset'` | `label: string`, `groups: { label: string; items: string[] }[]` (1 to 3 groups, up to 8 items) |
| resizable | `direction: 'horizontal' \| 'vertical'`, `withHandle: boolean`, `panels: 2 \| 3` | `labels: string[]` |
| menubar | `shortcuts: boolean` | `label: string`, `menus: { label: string; items: string[] }[]` (1 to 4 menus, up to 8 items) |
| data-table | `selection`, `columnVisibility`, `facets`, `pagination`: booleans | none (fixed sample rows) |

Trim `variant` to the values the Sidebar boards actually draw (see Task 4), and do it here, before the schema ships.

- [ ] **Step 1: Write failing tests**

  In `component-recipe.test.ts`:
  - `accepts a default recipe for each 0.9 component`.
  - `rejects a navigation menu without items` (path `/content/items`).
  - `rejects a menubar without menus` (`/content/menus`).
  - `rejects a sidebar without groups` (`/content/groups`).
  - `rejects a navigation menu or menubar without a label` (`/content/label`).
  - `rejects resizable labels that do not match the panel count` (`/content/labels`).

  In `style-support.test.ts`: the six ids are `stable` in the seven opaque families and `experimental` in `liquid-glass`.

  In `display-install.test.ts`: a recipe for each new id against installer `0.8.3` returns `catalog09InstallNotice`; against `0.9.0` it returns no notice.

- [ ] **Step 2:** `pnpm exec vitest run packages/contracts/test/component-recipe.test.ts packages/contracts/test/style-support.test.ts apps/www/src/snapshots/display-install.test.ts`. Expect FAIL.

- [ ] **Step 3: Implement**

  - Add the ids, the schema fields, the validation cases and the gate.
  - Add the four dependencies to the manifest and `packages/catalog/package.json`.
  - `pnpm install --frozen-lockfile=false --ignore-scripts` once, to update the lockfile.

- [ ] **Step 4:** `pnpm build:packages`, then the Step 2 command. Expect PASS. `pnpm typecheck` passes.

- [ ] **Step 5: Commit**

  `feat(contracts): add the 0.9 app shell component ids, recipe fields and gate`

---

**Tasks 2 to 7 share this shape.** Each adds one component:

- `packages/catalog/src/templates/<id>.tsx`.
- `templates/base/<id>.tsx`, only where the Base UI primitive differs.
- `styles/<id>/<family>.css` ×8.
- Registration in `component-slots.ts`, `index.ts` and `expansion-examples.ts`.
- `packages/catalog/test/<id>.test.ts`, using `expectComponentContract` from `packages/catalog/test/new-component-contract.ts`.
- A section of `fixtures/shared/app-shell-09-scenario.tsx`, with its browser tests in `tests/e2e/app-shell-09.spec.ts`.

Task 2 creates the scenario and spec files. It also adds `app-shell-09.spec.ts` to `testIgnore` in `playwright.config.ts` and to `testMatch` in `playwright.specimen-audit.config.ts`, as `components-076.spec.ts` is.

In each task:
- Every unit test runs on both editions through `it.each(editions)`, as in `packages/catalog/test/toolbar.test.ts`.
- Every browser test runs on both editions, as in `tests/e2e/components-076.spec.ts`.
- Measurements per family come from that family's board. Draw Retro futurism from the `RetroFuturism09*` boards and its family CSS in `styles/retro-futurism.css`.

Run each task's tests with:
- `pnpm build:packages && pnpm exec vitest run packages/catalog/test/<id>.test.ts packages/catalog/test/catalog.test.ts`
- `pnpm generate:preview && pnpm exec playwright test -c playwright.specimen-audit.config.ts app-shell-09 -g "<Component>"`

First expect FAIL (red) with no template, then PASS (green).

### Task 2: Prose (`prose`, server component, one template, no dependency)

**Files:** `templates/prose.tsx`; `styles/prose/*.css` ×8; registration; `test/prose.test.ts`; create `fixtures/shared/app-shell-09-scenario.tsx` and `tests/e2e/app-shell-09.spec.ts`; the Playwright config entries.

**Interfaces:**
- **Produces:**
  - `Prose(props: ComponentProps<'div'>)` with `data-slot="prose"`.
  - `ProseLead(props: ComponentProps<'p'>)` with `data-slot="prose-lead"`.
  - Element styles are scoped as `[data-slot='prose'] :where(h1, h2, …)`.

- [ ] **Step 1: Unit tests**
  - `provides the parts in both editions`: `client: false`; parts `['Prose', 'ProseLead']`; slots `['prose', 'prose-lead']`; dependencies are only `clsx` and `tailwind-merge`; glass `experimental`.
  - `forwards className and keeps nested markup`: a Prose with h2, p, ul, a `pre` with `data-slot="code-block"`; the output contains them unchanged.
  - `does not restyle a nested Code Block`: no `prose/*.css` rule matches `[data-slot='code-block']` or descendants of it. Assert by reading the CSS file text, and use `:where(:not([data-slot='code-block'] *))`, or an equivalent, in the selectors.

- [ ] **Step 2: Browser tests** in `app-shell-09.spec.ts`
  - `prose keeps long URLs, words and tables inside the page at 320 px`. Review Focus 4: at 320 × 800, `document.documentElement.scrollWidth <= 320`, and a 12-column table inside Prose scrolls within its own wrapper.
  - `prose measure follows the recipe`: the computed `max-width` in `ch` differs for `narrow`, `default` and `wide`.

- [ ] **Step 3:** Implement the template and the eight stylesheets. Each family's heading font comes from its preset font variables. Run the tests (red, then green).

- [ ] **Step 4: Commit:** `feat(catalog): add Prose`

### Task 3: Navigation Menu (`navigation-menu`, client)

**Files:** `templates/navigation-menu.tsx` (Radix `@radix-ui/react-navigation-menu`), `templates/base/navigation-menu.tsx` (`@base-ui/react/navigation-menu`); styles ×8; registration; `test/navigation-menu.test.ts`; scenario section.

**Interfaces:**
- **Produces:** the parts `NavigationMenu`, `NavigationMenuList`, `NavigationMenuItem`, `NavigationMenuTrigger`, `NavigationMenuContent`, `NavigationMenuLink` (prop `active?: boolean` → `aria-current="page"`), `NavigationMenuIndicator` and `NavigationMenuViewport`. Each has a slot of the same kebab name.

- [ ] **Step 1: Unit tests**
  - `provides the parts in both editions`: parts and slots as above; the Radix dependency `@radix-ui/react-navigation-menu`; the Base UI one `@base-ui/react`.
  - `%s renders plain links as anchors before hydration`: a `NavigationMenuLink href="/docs"` renders `<a href="/docs"`.
  - `%s marks the active link`: `active` gives `aria-current="page"`.

- [ ] **Step 2: Browser tests**
  - `opens a panel on click and on hover, and Escape closes it, returning focus to the trigger`.
  - `arrow keys move between top-level items`.
  - `links work with JavaScript disabled`: load the scenario with `javaScriptEnabled: false`, click a top-level link and see that the URL changed.

- [ ] **Step 3:** Implement. Run the tests (red, then green).

- [ ] **Step 4: Commit:** `feat(catalog): add Navigation Menu`

### Task 4: Sidebar (`sidebar`, client)

Read the Shell boards' Sidebar section in every family first. Record which `variant` values are drawn, and fix the Task 1 schema in this commit if it differs.

**Files:** `templates/sidebar.tsx` (Radix dialog, tooltip and collapsible primitives), `templates/base/sidebar.tsx` (the Base UI equivalents); styles ×8; registration; `test/sidebar.test.ts`; scenario section.

**Interfaces:**
- **Produces:**
  - **Provider:** `SidebarProvider({ open?, defaultOpen = true, onOpenChange?, mobileBreakpoint = 768, shortcut = true })`.
  - **Hook:** `useSidebar(): { state: 'expanded' | 'collapsed'; open: boolean; setOpen(open: boolean): void; openMobile: boolean; setOpenMobile(open: boolean): void; isMobile: boolean; toggleSidebar(): void }`.
  - **Sidebar:** `Sidebar({ side = 'left', variant = 'sidebar', collapsible = 'offcanvas' })`.
  - **Parts:** `SidebarTrigger`, `SidebarRail`, `SidebarInset`, `SidebarHeader`, `SidebarContent`, `SidebarFooter`, `SidebarInput`, `SidebarGroup`, `SidebarGroupLabel`, `SidebarGroupAction`, `SidebarGroupContent`, `SidebarMenu`, `SidebarMenuItem`, `SidebarMenuButton({ isActive?, tooltip?: string })`, `SidebarMenuAction`, `SidebarMenuBadge`, `SidebarMenuSub` and `SidebarMenuSubButton`.
  - **Collapsible groups:** `SidebarGroupCollapsible`, `SidebarGroupCollapsibleTrigger` and `SidebarGroupCollapsibleContent`.
  - **Slots:** each part's slot is its kebab name.
  - **Root markers:** the root carries `data-state`, `data-collapsible`, `data-side` and `data-variant` markers for CSS.
- **Phone layout (spec):**
  - It is chosen by a CSS media query at `mobileBreakpoint`, not only by `isMobile`.
  - Before hydration, below the breakpoint, the sidebar content renders inline, in normal flow.
  - After hydration, below the breakpoint, it renders inside the dialog sheet, opened by `SidebarTrigger`.

- [ ] **Step 1: Unit tests**
  - `provides the parts in both editions`: the Radix dependencies include `@radix-ui/react-dialog`, `@radix-ui/react-tooltip` and `@radix-ui/react-collapsible`.
  - `%s marks the active item`: `isActive` gives `aria-current="page"`.
  - `%s server-renders the content in flow`: the server markup contains the menu links and no dialog.
  - `%s renders collapsed state markers`: `defaultOpen={false}` with `collapsible="icon"` gives `data-state="collapsed"` and `data-collapsible="icon"`.

- [ ] **Step 2: Browser tests**
  - `collapses to icons, keeping names, and shows tooltips on focus`. Review Focus 5: Tab to an icon, then its accessible name equals the label and the tooltip text is visible.
  - `hides a collapsed group's content from Tab while the sidebar is icon-collapsed`.
  - `Ctrl/Cmd+B toggles, but not while typing in an input, textarea or contenteditable`. Review Focus 1.
  - `below 768 px the trigger opens a modal sheet that traps focus and closes when a link is followed`.
  - `with JavaScript disabled at 375 px, the sidebar links render inline and navigate`.

- [ ] **Step 3:** Implement. Run the tests (red, then green).

- [ ] **Step 4: Commit:** `feat(catalog): add Sidebar`

### Task 5: Resizable (`resizable`, client, one template)

**Files:** `templates/resizable.tsx`; styles ×8; registration; `test/resizable.test.ts`; scenario section.

**Interfaces:**
- **Produces:**
  - `ResizablePanelGroup({ direction, autoSaveId?, … })`.
  - `ResizablePanel({ defaultSize?, minSize?, maxSize?, collapsible?, collapsedSize?, … })`.
  - `ResizableHandle({ withHandle?: boolean })`.
  - These wrap `react-resizable-panels` and forward refs, so `ResizablePanel` exposes the library's imperative handle (`collapse`, `expand`, `resize`). The docs use that handle for "Reset layout".
  - Slots: `resizable-panel-group`, `resizable-panel`, `resizable-handle` and `resizable-handle-grip`.

- [ ] **Step 1: Unit tests**
  - `provides the parts in both editions`: one template; the dependency `react-resizable-panels`.
  - `%s renders the handle as a separator with a value`: `role="separator"` and `aria-valuenow`.

- [ ] **Step 2: Browser tests**
  - `arrow keys resize, Home and End jump to the limits`.
  - `the handle hit area is at least 24 px across`: measure `getBoundingClientRect` of the handle's hit element.
  - `a collapsible panel folds to its collapsed size`.
  - `autoSaveId restores a saved layout, and falls back to defaults when storage holds garbage`. Review Focus 2: seed local storage with `"{bad"` and with sizes summing to 250, reload, then no console error and the default sizes are applied.

- [ ] **Step 3:** Implement. Run the tests (red, then green).

- [ ] **Step 4: Commit:** `feat(catalog): add Resizable`

### Task 6: Menubar (`menubar`, client)

**Files:** `templates/menubar.tsx` (`@radix-ui/react-menubar`), `templates/base/menubar.tsx` (`@base-ui/react/menubar` plus Base UI menu); styles ×8, with the menu look copied from `styles/dropdown-menu/<family>.css` under `menubar-*` slots; registration; `test/menubar.test.ts`; scenario section.

**Interfaces:**
- **Produces:** `Menubar`, `MenubarMenu`, `MenubarTrigger`, `MenubarContent`, `MenubarItem({ inset?, variant?: 'default' | 'destructive' })`, `MenubarCheckboxItem`, `MenubarRadioGroup`, `MenubarRadioItem`, `MenubarLabel`, `MenubarSeparator`, `MenubarShortcut`, `MenubarSub`, `MenubarSubTrigger` and `MenubarSubContent`. Slots are their kebab names.

- [ ] **Step 1: Unit tests**
  - `provides the parts in both editions`.
  - `%s renders a menubar role with one trigger per menu`.
  - `MenubarShortcut is presentational text only`: it renders a `span`, binds no key listener, and has no `aria-keyshortcuts`.

- [ ] **Step 2: Browser tests**
  - `one Tab stop; arrows move across triggers`.
  - `with a menu open, Left/Right open the neighbouring menu`.
  - `checkbox and radio items toggle and report aria-checked`.
  - `a submenu opens with ArrowRight and closes with ArrowLeft`.
  - `Escape closes and returns focus to the trigger`.
  - `pressing Alt alone does not move focus to the menubar` (the spec's call).

- [ ] **Step 3:** Implement. Run the tests (red, then green).

- [ ] **Step 4: Commit:** `feat(catalog): add Menubar`

### Task 7: Data Table (`data-table`, client, one template with edition menus)

**Files:**
- `templates/data-table.tsx`, plus `templates/base/data-table.tsx`, because the menus and popover come from each edition's primitives.
- `styles/data-table/*.css` ×8, which copy the rules of `styles/table/<family>.css` re-scoped to `data-table-*` slots, plus toolbar, menu and pagination rules.
- Registration; `test/data-table.test.ts`; scenario section.

**Interfaces:**
- **Produces:**
  - `DataTable<TData>({ columns: ColumnDef<TData>[]; data: TData[]; state?; onSortingChange?; onColumnFiltersChange?; onRowSelectionChange?; onColumnVisibilityChange?; onPaginationChange?; toolbar?: (table: Table<TData>) => ReactNode; pageSize?: number = 10; emptyLabel?: string = 'No results.' })`.
  - `DataTableColumnHeader({ column, title })`, `DataTableViewOptions({ table })`, `DataTableFacetedFilter({ column, title, options: { label: string; value: string }[] })`, `DataTablePagination({ table })` and `DataTableRowActions({ children })` (a ⋯ menu trigger named "Row actions").
  - `selectColumn<TData>(): ColumnDef<TData>` and `actionsColumn<TData>(render: (row: Row<TData>) => ReactNode): ColumnDef<TData>`.
  - The selection count is `<p data-slot="data-table-selection" aria-live="polite">{n} of {total} row(s) selected.</p>`.

- [ ] **Step 1: Unit tests**
  - `provides the parts in both editions`: the dependency `@tanstack/react-table`.
  - `does not touch Table's output`: `packages/compiler/test/fixtures/stable-family-hashes.json` entries for `table` are unchanged. Assert by running the existing Table hash test unchanged.
  - `%s renders the first page as plain table HTML`: 25 rows with `pageSize` 10 give 10 `<tr>` in `tbody`.
  - `%s renders the empty state across all columns`: no data gives one cell with `colspan` equal to the column count and the text "No results.".
  - `%s sets aria-sort on a sorted header`.

- [ ] **Step 2: Browser tests**
  - `clicking a sortable header cycles ascending, descending, none, updating aria-sort`.
  - `text filter and faceted filter narrow the rows; a filter with no match shows "No results."`.
  - `select one and select all (visible rows only); the count is announced`.
  - `selection survives a filter that hides selected rows`. Review Focus 3: select 2 rows, filter them out, then the count reads "2 of 40 row(s) selected." and clearing the filter shows them still checked.
  - `column visibility hides and shows a column`.
  - `pagination moves pages and disables Previous on the first page`.
  - `row actions menu opens by keyboard`.

- [ ] **Step 3:** Implement. Run the tests (red, then green).

- [ ] **Step 4: Commit:** `feat(catalog): add Data Table`

### Task 8: Compiler recipe specimens and stable hashes

**Files:** `packages/compiler/src/recipe-specimen.ts`; create `packages/compiler/test/app-shell-09.test.ts`, `app-shell-09-defaults.ts` and `fixtures/app-shell-09-default-specimens.json`; modify `test/fixtures/stable-family-hashes.json` and `tests/helpers/catalog-recipe-fixtures.ts`. These follow the 0.7.6 files `components-076*`.

**Interfaces:**
- **Consumes:** the Task 1 recipe fields and the parts from Tasks 2 to 7.
- **Produces:** a specimen for every recipe of each new id.

- [ ] **Step 1: Write the tests**
  - `app-shell-09.test.ts`: each default recipe compiles to the recorded specimen in every family.
  - Each prop value changes the specimen as expected:
    - `collapsible: 'icon'` renders a collapsed sidebar;
    - `panels: 3` renders three panels;
    - `selection: false` renders no checkbox column.
  - Run it and confirm it fails.

- [ ] **Step 2:** Implement the specimens. Regenerate the fixture JSON and the stable hashes. Confirm that only the new ids' hashes are added and no existing hash changes:

  `git diff packages/compiler/test/fixtures/stable-family-hashes.json` shows only `+` lines for new ids.

- [ ] **Step 3:** `pnpm build:packages && pnpm exec vitest run packages/compiler/test/app-shell-09.test.ts packages/compiler/test/liquid-glass.test.ts` passes.

- [ ] **Step 4: Commit:** `feat(compiler): describe the 0.9 app shell recipes`

### Task 9: Preview scenes, gallery, site expansion entries and component editor fields

**Files:**
- `apps/www/src/editor/components/catalog-properties.tsx` and `catalog-properties.test.tsx`: the component editor edits each new recipe's props and content. List fields (`items`, `groups`, `menus`, `labels`) get Add and Remove, as the 0.7.6 list fields do (`4ca6ca0a`). The six ids become editable wherever `apps/www/src/editor/editable-components.ts` lists editable components.
- `apps/preview/src/scenes/dashboard.tsx`: Sidebar, plus Resizable around its main area, plus Data Table for its list.
- Create `apps/preview/src/scenes/docs.tsx` (Navigation Menu, Sidebar and Prose) and register it where scenes are listed.
- `apps/preview/package.json` (the new dependencies).
- `fixtures/shared/preset-gallery.tsx` (six sections).
- `apps/www/src/site/components/expansion.ts` (six entries).
- `apps/www/src/preset-editor/preview-scenes.ts`, and its test.

- [ ] **Step 1:** Update `preview-scenes.test.ts` for the new Docs scene. Run it and confirm it fails.
- [ ] **Step 2:** Implement. `pnpm generate:preview && pnpm exec vitest run apps/www/src/preset-editor` passes, and `pnpm typecheck` passes.
- [ ] **Step 3: Commit:** `feat(preview): show the 0.9 app shell components in the scenes, gallery and site`

### Task 10: Board fidelity and specimen audit

- [ ] **Step 1: Compare with the boards**

  For each family and each component, compare computed styles in the scenario with the board: padding, radius, border, font, colours, light and dark.

  - Fix each difference in that family's CSS.
  - Or record it in `docs/evidence/app-shell-09.md` with a reason.

- [ ] **Step 2: Run the specimen audit**

  `pnpm build:packages && pnpm generate:preview && OMBELLE_AUDIT_COMPONENTS=prose,navigation-menu,sidebar,resizable,menubar,data-table pnpm test:specimen-audit`

  Fix every finding in the opaque families. Record the liquid glass findings in the evidence.

- [ ] **Step 3:** Re-run Task 8's test. If the hashes moved because of the fixes, re-record them for the new ids only.

- [ ] **Step 4: Commit:** `fix(catalog): match the 0.9 app shell to its boards and fix audit findings`

### Task 11: Docs, evidence and PR

**Files:**
- `docs/components/{prose,navigation-menu,sidebar,resizable,menubar,data-table}.md`:
  - The Navigation Menu page shows the phone Sheet pattern.
  - The Sidebar page shows how to persist the open state, and that Ctrl/Cmd+B is ignored while typing.
  - The Resizable page shows Reset layout through the imperative handle.
  - The Menubar keyboard table has no Alt line.
- `docs/accessibility-review.md` rows.
- `docs/03-components-styles-accessibility.md`.
- The README component count: add 6 to the number the README states today.
- `CHANGELOG.md` under Unreleased.
- `docs/evidence/app-shell-09.md`: environment, versions pinned, audit and board results.
- `docs/07-delivery-plan.md`, if it lists 0.9.

- [ ] **Step 1:** Write the docs.

- [ ] **Step 2: Run the full gate for this track**

  `pnpm build:packages && pnpm typecheck && pnpm test:unit && pnpm test:integration`

  All pass. Record the environment in the evidence.

- [ ] **Step 3: Commit:** `docs: document the 0.9 app shell components`

- [ ] **Step 4:** Push `feat/app-shell-09` and open the PR "feat(catalog): add the 0.9 app shell components". Its body lists the pinned versions, the Sidebar variants kept, and any recorded board differences.
