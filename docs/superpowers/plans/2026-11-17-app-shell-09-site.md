# 0.9 App Shell, Track 2 (Website Rebuild) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rebuild the website's header, docs and component navigation, editor layout, editor side panels, editor top bar, preview controls, long-form text and matrices on the six 0.9 components.

**Architecture:** The site compiles catalog components from the Ombelle preset into `apps/www/src/generated/ui` through `scripts/generate-www-ui.ts`, and styles them with its own tokens. Each task swaps one hand-built part for the generated component and keeps that part's existing tests, rewritten against the new markup. The editors' desktop (from 1200 px) gets the Menubar, Resizable and the Sidebars. Phone (below 768 px) and tablet structures stay as they are.

**Tech Stack:** Next.js (`apps/www`; read `apps/www/AGENTS.md` and the Next docs in `node_modules/next/dist/docs/` before touching routing or layout), React 19, Vitest and Playwright.

**Spec:** `docs/superpowers/specs/2026-11-17-app-shell-09-design.md`, the Track 2 section. **Depends on:** Track 1 (`docs/superpowers/plans/2026-11-17-app-shell-09-catalog.md`), complete on `feat/app-shell-09`.

**Branch:** `feat/site-app-shell`, from `feat/app-shell-09`. One PR, based on the track 1 PR.

## Global Constraints

- The site stays on the Ombelle family and its current look. Do not restyle.
- Behaviour may change where a component takes over. Every action stays reachable by keyboard.
- **Before hydration:** every page reachable through real links; docs content and sidebar links render.
- **Editor breakpoints are unchanged:** phone below 768 px, tablet 768 to 1199 px, desktop from 1200 px (`apps/www/src/editor-shell/breakpoints.ts`). Menubar, Resizable and the editor Sidebars apply from 1200 px.
- The header keeps its pinning rule: it is not pinned on `/editor/`, `/presets/` or `/recipes/` pages, and it is hidden below 1200 px in the editors.
- **First Load JS:**
  - Measure the editor, docs, components and home routes with `next build` before Task 1 and after Task 10.
  - The limit is 10 kB gzipped growth per route.
  - Over the limit: code-split first. If still over, keep the change, record the overage in `docs/evidence/app-shell-09.md`, and flag it at the top of the PR.
- Data Table's TanStack code loads through a dynamic import. The matrices first render as server HTML.

## Review Focus

1. **Crossing 1200 px with menu state.** Resizing the window across 1200 px while the View menu has changed the preview mode or width must keep that value, because the menubar and the in-preview controls share one state. Covered in Task 7.
2. **Ctrl/Cmd+B in an editor with two Sidebars.** The shortcut toggles the Review drawer in the preset editor and the inspector in the component editors, never both at once. It does nothing while typing in an inspector field. Covered in Tasks 5 and 6.
3. **The phone header without JavaScript.** At 375 px with JavaScript disabled, Docs, Components and the editor are still reachable through links on the page. Covered in Task 3.
4. **Reloading the editor.** After resizing the preview and controls panes, a reload restores the split. Clearing storage restores the default split. Covered in Task 4.
5. **Deep links into docs on a phone.** Opening `/docs/<slug>` on a phone and following a link in the sidebar sheet closes the sheet and lands on that page with focus in the main content. Covered in Task 2.

---

### Task 1: Generate the new components for the site and record the baseline

**Files:** `scripts/generate-www-ui.ts` (add `prose`, `navigation-menu`, `sidebar`, `resizable`, `menubar` and `data-table` to `wwwUiComponents`); `apps/www/package.json` (pin the new primitives at the Track 1 versions); `apps/www/src/generated-ui.test.ts`; create `docs/evidence/app-shell-09.md` (a site section).

- [ ] **Step 1:** Measure the baseline. Run `next build` in `apps/www` on the branch point and record First Load JS for `/`, `/docs`, `/docs/[slug]`, `/components`, `/components/[id]`, `/editor/component/*` and `/editor/preset/*` in the evidence.
- [ ] **Step 2:** Extend `generated-ui.test.ts` to expect the six files. Run it and confirm it fails.
- [ ] **Step 3:** Add the ids and the pins, then run `pnpm generate:preview`. The test passes and `pnpm typecheck` passes.
- [ ] **Step 4:** Commit `build(www): generate the 0.9 app shell components for the site`.

### Task 2: Prose and Sidebar for the docs and the component directory

**Files:** `apps/www/src/site/docs/sidebar.tsx`, `apps/www/src/site/components/sidebar.tsx`, `apps/www/src/app/docs/layout.tsx`, `apps/www/src/app/components/layout.tsx`, `apps/www/src/site/docs/guides.tsx`, `apps/www/src/site/doc-page.tsx`, `apps/www/src/app/privacy/page.tsx` and `apps/www/src/app/security/page.tsx`. Tests: the existing tests for these files, plus new e2e `tests/e2e/site-shell.spec.ts`, which goes in the default `playwright.config.ts` run.

**Interfaces:** Consumes `Sidebar*`, `SidebarProvider`, `Prose` and `ProseLead` from `apps/www/src/generated/ui/components/ui/{sidebar,prose}`.

- **Docs and Components layouts:** `SidebarProvider` → `Sidebar collapsible="offcanvas"` → `SidebarInset`. Menu buttons use `isActive` from `usePathname()`, as the current `aria-current` logic does. The "Component API reference →" link stays, as `SidebarFooter`.
- **Prose:** guides, doc pages, privacy and security wrap their body in `Prose`. Drop the per-element Tailwind typography classes there; keep layout classes.

- [ ] **Step 1: Write the e2e tests in `site-shell.spec.ts`**
  - `docs sidebar marks the current page`.
  - `at 375 px with JavaScript disabled the docs links render inline and navigate`.
  - `at 375 px the sidebar sheet opens, and following a link closes it and focuses main`. This is Review Focus 5, starting from a deep link `/docs/<first slug>`.
  - `components sidebar lists every component and marks the current one`.
  - `guide text keeps the page within 375 px` (`scrollWidth <= 375`).

  Run them and confirm they fail.
- [ ] **Step 2:** Implement. The e2e tests and the existing site unit tests pass.
- [ ] **Step 3:** Commit `feat(www): build docs and component navigation on Sidebar and Prose`.

### Task 3: The site header on Navigation Menu

**Files:** `apps/www/src/site/header.tsx`, `apps/www/src/site/links.ts` and `site-shell.spec.ts`.

- **Desktop:**
  - A `NavigationMenu` with a "Docs" panel listing the documentation guides (from `site/docs/navigation.ts`) and an index link to `/docs` first.
  - A "Components" panel listing the editor and the directory, with an index link to `/components` first.
  - The other primary links as `NavigationMenuLink`, with `active` from the current `current()` logic.
- **Phone:** the Radix Dialog menu becomes the generated `Sheet`, with the same links.
- **Kept:** the skip link, logo, alpha badge, theme toggle, GitHub link and the pinning rule.

- [ ] **Step 1: Write tests**
  - `header panels open by click and keyboard and close with Escape`.
  - `header marks the current section`.
  - `with JavaScript disabled at 375 px and 1440 px, /docs and /components are reachable through links on the home page and the footer`. This is Review Focus 3.
  - `header is not pinned on editor pages and hidden below 1200 px there`.

  Run them and confirm they fail.
- [ ] **Step 2:** Implement. The tests pass.
- [ ] **Step 3:** Commit `feat(www): build the site header on Navigation Menu`.

### Task 4: Resizable editor layout (desktop)

**Files:** `apps/www/src/editor-shell/editor-shell.module.css`; the layout components of the three editors: `apps/www/src/editor/components/button-editor.tsx`, `catalog-component-editor.tsx` and `apps/www/src/preset-editor/components/preset-editor.tsx`. Tests: `apps/www/src/editor-shell/breakpoints.test.tsx` and `tests/e2e/editors-responsive.spec.ts`.

- **Component editors:** from 1200 px, `ResizablePanelGroup direction="horizontal" autoSaveId="ombelle-editor-component"` holds [inspector panel | preview panel].
- **Preset editor:** [inspector | preview | review drawer], `autoSaveId="ombelle-editor-preset"`, and the drawer panel is `collapsible`.
- **Below 1200 px:** render today's structure unchanged. Use the `useViewportClass` result to choose.

- [ ] **Step 1: Write e2e tests**
  - `desktop editors split preview and controls with a keyboard-resizable handle`.
  - `a resized split survives reload and resets when storage is cleared`. This is Review Focus 4.
  - `tablet and phone structures are unchanged`. Reuse the existing responsive assertions.

  Run them and confirm they fail.
- [ ] **Step 2:** Implement. These tests and `editors-responsive.spec.ts` pass.
- [ ] **Step 3:** Commit `feat(www): split the desktop editors with Resizable`.

### Task 5: The Review drawer on Sidebar

**Files:** `apps/www/src/editor-shell/review-drawer.tsx`, `review-drawer.test.tsx`, `use-drawer-state.ts` and `use-drawer-state.test.ts`.

**Interfaces:** `ReviewDrawer` keeps its props. Inside, it renders `Sidebar side="right" collapsible="icon"`. The rail's icons are the collapsed state. The open panel keeps its `role="tablist"` and Left/Right arrows in `SidebarContent`. `use-drawer-state` maps onto `SidebarProvider`'s `open` and `onOpenChange`.

- [ ] **Step 1: Write tests**
  - Update `review-drawer.test.tsx`: the rail buttons have names and tooltips, a tab arrow moves between panels, and collapsed means `data-state="collapsed"`.
  - Add e2e `Ctrl/Cmd+B toggles the Review drawer in the preset editor and does nothing while typing in an inspector field`. This is Review Focus 2.

  Run them and confirm they fail.
- [ ] **Step 2:** Implement. `preset-editor.spec.ts` and the updated tests pass.
- [ ] **Step 3:** Commit `feat(www): build the Review drawer on Sidebar`.

### Task 6: The inspector on Sidebar

**Files:** `apps/www/src/editor-shell/inspector.tsx`, `inspector.test.tsx` and the editors that place the inspector.

**Interfaces:**
- `Inspector` gains `sections: { id: string; label: string; icon: LucideIcon }[]`. The builder picks each section's lucide icon.
- It renders `Sidebar side="left" collapsible="icon"`.
- In the collapsed state, each section is a `SidebarMenuButton tooltip={label}`. Pressing one opens the sidebar, scrolls to that section and focuses its first control.
- In the component editors, Ctrl/Cmd+B toggles the inspector. In the preset editor, its `SidebarProvider` sets `shortcut={false}`, so only the drawer responds.

- [ ] **Step 1: Write tests**
  - `collapsed inspector shows one named icon per section`.
  - `pressing a section icon expands and focuses that section's first control`.
  - In e2e: `Ctrl/Cmd+B toggles the inspector in the component editor`.

  Run them and confirm they fail.
- [ ] **Step 2:** Implement. The tests, `editor.spec.ts` and `catalog-editors.spec.ts` pass.
- [ ] **Step 3:** Commit `feat(www): build the editor inspector on Sidebar`.

### Task 7: Menubar top bar with File / Edit / View

**Files:** `apps/www/src/editor-shell/top-bar.tsx`, `top-bar.test.tsx`, `command-groups.ts` and `more-sheet.tsx`, which stays for phones; `apps/www/src/editor/components/matrix-controls.tsx`, `button-editor.tsx`, `catalog-component-editor.tsx` and `preset-editor.tsx`. Create `apps/www/src/editor-shell/preview-view-state.ts` with its test.

**Interfaces:**
- `preview-view-state.ts` exports `PreviewViewState = { mode: string; width: string; transparency?: string; layout?: string }`. Each field's values are the ones the editor offers today.
- It also exports `usePreviewViewState(editor: 'button' | 'component' | 'preset')`, which returns `{ state, set(field, value), options }`. Every editor and the top bar read this one store, so the in-preview controls (below 1200 px) and the View menu (from 1200 px) share it.
- `TopBar` replaces the `overflow: OverflowItem[]` prop with `menus: { file: OverflowItem[]; edit: OverflowItem[] }` and reads View from `usePreviewViewState`.
- **Mapping:**
  - **File:** Download JSON, the recovery downloads, and ID & revision.
  - **Edit:** Undo, Redo and Reset, with `MenubarShortcut` showing Ctrl/Cmd+Z and Shift+Ctrl/Cmd+Z.
  - **View:** a `MenubarRadioGroup` per preview control.
  - **Beside the menubar:** Undo and Redo buttons and the Ctrl/Cmd+K command search stay.
- **Desktop only:** from 1200 px, the segmented preview controls are not rendered. Below 1200 px they render as today, and the More sheet stays.

- [ ] **Step 1: Write tests**
  - `preview-view-state.test.ts`: one store per editor, and `set` updates every reader.
  - `top-bar.test.tsx`: File, Edit and View triggers, and every former overflow action present exactly once (list the ids).
  - e2e `editor.spec.ts`:
    - `View menu changes the preview mode and width`.
    - `every top bar action is reachable by keyboard through the menubar`.
    - `a View choice made on desktop is kept after resizing below 1200 px and back`. This is Review Focus 1.

  Run them and confirm they fail.
- [ ] **Step 2:** Implement. These tests and `editor-commands.spec.ts`, `editors-matrix.spec.ts` and `editors-responsive.spec.ts` pass.
- [ ] **Step 3:** Commit `feat(www): build the editor top bar on Menubar with File, Edit and View`.

### Task 8: Data Table for the support matrix and the home matrix

**Files:** `apps/www/src/site/components/support-matrix.tsx`, `support-matrix.test.tsx` and `apps/www/src/site/home/sections.tsx` (`MatrixSection`). Create `apps/www/src/site/components/matrix-table.tsx` as the client island, loaded with `next/dynamic`.

**Interfaces:** `SupportMatrix` server-renders a plain `<table>` with the same rows and columns as today. After load, `MatrixTable` replaces it with `DataTable`. Component is the sortable first column. Families are columns hidable through `DataTableViewOptions`. A text filter matches the component name. There is no faceted filter and no selection. Pagination is used only on `/components`, if more than 30 rows. The home matrix keeps its compact look: sorting only, with no toolbar.

- [ ] **Step 1: Write tests**
  - `support-matrix.test.tsx`: the server HTML contains every component row and family column.
  - e2e:
    - `support matrix sorts by component and hides a family column`.
    - `the name filter narrows rows and shows "No results." when nothing matches`.
    - `the matrix renders with JavaScript disabled`.

  Run them and confirm they fail.
- [ ] **Step 2:** Implement. The tests pass.
- [ ] **Step 3:** Commit `feat(www): build the component matrices on Data Table`.

### Task 9: Other swaps

- [ ] **Step 1: Find candidates**

  Search `apps/www/src` for:
  - hand-built `<table>`;
  - long-form text with per-element typography classes;
  - `role="menu"` or menubar-like bars;
  - fixed side columns;
  - nav lists with `aria-current`.

  For each part one of the six components can take over:
  - swap it;
  - update its tests;
  - list it in `docs/evidence/app-shell-09.md` (Site swaps).

  List the ones skipped, with the reason.

- [ ] **Step 2:** The affected tests pass.
- [ ] **Step 3:** Commit `refactor(www): move the remaining hand-built parts onto the 0.9 components` (skip if none).

### Task 10: Measure, audit and open the PR

- [ ] **Step 1: Measure First Load JS**

  Run `next build` and record First Load JS for the Task 1 routes. If any route grew by more than 10 kB gzipped:
  - code-split and re-measure;
  - if it is still over, record the route, the size and the cause in the evidence, and put it at the top of the PR.

- [ ] **Step 2: Run axe**

  Run an axe pass, using the existing e2e axe helper, on `/`, `/docs`, one `/docs/<slug>`, `/components`, one `/components/<id>`, and each editor at 1440 px and 375 px. Expect no violations.

- [ ] **Step 3: Run the gates**

  - `pnpm build:packages && pnpm generate:preview && pnpm typecheck && pnpm test:unit && pnpm test:integration`
  - `pnpm exec playwright test`, for the default suite including `site-shell.spec.ts` and the editor specs.

  All pass. Record the environment.

- [ ] **Step 4: Commit and open the PR**
  - Update `CHANGELOG.md` under Unreleased (site), then commit `docs(evidence): record the 0.9 site rebuild`.
  - Push `feat/site-app-shell` and open the PR "feat(www): rebuild the site on the 0.9 app shell", based on the Track 1 branch.
  - The PR body holds the Menubar mapping table, the swaps list, and the size table.
