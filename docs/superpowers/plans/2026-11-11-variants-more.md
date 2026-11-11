# Variants batches 6b and 6c Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add the 0.7.3 board variants to Tabs, Table, Input with Textarea and Input Group, Pagination, Select, Toast and Sheet, and fix Toast's pause, duration and announcement, in both editions and all five families. Every default stays.

**Architecture:**
- The batch 6a conventions apply:
  - optional props setting `data-*` attributes, or new parts with their own `data-slot`;
  - CSS appended by `scratchpad/gen-variants-more.mjs` between `/* 0.7.3 variants */` markers;
  - recipe fields in `schemas/`, specimens in `recipe-specimen.ts`, and the CLI 0.7.3 gate in `install-command.ts`.
- The browser fixture `VariantsMoreScenario` is created in Task 2 and extended by each component task.
- The browser tests live in `tests/e2e/variants-more.spec.ts`, which each task extends with its own cases.

**Tech Stack:**
- TypeScript ES modules, React 19 and lucide-react 1.55.0.
- Radix (`@radix-ui/react-select`, `@radix-ui/react-popover`, `@radix-ui/react-toast`, `@radix-ui/react-dialog`) and `@base-ui/react` 1.9.0, at their existing pins.
- Vitest and Playwright.

**Spec:** `docs/superpowers/specs/2026-11-11-variants-more-design.md`

## Global Constraints

- **Toolchain and branch:** Node 24.19.0 and pnpm 11.25.0, through `corepack pnpm`. Branch `feat/variants-more-073`, stacked on `feat/variants-basics-073` (PR #106).
- **Commits:** Conventional Commits, no `codex` prefix.
- **Sources:**
  - Edit `schemas/` and catalog sources only.
  - Run `corepack pnpm build:packages` after package changes, and `corepack pnpm generate:preview` before e2e runs.
- **No breaking change:** leaving a new prop out renders what is rendered today, with no new attribute. The re-recorded hashes may change only for these nine components, the family stylesheets and Button-free baselines. Any baseline change gets an `intentionalChanges` entry. The Toast default duration change is the one intended behaviour change, recorded as such.
- **Board source:** sections 05 to 10, 12 and 14 of `scratchpad/artifact-files/0200fefe-623b-4550-9795-0ba26acade31/project/<Family>073Variants.dc.html`, with batch 6a's token mapping.
- **Exact copy:**
  - Clear: `Clear`.
  - Actions header: `Actions`.
  - Compact pagination: `Page {page} of {pageCount}`, with `Previous page` and `Next page`.
  - Page size label: `Rows per page`.
  - Sheet handles: `Resize sheet` and `Resize panel`.
- **Exact values:**
  - Toast duration: 6000ms, plus 60ms for each character of title and description beyond 80, capped at 10000. `Infinity` with an action; an explicit `duration` wins.
  - Sheet bottom height: 25 to 95 % of the viewport, in 10 % steps, closing below 25 %.
  - Resizable panel: default 320, minimum 240, maximum 640, in 16px steps, or 64px with Shift.
- **CSS rules:**
  - One `data-slot` per selector, with markers `data-<component>-…`.
  - Logical properties.
  - Forced-colours blocks in every family.
  - Nothing moves under `prefers-reduced-motion: reduce`.
  - Targets of at least 24px.
  - The glass ring is 2px `--foreground` with no gap, and no glass selector names two slots.
- **Not resized:** the default Button and Input.
- **Gate:** any new recipe field, and `tabs.appearance = 'pills'`, needs CLI 0.7.3.
- **Reruns:**
  - Only tests that a change can affect.
  - The audit runs only with `OMBELLE_AUDIT_COMPONENTS=tabs,table,input,textarea,input-group,pagination,select,toast,sheet`.
  - Stop any preview server before e2e runs, and put the scratchpad `pnpm` shim (`scratchpad/bin`) on `PATH` for Playwright.
- **Writing files:** files that contain backslashes are written with Write or Edit, never a shell heredoc.
- **Remote actions:** no push, release or deploy without asking.

## Review Focus

- **A controlled multiple Select whose `value` changes from outside**, such as a Reset button: the chips and `aria-selected` follow at once. Task 5 pins this with a fixture Reset button.
- **A `ToastPromise` whose promise settles after the component unmounts:** no React warning and no orphan toast. Task 6 pins this with an e2e case that unmounts it while pending.
- **The Sheet resized below its minimum by a drag past the edge, or with a viewport narrower than `maxSize`:** the size clamps to the bounds and to the viewport. Task 7 pins this with a drag past the edge in a 700px viewport.
- **Clear on an input the consumer controls:** `onClear` is called, and focus moves to the input even when the consumer empties it asynchronously. Task 4 pins this with a controlled fixture.
- **A sortable `TableHead` inside a sticky header:** the sort button keeps its focus ring above the scrolled rows. Task 3 pins this with a focus check after scrolling.

---

### Task 1: Recipe fields and the gate

**Files:**
- Modify:
  - `schemas/component-recipe.schema.json`, in the props of these branches (no schema defaults):
    - **tabs:** `appearance` gains `pills`; `counts` boolean.
    - **table:** `stickyHeader`, `sortable`, `actions` and `loading` booleans.
    - **input and textarea:** `size` enum `sm|default|lg`.
    - **input-group:** `clearable` and `counter` booleans.
    - **pagination:** `layout` enum `default|compact`; `pageSize` boolean.
    - **select:** `multiple` and `icons` booleans.
    - **toast:** `mode` enum `default|promise|stack`.
    - **sheet:** `handle` and `resizable` booleans.
  - `apps/www/src/snapshots/install-command.ts`: extend `variantRecipeFields073` with these keys, and `variantRecipeValues073` with `tabs.appearance: ['pills']`.
  - Then run `node scripts/sync-schema.mjs`.
- Test:
  - `packages/contracts/test/component-recipe.test.ts`;
  - `apps/www/src/snapshots/install-compatibility.test.tsx`.

- [ ] **Step 1: Write the failing tests.**
  - Each field accepts its allowed values.
  - `size: 'xl'`, `layout: 'wide'` and `mode: 'queue'` are rejected at their paths.
  - Recipes without the fields gain no key.
  - At 0.7.2, `{ component: 'tabs', props: { appearance: 'pills' } }` is blocked, and `{ appearance: 'underline' }` is not.
  - Each new field is blocked at 0.7.2 and allowed at 0.7.3.
- [ ] **Step 2: Run** `corepack pnpm exec vitest run packages/contracts/test/component-recipe.test.ts apps/www/src/snapshots/install-compatibility.test.tsx`. Expected: FAIL.
- [ ] **Step 3: Implement.** Edit the schema with a Python JSON load and dump, which round-trips the file byte for byte, then add the gate.
- [ ] **Step 4: Run** the same command. Expected: PASS.
- [ ] **Step 5: Commit** with `feat(contracts): add the batch 6b and 6c recipe fields and their 0.7.3 gate`.

### Task 2: Generator, Tabs and Pagination

**Files:**
- Create:
  - `scratchpad/gen-variants-more.mjs`, a copy of the batch 6a generator's frame (markers, `ring(family)`, `familyRules`), with a `sections.tabs` and a `sections.pagination`;
  - `packages/catalog/test/tabs-variants.test.ts`;
  - `packages/catalog/test/pagination-variants.test.ts`.
- Modify:
  - `templates/tabs.tsx`, `base/tabs.tsx` and `templates/pagination.tsx`;
  - `component-slots.ts`: `tabs-count`, `pagination-compact`, `pagination-page-size`;
  - `fixtures/shared/edition-scenario*.tsx`: a new `VariantsMoreScenario` (section `data-testid="variants-more"`) with vertical pill Tabs with counts, compact Pagination and a page-size select;
  - `playwright.config.ts` and `playwright.specimen-audit.config.ts`: register `variants-more.spec.ts` the way `variants-basics.spec.ts` is.
- Create: `tests/e2e/variants-more.spec.ts`.

**Interfaces:**
- **Tabs:**
  - `TabsList appearance` gains `'pills'`.
  - `TabsCount(props: React.ComponentProps<'span'>)` renders `data-slot="tabs-count"`.
- **Pagination:**
  - `PaginationCompact(props: { page: number; pageCount: number; previousHref?: string; nextHref?: string; onPrevious?: () => void; onNext?: () => void; className?: string })`:
    - it renders inside `Pagination` and shows `Page {page} of {pageCount}`;
    - the previous and next controls are links when an href is given and the page is not an end, and buttons otherwise;
    - they are disabled at the ends (`aria-disabled` on links, `disabled` on buttons).
  - `PaginationPageSize(props: { value: number; options?: readonly number[]; onValueChange?: (value: number) => void; label?: string; range?: React.ReactNode; id?: string })`:
    - `options` defaults to `[10, 25, 50, 100]` and `label` to `'Rows per page'`;
    - the label is tied to the select through `useId`.

- [ ] **Step 1: Write the failing tests.**
  - **Unit, by server rendering:**
    - `TabsCount` is inside the trigger's text, so the accessible name is "Review3" by textContent.
    - `appearance="pills"` sets `data-appearance`.
    - Without `orientation` there is no `data-orientation='vertical'`.
    - `PaginationCompact page={1} pageCount={12}` disables Previous and shows `Page 1 of 12`.
    - `PaginationPageSize` renders a `select` labelled `Rows per page` with four options.
    - The stylesheets have the vertical, pills, count, compact and page-size rules in each family.
  - **e2e, in both editions:**
    - Vertical tabs move with ArrowDown and ArrowUp.
    - Compact pagination is disabled at the ends.
    - Changing the page size updates the range output.
- [ ] **Step 2: Run** the two unit files and `corepack pnpm exec playwright test -c playwright.specimen-audit.config.ts tests/e2e/variants-more.spec.ts`. Expected: FAIL.
- [ ] **Step 3: Implement** the templates and the generator sections, using the board's `.tvx`, `.tpl`, `.cnt`, `.pgc` and `.psz` rules mapped to slots. Then run the generator, `build:packages` and `generate:preview`.
- [ ] **Step 4: Run** the same commands. Expected: PASS.
- [ ] **Step 5: Commit** with `feat(catalog): add vertical and pill Tabs with counts, and compact Pagination with page size`.

### Task 3: Table

**Files:**
- Modify:
  - `templates/table.tsx`;
  - `component-slots.ts`: `table-sort`, `table-skeleton`;
  - the generator's `sections.table`;
  - the fixture: a scrolling sortable table with a sticky header, an actions column and a Loading toggle.
- Test:
  - `packages/catalog/test/table-variants.test.ts`;
  - e2e cases.

**Interfaces:**
- **`Table`:** `TableProps` gains `stickyHeader?: boolean`, which sets `data-sticky-header`, and `loading?: boolean`, which sets `aria-busy`.
- **`TableHead`:**
  - It gains `sort?: 'ascending' | 'descending' | 'none'`, `onSort?: () => void` and `actions?: boolean`.
  - With `onSort`, its children are wrapped in `<button type="button" data-slot="table-sort">`, followed by a lucide `ArrowUp`, `ArrowDown` or `ArrowUpDown` icon, `aria-hidden`.
  - The `th` gets `aria-sort` only for ascending or descending.
  - `actions` with no children renders `<span className="sr-only">Actions</span>`, through the catalog's visually-hidden pattern.
- **`TableCell`:** it gains `actions?: boolean`.
- **`TableSkeletonRows`:** `TableSkeletonRows({ rows = 3, columns }: { rows?: number; columns: number })` renders `<tr>`s whose cells hold `<span data-slot="table-skeleton" aria-hidden="true">`, at widths cycling 80, 60, 50, 65, 70 and 40 %.
- **Dependencies:** `extraDependencies.table` gains `lucide-react`, and the contract test is updated.

- [ ] **Step 1: Write the failing tests.**
  - **Unit:**
    - `aria-sort="descending"` is on the `th`, and the button carries the header's text.
    - There is no `aria-sort` for `none` or without `sort`.
    - An actions head is named "Actions" through hidden text.
    - Skeleton rows render `rows × columns` bars.
    - `loading` sets `aria-busy`.
    - Default output is unchanged: no new attributes.
  - **e2e:**
    - Clicking the Updated header cycles `aria-sort`.
    - After scrolling the container, the header's top equals the container's top.
    - The focus ring of the sort button stays visible while scrolled (Review Focus).
    - Loading shows `aria-busy` and the skeleton bars.
- [ ] **Step 2: Run** the unit and e2e tests. Expected: FAIL.
- [ ] **Step 3: Implement** the template and `sections.table`:
  - the sticky header on `[data-slot='table'][data-sticky-header] [data-slot='table-head']` through `:is()`, with `position: sticky`, `inset-block-start: 0`, `z-index: 1` and the `--card` background;
  - shimmer keyframes inside `prefers-reduced-motion: no-preference`.
- [ ] **Step 4: Run** the tests. Expected: PASS.
- [ ] **Step 5: Commit** with `feat(catalog): add sticky, sortable and loading Tables with an actions column`.

### Task 4: Input, Textarea and Input Group

**Files:**
- Modify:
  - `templates/input.tsx`, `textarea.tsx` and `input-group.tsx`;
  - `component-slots.ts`: `input-group-clear`, `input-group-count`;
  - the generator's `sections.input`, `sections.textarea` and `sections.input-group`;
  - the fixture: three sizes, a controlled clearable search, and a Textarea with a counter at 160.
- Test:
  - `packages/catalog/test/input-variants.test.ts`;
  - e2e cases.

**Interfaces:**
- **`size`:** `Input` and `Textarea` gain `size?: 'sm' | 'default' | 'lg'`, which sets `data-size` only when it is not `default`. The `size` HTML attribute is shadowed; the docs mention it.
- **`InputGroupClear`:** `InputGroupClear({ label = 'Clear', onClear, ...props })`.
  - It renders `<button type="button" data-slot="input-group-clear" aria-label={label}>` with lucide `X`.
  - On click, it calls `onClear`, then focuses `closest('[data-slot="input-group"]')?.querySelector('input, textarea')`.
- **`InputGroupCount`:** `InputGroupCount({ value, max, id })`.
  - It renders `<span data-slot="input-group-count" id={id}>{value} / {max}</span>`.
  - `aria-live="polite"` is set only when `value >= max * 0.9`, and `data-over` when `value > max`.
- **Dependencies:** `extraDependencies['input-group']` gains `lucide-react`.

- [ ] **Step 1: Write the failing tests.**
  - **Unit:**
    - `size="sm"` sets `data-size`, and `default` sets nothing.
    - Clear is named `Clear` by default.
    - The count at 100 of 160 has no `aria-live`; at 150 it has `polite`; at 161 it has `data-over`.
    - The CSS hides Clear under `:placeholder-shown`.
  - **e2e:**
    - Typing, then Clear, empties the controlled input and focuses it (Review Focus).
    - Typing past 160 makes the counter live, with the destructive colour by computed style.
- [ ] **Step 2: Run.** Expected: FAIL.
- [ ] **Step 3: Implement.**
  - CSS: `sm` takes `min-block-size: 2rem` and `font-size: 0.8125rem`, and `lg` `3rem` and `1rem`. Padding scales from each family's default, read from its input rule.
  - Clear is hidden with `[data-slot='input-group-clear']:is(:has(> input:placeholder-shown, > textarea:placeholder-shown) *) { display: none }`, which names one slot.
  - `:placeholder-shown` needs a `placeholder` attribute. The docs say so, and suggest `placeholder=" "` when no hint text is wanted.
- [ ] **Step 4: Run.** Expected: PASS.
- [ ] **Step 5: Commit** with `feat(catalog): add Input sizes, a Clear button and a character counter`.

### Task 5: Select

**Files:**
- Modify:
  - `templates/select.tsx` (Radix edition) and `base/select.tsx`;
  - `component-slots.ts`: `select-chip`, `select-item-icon`, `select-listbox`;
  - `index.ts`: `extraDependencies.select` gains `@radix-ui/react-popover`;
  - the generator's `sections.select`;
  - the fixture: a multiple Select of roles, with icons and groups, in a form with a submit output and a Reset button that sets `[]`.
- Test:
  - `packages/catalog/test/select-variants.test.ts`;
  - e2e cases.

**Interfaces (the same in both editions):**
- **`Select`:** `SelectProps` becomes a union of today's single props and `{ multiple: true; value?: string[]; defaultValue?: string[]; onValueChange?: (value: string[]) => void; name?: string }`.
- **Parts:** `SelectTrigger`, `SelectValue`, `SelectContent`, `SelectItem`, `SelectGroup`, `SelectLabel` and `SelectSeparator` keep their names in multiple mode.
- **`SelectValue`:** in multiple mode, it renders one `<span data-slot="select-chip">` per chosen label, or the placeholder.
- **`SelectItem icon`:** `icon?: React.ReactNode` renders `<span data-slot="select-item-icon" aria-hidden="true">`.
- **Radix multiple:**
  - `Select` provides a context (open state, values, a registry of item ids and labels, and the highlighted index).
  - `SelectTrigger` renders the Popover trigger: a `button` with `role="combobox"`, `aria-haspopup="listbox"`, `aria-expanded`, `aria-controls` and `aria-activedescendant`.
  - `SelectContent` renders the Popover content holding `<div role="listbox" aria-multiselectable="true" data-slot="select-listbox">`.
  - `SelectItem` renders `role="option"` with `aria-selected` and `data-highlighted`.
  - Focus stays on the trigger.
  - **Keys:**
    - ArrowDown and ArrowUp move;
    - Home and End go to the ends;
    - printable characters do typeahead on the label, within 500ms;
    - Space and Enter toggle;
    - Escape and Tab close and keep focus on the trigger.
  - Clicking an option toggles it and keeps the list open.
  - Hidden `<input type="hidden" name value>` elements, one per value, follow the trigger.
- **Base UI multiple:** Base UI `Select.Root multiple` with the same parts. `SelectValue` maps its value array to chips.

- [ ] **Step 1: Write the failing tests.**
  - **Unit, by server rendering, both editions:**
    - a multiple Select with `defaultValue: ['designer', 'engineer']` renders two chips and two hidden inputs named `roles`;
    - the trigger carries `aria-haspopup="listbox"`;
    - single mode output is unchanged;
    - `icon` renders an `aria-hidden` span.
  - **e2e, both editions:**
    - The keyboard opens the list, ArrowDown, Space, ArrowDown and Space choose two, and Escape closes it with focus on the trigger.
    - The chips show both labels.
    - A pointer click toggles a third, with the list still open.
    - Submit outputs the three values.
    - Reset clears the chips and `aria-selected` (Review Focus).
- [ ] **Step 2: Run.** Expected: FAIL.
- [ ] **Step 3: Implement** both editions and the generator section: the board's chips in the trigger, the group label, the separator and the icon gap.
- [ ] **Step 4: Run.** Expected: PASS.
- [ ] **Step 5: Commit** with `feat(catalog): add a multiple Select with chips, item icons and group styles`.

### Task 6: Toast

**Files:**
- Modify:
  - `templates/toast.tsx` and `base/toast.tsx`;
  - `component-slots.ts`: `toast-spinner`;
  - the generator's `sections.toast`;
  - the fixture: a `ToastPromise` that resolves and one that rejects (with a test hook), a toast with an action, a three-toast stack, and an unmount-while-pending toggle.
- Test:
  - `packages/catalog/test/toast-variants.test.ts`;
  - e2e cases.

**Interfaces (both editions):**
- **`toastDuration`:** `export function toastDuration(content: { title?: string; description?: string; action?: boolean }, explicit?: number): number` returns `explicit ?? (content.action ? Infinity : Math.min(10000, 6000 + 60 * Math.max(0, (title + description).length - 80)))`.
- **`ToastProvider`:** `duration` no longer defaults to 5000. The Radix edition passes `duration ?? 6000` to the primitive, and each `Toast` passes `toastDuration(...)` from its text when it has no `duration`.
  - The Radix `Toast` reads its title and description text from the `ToastTitle` and `ToastDescription` children, through `React.Children` and string children.
  - It looks for a `ToastAction` child.
- **`ToastPromise`:** `ToastPromise<T>({ promise, loading, success, error }: { promise: Promise<T>; loading: React.ReactNode; success: React.ReactNode | ((value: T) => React.ReactNode); error: React.ReactNode | ((reason: unknown) => React.ReactNode) })`.
  - It renders one toast whose title is the current content.
  - While pending: `data-state-promise="pending"`, a `toast-spinner` and `duration={Infinity}`. When settled: `variant` `success` or `destructive` and the computed duration.
  - It ignores a promise that settles after unmount (Review Focus).
- **`ToastViewport stack`:** `stack?: boolean` sets `data-stack`.
- **Announcement:** decided by the Step 2 measurement. Record the count per edition in the ledger.

- [ ] **Step 1: Write the failing tests.**
  - **Unit:** `toastDuration`:
    - `({ title: 'Saved' })` → 6000;
    - a 130-character text → 9000;
    - a 400-character text → 10000;
    - `{ action: true }` → `Infinity`;
    - `(…, 3000)` → 3000.
  - **Unit:** `ToastPromise` exists in both editions, and `stack` sets `data-stack`.
  - **e2e, both editions, with `page.clock`:**
    - A hovered toast is still open at 7000ms and closes after the pointer leaves.
    - A focused toast is still open, and closes after blur.
    - The promise resolves to `success` and rejects to `destructive`.
    - With the promise pending, the toast is still open at 20000ms.
    - Unmounting while pending logs no console errors.
    - Exactly one element matching `[aria-live], [role=status], [role=alert]` contains the toast title's text once it has opened.
    - The stack shows one full toast, and three after hovering.
- [ ] **Step 2: Run.** Expected: FAIL on the new API. Record the announcement and pause cases' results: they show whether the primitives already pass.
- [ ] **Step 3: Implement** the helper, `ToastPromise`, the stack CSS (board `.tstack`; offsets 8 and 16px, scales 0.96 and 0.92, expanded with `:hover` and `:focus-within`, and `data-expanded` for Base UI), and any announcement or pause fix the measurement requires.
- [ ] **Step 4: Run.** Expected: PASS.
- [ ] **Step 5: Commit** with `feat(catalog): add ToastPromise, stacked toasts and a content-based duration`, plus `fix(catalog): …` for any announcement or pause fix.

### Task 7: Sheet

**Files:**
- Modify:
  - `templates/sheet.tsx` and `base/sheet.tsx`;
  - `component-slots.ts`: `sheet-handle`, `sheet-resize-handle`;
  - the generator's `sections.sheet`;
  - the fixture: a bottom sheet with a handle, and a resizable inline-end inspector with a size output.
- Ruling taken while planning: templates are single files, so the resize hook `useSheetSize` is written in both `sheet.tsx` and `base/sheet.tsx`, between `// sheet size hook` markers, and a test asserts that the two copies are identical text.
- Test:
  - `packages/catalog/test/sheet-variants.test.ts`;
  - e2e cases.

**Interfaces (both editions):**
- **`SheetHandle`:** `SheetHandle({ label = 'Resize sheet' })`.
  - It renders `role="separator"`, `aria-orientation="horizontal"`, `tabIndex={0}`, `aria-label`, `aria-valuenow`, `aria-valuemin={25}` and `aria-valuemax={95}`, with `data-slot="sheet-handle"`.
  - It sets the content's `block-size` in `vh` through a context from `SheetContent`.
  - The keyboard moves the height by ±10, and Home and End go to the bounds. A pointer drag uses `setPointerCapture`.
  - Releasing below 25 % calls the Sheet's `onOpenChange(false)`, through the root context: Radix `DialogPrimitive` close, or Base UI `Dialog` close.
- **`SheetContent resizable`:** `SheetContentProps` gains `resizable?: boolean`, `defaultSize?: number` (320), `minSize?: number` (240), `maxSize?: number` (640) and `onSizeChange?: (size: number) => void`.
  - When `resizable` and the side is inline, it renders `<div role="separator" aria-orientation="vertical" aria-label="Resize panel" data-slot="sheet-resize-handle" tabIndex={0}>` on the open edge, and sets `inline-size`.
  - The size clamps to `[minSize, min(maxSize, window.innerWidth - 16)]` (Review Focus).
  - The keyboard moves by ±16, or ±64 with Shift, and Home and End go to the bounds.

- [ ] **Step 1: Write the failing tests.**
  - **Unit:**
    - The separators' ARIA attributes and default values.
    - The resize hook copies are identical in both templates.
    - Default `SheetContent` output is unchanged.
  - **e2e, both editions:**
    - The bottom handle: ArrowUp raises `aria-valuenow` by 10; a drag below 25 % closes the sheet and returns focus to its trigger.
    - The panel: ArrowLeft on the inline-end handle widens it by 16, Shift+ArrowLeft by 64, and End gives 640. A pointer drag 1000px outward in a 700px viewport stops at 684, and a drag inward stops at 240.
- [ ] **Step 2: Run.** Expected: FAIL.
- [ ] **Step 3: Implement** the templates and the CSS: the board's `.hdl` pill (2.5rem × 0.25rem in a 24px target) and `.grip` (an 8px hit area, with a 2px line on hover and focus). No transition while dragging (`data-dragging`).
- [ ] **Step 4: Run.** Expected: PASS.
- [ ] **Step 5: Commit** with `feat(catalog): add a bottom Sheet handle and a resizable side Sheet`.

### Task 8: Specimens, scenes, gallery and site

**Files:**
- Modify:
  - `packages/compiler/src/recipe-specimen.ts`: a specimen for each Task 1 field, passing each prop only when it is present;
  - `apps/preview/src/scenes/projects.tsx` and `settings.tsx`, per the spec's Preview section;
  - `apps/www/src/preset-editor/preview-scenes.ts`;
  - `fixtures/shared/preset-gallery.tsx`;
  - `apps/www/src/site/components/catalog.ts` and `expansion.ts` entries.
- Test: `packages/compiler/test/variants-more.test.ts`.

- [ ] **Step 1: Write the failing tests.** Each field reaches its prop. All five families compile deterministically. Default recipes produce unchanged specimens.
- [ ] **Step 2: Run.** Expected: FAIL.
- [ ] **Step 3: Implement.** Re-record the stable hashes, update the baseline with an `intentionalChanges` entry if it changes, and update the recipe pins.
- [ ] **Step 4: Run** the compiler, catalog and www suites. Expected: PASS.
- [ ] **Step 5: Commit** with `feat(preview): show the batch 6b and 6c variants in specimens, scenes and the site`.

### Task 9: Audit, evidence and docs

**Files:**
- Modify:
  - `scripts/generate-audit.ts` (`recipeVariants` for the nine components);
  - `tests/e2e/specimen-audit.spec.ts`: Toast sections first by component (`id.split('~')[0] === 'toast'`), and overlay entries keyed by section id;
  - the generator for any fix, pinned in `specimen-audit-fixes.test.ts`;
  - the docs for the nine components, `accessibility-review.md`, `CHANGELOG.md` and the README.
- Create: `docs/evidence/variants-more-073.md`.

- [ ] **Step 1: Run the audit** with `OMBELLE_AUDIT_COMPONENTS=tabs,table,input,textarea,input-group,pagination,select,toast,sheet`. Expected: every stable configuration passes, after fixes written test-first.
- [ ] **Step 2: Compare** the screenshots against sections 05 to 10, 12 and 14, and measure the site after a fresh `corepack pnpm build:www`.
- [ ] **Step 3: Write** the evidence and docs.
- [ ] **Step 4: Commit** with `fix(catalog): make the batch 6b and 6c variants pass the specimen audit` and `docs: document the batch 6b and 6c variants`.
