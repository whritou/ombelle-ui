# Responsive Editors Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Give the preset editor and the component editors a phone structure (below 768 px) and a tablet structure (768–1199 px), keep the desktop structure, and fold the component row into a switcher on every width.

**Architecture:** One breakpoint module drives a `useViewportClass()` hook for the few places that render differently; everything else is CSS in the existing modules. New shell parts live in `apps/www/src/editor-shell/` (dock, More sheet) and `apps/www/src/editor/components/` (component switcher). Bottom sheets reuse the catalog Sheet, compiled into the site like the other catalog components; existing dialogs and popovers dock to the bottom through one phone stylesheet.

**Tech Stack:** Next.js 16 (`apps/www`), React 19, CSS modules, catalog components compiled by `scripts/generate-www-ui.ts`, Vitest (`renderToStaticMarkup` tests), Playwright with bundled Chromium.

**Spec:** `docs/superpowers/specs/2026-11-13-responsive-editors-design.md` (design boards: Editors page of https://claude.ai/artifact/1FMRGWoyJSwht9wATT838U).

## Global Constraints

- Branch `fix/responsive-editors` from `feat/variants-076` (the 0.7.6 stack); rebase onto `main` once PRs #123 and #124 merge.
- Node 24.19.0, pnpm 11.25.0 through corepack.
- Breakpoints: phone `(max-width: 767px)`, tablet `(min-width: 768px) and (max-width: 1199px)`, desktop `(min-width: 1200px)`. Replace the editors' current 800 px and 960 px breakpoints.
- Desktop (≥ 1200 px) keeps today's layout, except the component row, which becomes the switcher on every width.
- Touch targets in the top bar, strip, dock and sheets: at least 44 px below 1200 px.
- No horizontal overflow at 320, 375, 390 and 768 px: `document.documentElement.scrollWidth <= innerWidth`.
- Below 1200 px the document does not scroll (`scrollHeight <= innerHeight + 1`); panes scroll.
- Copy is fixed: dock labels "Customize", "Preview", "Checks" (preset) and "Customize", "Matrix", "Code" (component); switcher name "Component: {label}. Choose a component"; sheet titles "More actions", "Choose a component", "Checks and export"; button "Open preview".
- Run `pnpm build:packages` then `pnpm generate:preview` before any browser test (a stale preview manifest shows "Preview failed").

## Review Focus

- Resizing across 768 or 1200 px with a sheet, the drawer or a dialog open: the open surface closes or moves to the new structure and the draft is unchanged (test in Task 6).
- First paint on a phone: the server renders the desktop class, so nothing may depend on `useViewportClass()` for layout that CSS can do; no hydration warning in the console at 375 px (test in Task 2).
- Focus after closing a sheet returns to the button that opened it: More, switcher, Checks (tests in Tasks 3, 4 and 6).
- Liquid glass adds the transparency and backdrop controls: still no horizontal overflow at 375 px in both editors (test in Task 2).
- A long preset name or recipe ID at 320 px truncates inside the strip instead of widening the page (test in Task 3).

---

### Task 1: Breakpoints, viewport hook and the catalog Sheet in the site

**Files:**
- Create: `apps/www/src/editor-shell/breakpoints.ts`
- Test: `apps/www/src/editor-shell/breakpoints.test.ts`
- Modify: `apps/www/src/editor-shell/index.ts` (export the new module)
- Modify: `scripts/generate-www-ui.ts:9` (add `'sheet'` and `'native-select'` to `wwwUiComponents`)

**Interfaces:**
- Produces: `phoneQuery`, `tabletQuery`, `desktopQuery` (strings above); `type ViewportClass = 'phone' | 'tablet' | 'desktop'`; `viewportClass(matches: (query: string) => boolean): ViewportClass`; `useViewportClass(): ViewportClass` (server snapshot `'desktop'`, subscribes to the three media queries through `useSyncExternalStore`); `Sheet*` and `NativeSelect` under `apps/www/src/generated/ui/components/ui/`.

- [ ] **Step 1: Create the branch**

```bash
git switch feat/variants-076 && git switch -c fix/responsive-editors
```

- [ ] **Step 2: Write the failing test** `breakpoints.test.ts`

```ts
it('classifies widths at 767, 768, 1199 and 1200', () => {
  const at = (width: number) => (query: string) => evaluate(query, width)
  expect(viewportClass(at(767))).toBe('phone')
  expect(viewportClass(at(768))).toBe('tablet')
  expect(viewportClass(at(1199))).toBe('tablet')
  expect(viewportClass(at(1200))).toBe('desktop')
})
it('renders desktop on the server', () => {
  expect(renderToStaticMarkup(<Probe />)).toContain('desktop') // Probe renders useViewportClass()
})
```

`evaluate(query, width)` is a test helper that parses `min-width`/`max-width` in px.

- [ ] **Step 3: Run it to see it fail**

Run: `pnpm exec vitest run apps/www/src/editor-shell/breakpoints.test.ts`
Expected: FAIL, module not found.

- [ ] **Step 4: Implement `breakpoints.ts`, export it from `index.ts`, add the two components to `wwwUiComponents`**

- [ ] **Step 5: Run the test and the build**

Run: `pnpm exec vitest run apps/www/src/editor-shell/breakpoints.test.ts` → PASS.
Run: `pnpm build:packages && pnpm generate:preview` → `apps/www/src/generated/ui/components/ui/sheet.tsx` and `native-select.tsx` exist.

- [ ] **Step 6: Commit**

```bash
git add apps/www/src/editor-shell scripts/generate-www-ui.ts apps/www/src/generated/ui
git commit -m "feat(www): add editor breakpoints and compile Sheet and Native Select for the site"
```

### Task 2: Viewport shell below 1200 px

**Files:**
- Modify: `apps/www/src/site/header.tsx:19-21` (on `/editor/` routes add `max-[1199px]:hidden`)
- Modify: `apps/www/src/editor-shell/editor-shell.module.css` (`.topBar` not sticky below 1200)
- Modify: `apps/www/src/editor/components/button-editor.module.css` (replace the `max-width: 800px` block; add the 768–1199 and < 768 blocks)
- Modify: `apps/www/src/preset-editor/components/preset-editor.module.css` (replace the `max-width: 960px` and `800px` blocks the same way)
- Test: `tests/e2e/editors-responsive.spec.ts` (new)

**Interfaces:**
- Produces: the CSS contract later tasks rely on: below 1200 px `.root`/`.editor` are `height: 100dvh; display: flex; flex-direction: column; overflow: hidden`, the workspace/workbench is `flex: 1; min-height: 0`, each pane has `overflow-y: auto; overscroll-behavior: auto`, and the scroll-area wrappers drop `max-height`. Tablet: `grid-template-columns: 300px minmax(0, 1fr)` in both editors.

- [ ] **Step 1: Write the failing e2e cases** in `editors-responsive.spec.ts`, for `/editor/preset` and `/editor/component/button`, each at `{375, 812}`, `{320, 640}` and `{768, 1024}`:

```ts
expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(width)
expect(await page.evaluate(() => document.scrollingElement!.scrollHeight - innerHeight)).toBeLessThanOrEqual(1)
await expect(page.getByRole('navigation', { name: 'Main' })).toBeHidden() // inside the site header; check its aria-label in site/header.tsx first
expect(consoleErrors.filter(m => /hydrat/i.test(m))).toEqual([])
```

Add one case per editor at 375 px after switching to Liquid glass (`page.getByRole('button', { name: 'Liquid glass' }).click()` and confirming): the overflow assertion still holds.

- [ ] **Step 2: Run it to see it fail**

Run: `pnpm exec playwright test tests/e2e/editors-responsive.spec.ts`
Expected: FAIL at 375 px on the button editor (scrollWidth 563) and on scrollHeight for both.

- [ ] **Step 3: Implement the header class and the three stylesheets**

- [ ] **Step 4: Run the spec again** → the overflow, scroll and header cases PASS (dock and sheet cases come later).

- [ ] **Step 5: Commit**

```bash
git commit -am "fix(www): fit both editors to the viewport below 1200px"
```

### Task 3: Top bar and More sheet on phones

**Files:**
- Modify: `apps/www/src/editor-shell/top-bar.tsx` (props `back?: { label: string; href: string }`, `switcher?: ReactNode`, `links?: readonly { label: string; href: string }[]`; phone More button)
- Create: `apps/www/src/editor-shell/more-sheet.tsx`
- Modify: `apps/www/src/editor-shell/editor-shell.module.css`
- Test: `apps/www/src/editor-shell/more-sheet.test.tsx`, `apps/www/src/editor-shell/top-bar.test.tsx`, `tests/e2e/editors-responsive.spec.ts`

**Interfaces:**
- Consumes: `Sheet`, `SheetContent`, `SheetHeader`, `SheetTitle` (Task 1).
- Produces: `MoreActionsSheet({ open, onOpenChange, redo, onCommands, items, links }: { open: boolean; onOpenChange(open: boolean): void; redo: HistoryAction; onCommands?: () => void; items: readonly OverflowItem[]; links?: readonly { label: string; href: string }[] })`. `EditorTopBar` renders, below 768 px only (CSS), a 44 px "More actions" button that opens it, and hides Redo, the Commands button, the `ToolbarOverflow` trigger and `extra` from the bar. The bar row is: back link (if `back`), `switcher` or the breadcrumb, Undo, More, `primary`. Name field, revision and status wrap into a strip row below (`flex-basis: 100%`), name `flex: 1; min-width: 0`.

- [ ] **Step 1: Write the failing unit test** `more-sheet.test.tsx`: with `open` and items `[{id:'json',label:'Download JSON'},{id:'reset',label:'Reset all tokens…',destructive:true}]` and one link `{label:'Preset editor guide',href:'/docs/preset-editor'}`, the markup lists, in order, "Redo", "Commands", "Download JSON", "Preset editor guide", then a separator and "Reset all tokens…" with `data-destructive`; every item has `role="menuitem"`; the sheet has `aria-label="More actions"`.

- [ ] **Step 2: Write the failing e2e cases** at 375×812 for both editors: the top bar's height is ≤ 100 px; Redo and the Commands button are hidden; "More actions" opens a dialog whose bounding box touches the bottom (`box.y + box.height` within 1 px of 812) and spans the width; Escape closes it and focus is back on "More actions". At 320×640 with a 120-character preset name (fill the name field) the overflow assertion from Task 2 holds.

- [ ] **Step 3: Run both to see them fail**

Run: `pnpm exec vitest run apps/www/src/editor-shell/more-sheet.test.tsx` → FAIL, module not found.
Run: `pnpm exec playwright test tests/e2e/editors-responsive.spec.ts -g "More actions"` → FAIL.

- [ ] **Step 4: Implement `more-sheet.tsx` and the top bar changes.** Pass `links` from the preset editor (`Preset editor guide`) and move its `extra` draft note into the strip below 768 px. Keep the desktop bar markup unchanged; the existing `top-bar.test.tsx` cases must still pass.

- [ ] **Step 5: Run both again** → PASS, and `pnpm exec vitest run apps/www/src/editor-shell` → all PASS.

- [ ] **Step 6: Commit**

```bash
git commit -am "feat(www): compact editor top bar and More actions sheet on phones"
```

### Task 4: Component switcher replaces the component row

**Files:**
- Create: `apps/www/src/editor/components/component-switcher.tsx`
- Delete: `apps/www/src/editor/components/component-navigation.tsx`
- Modify: `apps/www/src/editor/components/button-editor.tsx:209,237`, `apps/www/src/editor/components/catalog-component-editor.tsx:132`
- Test: `apps/www/src/editor/components/component-switcher.test.tsx`, `tests/e2e/editors-responsive.spec.ts`

**Interfaces:**
- Consumes: `useViewportClass` (Task 1), `Sheet*` (Task 1), `EditorTopBar` `switcher` and `back` props (Task 3), `editableComponents`.
- Produces: `filterComponents(query: string, list = editableComponents)` (case-insensitive substring on `label`, keeps order); `ComponentSwitcher({ current }: { current: ComponentId })`: a button styled as the breadcrumb's current page with a chevron, accessible name `Component: {label}. Choose a component`, opening a Sheet (`side="bottom"` on phone, `side="inline-end"` otherwise) titled "Choose a component" with a search field labelled "Search components", the filtered list (current item `aria-current="page"` with "Editing"), then links "Browse all components" (`/components`) and "Component editor guide" (`/docs/component-editor`). Editors pass `back={{ label: 'All components', href: '/editor/component' }}` and `switcher={<ComponentSwitcher current={id} />}`.

- [ ] **Step 1: Write the failing unit tests**: `filterComponents('ACC')` returns only labels containing "acc" in order; `filterComponents('')` returns the whole list; the switcher's markup has the accessible name `Component: Button. Choose a component` and `aria-haspopup="dialog"`.

- [ ] **Step 2: Write the failing e2e cases** at 1440 and 375 px: no element with `aria-label="Editable components"` exists; the switcher opens the sheet; typing "but" leaves "Button" and "Button Group" only when Button Group is editable, else "Button"; "Browse all components" has `href="/components"`; Escape returns focus to the switcher.

- [ ] **Step 3: Run them to see them fail** (`pnpm exec vitest run apps/www/src/editor/components/component-switcher.test.tsx`, `pnpm exec playwright test tests/e2e/editors-responsive.spec.ts -g "switcher"`).

- [ ] **Step 4: Implement the switcher, wire both editors, delete the old row and its `.componentNavigation` CSS**

- [ ] **Step 5: Run the new tests and `tests/e2e/editor.spec.ts` and `tests/e2e/catalog-editors.spec.ts`** → new cases PASS; the editor specs show no new failures against the recorded baseline (`docs/evidence/components-076.md`, Browser tests).

- [ ] **Step 6: Commit**

```bash
git commit -am "feat(www): fold the component row into a component switcher"
```

### Task 5: Dock and component editor structures

**Files:**
- Create: `apps/www/src/editor-shell/dock.tsx`
- Delete: `apps/www/src/editor/components/editor-tabs.tsx`
- Modify: `apps/www/src/editor/model.ts:12` (`panel: 'customize' | 'matrix' | 'code'`, initial `'customize'`)
- Modify: `apps/www/src/editor/components/button-editor.tsx`, `apps/www/src/editor/components/catalog-component-editor.tsx`, `apps/www/src/editor/components/button-editor.module.css`
- Test: `apps/www/src/editor-shell/dock.test.tsx`, `tests/e2e/editor.spec.ts:247-260` (rewrite "mobile workspace tabs"), `tests/e2e/editors-responsive.spec.ts`

**Interfaces:**
- Consumes: `useViewportClass` (Task 1), the Task 2 CSS contract, `MatrixLayout` (`matrix.setLayout`).
- Produces: `EditorDock<T extends string>({ label, value, tabs, onChange }: { label: string; value: T; tabs: readonly { value: T; label: string; icon: ReactNode; badge?: number }[]; onChange(value: T): void })`: a `nav` with `aria-label={label}` holding a catalog segmented `ToggleGroup`, fixed 12 px from the sides and 16 px from the bottom, items at least 48 px, shown only below 768 px (CSS). The editor panes get `padding-bottom: 96px` below 768 px so the dock never covers content.
- Component editor on a phone: Customize shows a sticky preview card (specimen 128 px high, light/dark icon-only toggle, a `NativeSelect` labelled "Preview state" with Rest, Hover, Focus, Active, Disabled, Loading) above the rail; the width, layout and full state toggles are hidden. Matrix shows the preview section with `matrix.setLayout('matrix')` applied on entering and `'single'` restored on leaving. Code shows the generated output with code wrapping (`white-space: pre-wrap; overflow-wrap: anywhere`). Tablet: width toggle hidden, the state toggle fills a row.

- [ ] **Step 1: Write the failing unit test** `dock.test.tsx`: three tabs render in order with their labels, the pressed one has `data-state="on"`, a `badge: 1` renders a visually separate count with `aria-label` text "1 warning" on the item.

- [ ] **Step 2: Rewrite the "mobile workspace tabs" e2e case** for 390×844: tabs "Customize", "Matrix", "Code" in a `nav` named "Button editor panes" (catalog editors: "{Name} editor panes"); editing Button text in Customize updates the pinned specimen; Code shows the text; the dock's bottom is 16 px above the viewport bottom. Add a 768×1024 case: the rail and the preview are side by side (`rail.x + rail.width <= preview.x`) and the dock is hidden.

- [ ] **Step 3: Run them to see them fail** (vitest on `dock.test.tsx`; `pnpm exec playwright test tests/e2e/editor.spec.ts -g "mobile workspace"`).

- [ ] **Step 4: Implement the dock, the model change and both component editors' structures**

- [ ] **Step 5: Run the unit tests, the rewritten case, `tests/e2e/editors-responsive.spec.ts` and `tests/e2e/editors-matrix.spec.ts`** → PASS.

- [ ] **Step 6: Commit**

```bash
git commit -am "feat(www): phone dock and tablet split for the component editors"
```

### Task 6: Preset editor structures

**Files:**
- Modify: `apps/www/src/preset-editor/components/preset-editor.tsx` (dock, peek, Checks pane, tablet Checks sheet)
- Modify: `apps/www/src/preset-editor/components/preset-editor.module.css`
- Test: `tests/e2e/preset-editor.spec.ts`, `tests/e2e/editors-responsive.spec.ts`

**Interfaces:**
- Consumes: `EditorDock` (Task 5), `useViewportClass`, `Sheet*`, `Collapsible`, `ReviewDrawer`'s tab objects (built once and reused for the drawer, the Checks pane and the sheet).
- Produces: preset pane state `'customize' | 'preview' | 'checks'` (preview state only, not stored), dock label "Preset editor panes".
- Phone: Customize keeps one `PresetPreviewFrame`; its preview section becomes a sticky card (thumbnail 112×84, frame scaled to 0.287, `pointer-events: none`, `inert`) with the page name, the status pill and an "Open preview" button that switches to Preview. Preview shows the full frame with a light/dark icon toggle and a `NativeSelect` "Preview page"; the width toggle is hidden. Checks shows `PresetChecks` and, under it, a Collapsible "Export" (open) holding `PresetExportPanel`. The review drawer slot is hidden.
- Tablet: the drawer slot is hidden; the top bar's `extra` gets a 44 px "Checks and export" button with the warning badge that opens a bottom Sheet titled "Checks and export" with the drawer's two tabs.

- [ ] **Step 1: Write the failing e2e cases** at 375×812: the dock has the three tabs; in Customize the preview card is visible and stays in place after scrolling the pane by 600 px; "Open preview" selects Preview; Checks lists the contrast results and an open "Export" section with "Get code". At 768×1024: inspector and preview side by side; "Checks and export" opens a sheet touching the bottom; Escape returns focus to it. Resize case: at 1440 open the drawer on Export, resize to 375: the Checks pane is active and the preset name is unchanged; resize back to 1440: the drawer shows Export.

- [ ] **Step 2: Run them to see them fail** (`pnpm exec playwright test tests/e2e/editors-responsive.spec.ts -g "preset"`).

- [ ] **Step 3: Implement the phone and tablet structures**

- [ ] **Step 4: Run the new cases and `tests/e2e/preset-editor.spec.ts`** → new cases PASS; no new failures against the recorded baseline.

- [ ] **Step 5: Commit**

```bash
git commit -am "feat(www): phone panes and tablet split for the preset editor"
```

### Task 7: Bottom sheets for dialogs and popovers, steppers on phones

**Files:**
- Create: `apps/www/src/editor-shell/phone-sheets.css` (imported from `apps/www/src/app/editor/preset/page.tsx` and both component editor pages)
- Modify: `apps/www/src/editor-shell/editor-shell.module.css` (`.sliderRange { display: none }` and 44 px number inputs below 768 px)
- Test: `tests/e2e/editors-responsive.spec.ts`

**Interfaces:**
- Produces: below 768 px, `[data-slot='dialog-content']`, `[data-slot='alert-dialog-content']`, the popper wrapper holding `[data-slot='color-picker-content']`, and `.preset-popover` are fixed to the bottom: `inset: auto 0 0 0; width: 100%; max-height: 92dvh; border-radius: 20px 20px 0 0; transform: none`, with a 40×5 px handle drawn by `::before`. Desktop and tablet are unchanged.

- [ ] **Step 1: Write the failing e2e cases** at 375×812 for: Get code (both editors), the style family confirmation (choose Neo-brutalism in the preset editor), ID & revision (from More actions), the colour token popover (tap "Muted foreground colors…") and the Button colour picker ("Open Light background color picker"). Each: the surface's box bottom within 1 px of 812, `x` 0, width 375. At 375 px no `[data-slot='slider']` is visible inside the inspectors and every `[data-slot='number-input']` is at least 44 px high.

- [ ] **Step 2: Run them to see them fail**

- [ ] **Step 3: Implement `phone-sheets.css` and the stepper rule**

- [ ] **Step 4: Run them again** → PASS; run `tests/e2e/editor-inputs-075.spec.ts` → no new failures.

- [ ] **Step 5: Commit**

```bash
git commit -am "feat(www): dock editor dialogs and popovers to the bottom on phones"
```

### Task 8: Evidence, docs and full check

**Files:**
- Create: `docs/evidence/responsive-editors.md`
- Modify: `CHANGELOG.md` (Unreleased: "Editors work on phones and tablets"), `apps/www/src/site/docs/guides.tsx:137` (the guide's "Choose a component" step now names the switcher)

- [ ] **Step 1: Run the whole check**

```bash
pnpm build:packages && pnpm generate:preview && pnpm typecheck
```

```bash
pnpm exec vitest run apps/www
```

```bash
pnpm exec playwright test tests/e2e/editors-responsive.spec.ts tests/e2e/editor.spec.ts tests/e2e/preset-editor.spec.ts tests/e2e/editor-commands.spec.ts tests/e2e/catalog-editors.spec.ts tests/e2e/editors-matrix.spec.ts tests/e2e/editors-glass.spec.ts
```

Expected: typecheck and unit PASS; the responsive spec PASS; the editor specs show only the recorded baseline failures.

- [ ] **Step 2: Measure First Load JS** with `node scripts/measure-www-first-load.mjs` after `corepack pnpm run build` in `apps/www`, for `/editor/preset` and `/editor/component/button`, against the `components-076` "after" numbers.

- [ ] **Step 3: Write `docs/evidence/responsive-editors.md`**: environment, the commands and results above, the size table, and screenshots' locations if taken; record any baseline failure by name.

- [ ] **Step 4: Commit**

```bash
git add docs CHANGELOG.md apps/www/src/site/docs/guides.tsx
git commit -m "docs(evidence): record the responsive editors checks"
```
