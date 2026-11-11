# Overlays and Search Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add Combobox, Command, Hover Card and Context Menu to the catalog in both editions and all five families, with recipes. Then use them in the preview scenes, and give the www editor a lazy Ctrl+K palette and Combobox pickers.

**Architecture:**
- **Catalog:** follow sub-project 3 (branch `feat/form-controls-073`) end to end:
  - contract ids, schema branches and appearance parts;
  - templates and per-family styles;
  - compiler specimens and gating;
  - preview and site registration;
  - the build-time www step;
  - docs.
- **Filtering:**
  - In the Radix edition, cmdk filters Combobox and Command.
  - In the Base UI edition, the template filters by its own query in context, and Base UI's `filter` is set to `null`. Base UI keeps the combobox ARIA and the highlight. This way both editions keep the same children-based part API.

**Tech Stack:**
- TypeScript ES modules and React 19.
- Radix edition:
  - `cmdk` 1.1.1;
  - `@radix-ui/react-popover` 1.3.1 and `@radix-ui/react-dialog` 1.3.1 (already pinned);
  - `@radix-ui/react-hover-card` 1.2.1;
  - `@radix-ui/react-context-menu` 2.4.1.
- Base UI edition (`@base-ui/react` 1.9.0): `Combobox`, `Autocomplete` (`inline open`), `Dialog`, `PreviewCard`, `ContextMenu`.
- Next.js 16 for `apps/www`.
- Vitest and Playwright.

**Spec:** `docs/superpowers/specs/2026-11-10-overlays-search-design.md`

## Global Constraints

- **Toolchain and branch:** Node 24.19.0 and pnpm 11.25.0 (`corepack pnpm …`). The branch is `feat/overlays-search-073`, stacked on `feat/form-controls-073` (PR #103).
- **Commits:** Conventional Commits, with no `codex` prefix.
- **Generated files:**
  - Edit `schemas/`, never `packages/contracts/src/*schema*.ts`.
  - Edit catalog sources, never `generated.ts`.
  - Run `pnpm build:packages` after package source changes.
- **New runtime dependencies, exact pins (all MIT):** `cmdk` 1.1.1, `@radix-ui/react-hover-card` 1.2.1, `@radix-ui/react-context-menu` 2.4.1. The Base UI edition adds none and never lists `cmdk` or a Radix package. The `editionDependencies` import filter from phase 3 handles this.
- **Component ids:** `combobox`, `command`, `hover-card`, `context-menu`. The catalog has 44 components. All four are client components.
- **Family support:** glass support is `experimental` for all four. The other four families are supported. Glass findings are recorded, never blocking.
- **Default look:** each family follows `project/<Family>073Components.dc.html`, sections 04 Combobox, 06 Command, 08 Hover Card and 09 Context Menu.
- **Shared names:** part names and `data-slot` values are identical in both editions.
- **CSS rules:**
  - One `data-slot` per selector, and forced-colours blocks in every file.
  - Interactive targets are at least 24px.
  - Text fields use the `:focus-within` wrapper ring.
  - Glass uses the 2px foreground ring with no gap.
  - Reduced motion removes the open and close animations.
  - Button and Input sizes do not change.
- **Exact copy:**
  - Create row: `Create “{query}”`.
  - Chip remove button: `Remove {label}`.
  - Default dialog name: `Command menu`.
  - Hover Card delays: `openDelay` 500 and `closeDelay` 200.
- **Install gate:** the four ids need CLI `0.7.3`, through `catalog073Components` in `apps/www/src/snapshots/install-command.ts`.
- **Website loading:**
  - Components compile only at build time, through `scripts/generate-www-ui.ts`.
  - The palette loads with `next/dynamic` on its first open.
  - If an editor route's First Load JS grows by more than **20 kB gzip** from this work's editor changes, stop and report before going on.
- **Running checks:** do not re-run checks already shown to pass on unchanged code. Run only the tests a change affects (user instruction).
- **Remote actions:** no release, no deployment and no push without asking.

## Review Focus

- **A query with regex characters** (`c++`, `(`, `.`): filtering does not throw, and `highlightMatch` marks the literal run. Task 5 pins this in unit tests.
- **Create against a near-duplicate:** the query `"  liquid GLASS "` with an item "Liquid glass" shows no Create row. Create trims the query before calling `onCreate`. Task 5 pins this.
- **Backspace in a multiple Combobox with text typed:** it deletes a character, not a chip. Only Backspace on empty text removes the last chip. Task 7 pins this in the browser.
- **A Context Menu opened near the bottom-right corner:** it stays inside the viewport, and focus returns to the zone on Esc. Task 7 pins this in the browser.
- **Ctrl+K pressed while focus is in the editor's name field:** the palette opens, and the browser default is prevented. Pressing Ctrl+K again or Esc closes it and returns focus to the field. Task 8 pins this in the browser.

---

### Task 1: Contracts, dependencies and size baseline

**Files:**
- Modify:
  - `packages/contracts/src/component-ids.ts`: append the four ids.
  - `packages/contracts/src/style-families.ts`: add them to `glassExperimental`.
  - `schemas/component-recipe.schema.json`: four `oneOf` branches.
  - `packages/contracts/src/component-recipe-appearance.ts`: appearance parts.
  - `packages/contracts/src/component-recipe.ts`: `validateComposition` rules, next to the Toggle Group rule.
  - `packages/catalog/src/manifest.ts`: pin the three new dependencies.
  - `packages/catalog/package.json` and `pnpm-lock.yaml`: dev dependencies.
- Create: `docs/evidence/overlays-search-073.md`, holding only the size baseline at this step.
- Test: `packages/contracts/test/component-recipe.test.ts` and `style-support.test.ts`.

**Interfaces (recipe fields, exact names and defaults):**

| Component | Props | Content |
| --- | --- | --- |
| `combobox` | `mode` enum `single\|multiple` (default `single`); `creatable` boolean (default `true`); `selection` array of item ids (default `[]`) | `label` (`Preset`); `placeholder` (`Search presets`); `emptyText` (`No presets found.`); `items` 1–12 `{ id, label, group }` (defaults `liquid-glass` "Liquid glass", `liquid-glass-givre` "Liquid glass — Givre", `liquid-glass-prism` "Liquid glass — Prism", `ombelle` "Ombelle"; `group` optional string) |
| `command` | `presentation` enum `inline\|dialog` (default `inline`) | `placeholder` (`Search commands`); `emptyText` (`No results.`); `groups` 1–4 `{ id, heading, items 1–6 { id, label, shortcut } }` (defaults: Components with "Add Button" `↵` and "Add Dialog"; Theme with "Add theme from preset" `Ctrl+T`; `shortcut` optional) |
| `hover-card` | `side` enum `top\|bottom` (default `bottom`); `arrow` boolean (default `true`) | `triggerText` (`@ombelle`); `title` (`Ombelle UI`); `handle` (`@ombelle`); `body` (`Reviewed React components with deterministic presets.`); `initials` 1–2 characters (`OU`) |
| `context-menu` | none | `zoneText` (`Right-click or Shift+F10 on a layer`); `items` 1–10 `{ id, label, shortcut, kind }`, with `kind` one of `item\|submenu\|separator\|destructive` (defaults: Duplicate `Ctrl+D`, Apply preset submenu, Copy as JSX, separator, Delete destructive `Del`) |

- **Appearance parts:**
  - `combobox`: `surface('combobox-input')`, `surface('combobox-content')`, `surface('combobox-item')`.
  - `command`: `surface('command')`, `surface('command-item')`.
  - `hover-card`: `surface('hover-card-content')`.
  - `context-menu`: `surface('context-menu-content')`, `surface('context-menu-item')`.
- **`validateComposition` rejects:**
  - a `selection` id not in `items`;
  - `mode: 'single'` with more than one selection;
  - a Command group with no items;
  - a Context Menu whose first or last item is a separator, or that has no item whose `kind` is not `separator`.

- [ ] **Step 0: Record the size baseline.**
  - Build the www app.
  - Run `node scripts/measure-www-first-load.mjs`.
  - Copy the editor routes into `docs/evidence/overlays-search-073.md` under "Website size, before", with the commit.
- [ ] **Step 1: Write the failing contract tests.**
  - The ids are in `componentRecipeComponents`.
  - `styleSupport(id, 'liquid-glass') === 'experimental'`.
  - The defaults validate.
  - Each rejection fails, with a message naming the field.
- [ ] **Step 2: Run** `corepack pnpm exec vitest run packages/contracts`. Expected: the new cases FAIL.
- [ ] **Step 3: Implement.** Install with `corepack pnpm install --ignore-scripts`.
- [ ] **Step 4: Run** `node scripts/sync-schema.mjs` and the contracts tests. Expected: PASS.
- [ ] **Step 5: Commit** with `feat(contracts): add the overlay and search ids and recipe schemas`.

### Task 2: Hover Card

**Files:**
- Create:
  - `packages/catalog/src/templates/hover-card.tsx`;
  - `packages/catalog/src/templates/base/hover-card.tsx`;
  - `packages/catalog/src/styles/hover-card/{flat,minimalist,neo-brutalism,ombelle,liquid-glass}.css`.
- Modify:
  - `component-slots.ts`: `hover-card: ['hover-card','hover-card-trigger','hover-card-content','hover-card-arrow']`.
  - `expansion-examples.ts`.
- Test: `packages/catalog/test/hover-card.test.ts`.

**Interfaces:**
- `HoverCard({ open?, defaultOpen?, onOpenChange?, openDelay = 500, closeDelay = 200, children })`.
- `HoverCardTrigger` renders an anchor (`asChild` in Radix, `render` in Base UI) with `data-slot="hover-card-trigger"`.
- `HoverCardContent({ side = 'bottom', align = 'start', sideOffset = 8, ...div })`, portalled.
- `HoverCardArrow`.
- The Base UI edition maps these to `PreviewCard.Root`, `Trigger`, `Portal`, `Positioner`, `Popup` and `Arrow`, with `delay` and `closeDelay`.

- [ ] **Step 1: Write the failing tests.**
  - `expectComponentContract('hover-card', …)`: client, four parts and slots.
  - Radix dependencies include `@radix-ui/react-hover-card` 1.2.1. Base UI dependencies include `@base-ui/react` and no Radix package.
  - Glass is `experimental`.
  - The selectors are listed.
  - The server markup renders the trigger as `<a` with `href` and `data-slot="hover-card-trigger"`. The open content is covered in the browser (Task 7).
- [ ] **Step 2: Run** `corepack pnpm exec vitest run packages/catalog/test/hover-card.test.ts`. Expected: FAIL.
- [ ] **Step 3: Implement** both templates and the five stylesheets from board section 08: card, avatar, caret and link underline.
- [ ] **Step 4: Run** `corepack pnpm build:packages` and the test. Expected: PASS, and the style lint passes.
- [ ] **Step 5: Commit** with `feat(catalog): add Hover Card`.

### Task 3: Context Menu

**Files:**
- Create:
  - `templates/context-menu.tsx`;
  - `templates/base/context-menu.tsx`;
  - `styles/context-menu/{five families}.css`, starting from each family's `dropdown-menu` item rules with the slots renamed.
- Modify: `component-slots.ts` (the slots below) and `expansion-examples.ts`.
- Test: `packages/catalog/test/context-menu.test.ts`.

**Interfaces:**
- **Parts:** `ContextMenu`, `ContextMenuTrigger`, `ContextMenuContent` (portalled), `ContextMenuItem({ variant?: 'default' | 'destructive', inset? })`, `ContextMenuCheckboxItem`, `ContextMenuRadioGroup`, `ContextMenuRadioItem`, `ContextMenuLabel`, `ContextMenuSeparator`, `ContextMenuShortcut`, `ContextMenuSub`, `ContextMenuSubTrigger`, `ContextMenuSubContent`. They mirror `dropdown-menu.tsx` and `base/dropdown-menu.tsx` prop for prop.
- **Slots:** `context-menu`, `-trigger`, `-content`, `-item`, `-checkbox-item`, `-radio-item`, `-item-indicator`, `-label`, `-separator`, `-shortcut`, `-sub-trigger`, `-sub-content`.
- **Lucide:** `extraDependencies` gets `context-menu: ['lucide-react']`, for the check, dot and chevron icons, as Dropdown Menu has.

- [ ] **Step 1: Write the failing tests.**
  - The contract: lucide-react; `@radix-ui/react-context-menu` 2.4.1 for Radix only.
  - `ContextMenuItem variant="destructive"` sets `data-variant="destructive"`.
  - The shortcut renders `data-slot="context-menu-shortcut"`.
- [ ] **Step 2: Run** `corepack pnpm exec vitest run packages/catalog/test/context-menu.test.ts`. Expected: FAIL.
- [ ] **Step 3: Implement** the templates and the styles from board section 09, with the dashed zone on `context-menu-trigger`.
- [ ] **Step 4: Run** the build and the test. Expected: PASS.
- [ ] **Step 5: Commit** with `feat(catalog): add Context Menu`.

### Task 4: Command

**Files:**
- Create:
  - `templates/command.tsx`;
  - `templates/base/command.tsx`;
  - `styles/command/{five families}.css`.
- Modify:
  - `component-slots.ts`;
  - `index.ts` `extraDependencies`: `command: ['lucide-react']`, for the search icon;
  - `expansion-examples.ts`.
- Test: `packages/catalog/test/command.test.ts`.

**Interfaces:**
- **Parts:**
  - `Command(div props & { label?: string; filter?: boolean; defaultSearch?: string })`. `defaultSearch` sets the initial query in both editions.
  - `CommandDialog({ open?, onOpenChange?, title = 'Command menu', children })`.
  - `CommandInput(input props)`, with the search icon and an `Esc` `<kbd>` hint inside a dialog.
  - `CommandList`.
  - `CommandGroup({ heading })`.
  - `CommandItem({ value?, keywords?: string[], disabled?, onSelect?(value: string) })`.
  - `CommandShortcut(span)`, rendered as `<kbd>` keys split on `+`.
  - `CommandSeparator`.
  - `CommandEmpty`.
- **Slots:** `command`, `-dialog`, `-input`, `-list`, `-group`, `-group-heading`, `-item`, `-shortcut`, `-separator`, `-empty`.
- **Radix edition:**
  - It wraps cmdk's `Command` parts.
  - `CommandDialog` is `@radix-ui/react-dialog` with `Command` inside. Use the catalog dialog's structure, not cmdk's `Command.Dialog`, so the title is visually hidden but present.
- **Base UI edition:**
  - `Command` is `Autocomplete.Root inline open filter={null}`, with a query state in context.
  - `CommandItem` reads the query and returns `null` when `value ?? text` and `keywords` do not contain it, ignoring case.
  - `CommandGroup` hides itself when none of its items match. Items register their match in the group context, and hidden items do not register with Base UI.
  - `CommandEmpty` renders when no item matches.
  - `CommandDialog` is Base UI `Dialog`.
- **Both editions:** `CommandEmpty` sits inside a `role="status" aria-live="polite"` element.

- [ ] **Step 1: Write the failing tests.**
  - The contract: Radix lists `cmdk` 1.1.1 and `@radix-ui/react-dialog`, and Base UI lists neither.
  - The server markup has `role="listbox"`, one `role="option"` per item, the group heading text, and `<kbd>Ctrl</kbd><kbd>T</kbd>` for `shortcut="Ctrl+T"`.
  - The Base UI edition with `defaultSearch="button"` and the default groups omits the "Theme" heading, because no Theme item matches. It still renders "Add Button".
- [ ] **Step 2: Run** `corepack pnpm exec vitest run packages/catalog/test/command.test.ts`. Expected: FAIL.
- [ ] **Step 3: Implement** both templates and the styles from board section 06.
- [ ] **Step 4: Run** the build and the test. Expected: PASS.
- [ ] **Step 5: Commit** with `feat(catalog): add Command`.

### Task 5: Combobox

**Files:**
- Create:
  - `templates/combobox.tsx`;
  - `templates/base/combobox.tsx`;
  - `styles/combobox/{five families}.css`.
- Modify:
  - `component-slots.ts`;
  - `index.ts` `extraDependencies`: `combobox: ['lucide-react']`;
  - `expansion-examples.ts`.
- Test: `packages/catalog/test/combobox.test.ts`.

**Interfaces:**
- **Exported helpers, identical in both templates:**
  - `highlightMatch(text: string, query: string): React.ReactNode` returns the text with the first case-insensitive literal occurrence of the trimmed query wrapped in `<mark data-slot="combobox-match">`. With an empty query or no match it returns `text`.
  - `shouldOfferCreate(query: string, labels: readonly string[]): boolean` is true when `query.trim()` is not empty and no label equals it, ignoring case and surrounding whitespace.
- **Root:**
  - `Combobox<Multiple extends boolean = false>({ value?, defaultValue?, onValueChange?, multiple?: Multiple, disabled?, name?, onCreate?(query: string), defaultQuery?, children })`.
  - The list opens on typing, on a click in the field, and on ArrowDown.
  - The value is `string` when single and `string[]` when multiple.
  - `name` emits one hidden input per value.
- **Parts:**
  - `ComboboxInput(input props)` renders the field wrapper (`combobox-field`) with the chips first in multiple mode, the input with `role="combobox"`, and a chevron.
  - `ComboboxContent`, portalled.
  - `ComboboxList`.
  - `ComboboxGroup({ heading })`.
  - `ComboboxItem({ value, children, disabled? })`. Its text is highlighted with `highlightMatch`, and the selected item shows a check.
  - `ComboboxEmpty`.
  - `ComboboxCreate` renders `Create “{query}”` only when `shouldOfferCreate`, and calls `onCreate(query.trim())`.
  - `ComboboxChips` renders one `combobox-chip` per value, labelled by the item text, falling back to the value. Each chip has a `combobox-chip-remove` button named `Remove {label}`.
- **Slots:** `combobox`, `-field`, `-input`, `-content`, `-list`, `-group`, `-group-heading`, `-item`, `-match`, `-empty`, `-create`, `-chips`, `-chip`, `-chip-remove`.
- **Behaviour:**
  - Single mode: selecting an item sets the value, puts its label in the input and closes the list.
  - Multiple mode: selecting toggles the value, clears the query and keeps the list open. Backspace on an empty input removes the last value.
  - Esc closes the list and keeps the value.
- **Radix edition:** `Popover.Root` with `Popover.Anchor` around the field and `Popover.Content` (`onOpenAutoFocus` prevented, so focus stays in the input). cmdk's `Command` wraps the field and the content, and `Command.Input` is the input. `aria-activedescendant` comes from cmdk.
- **Base UI edition:** `Combobox.Root` with `filter={null}` and template filtering, as in Task 4. `Combobox.Chips`, `Chip` and `ChipRemove` in multiple mode. `Combobox.Portal`, `Positioner` and `Popup`.

- [ ] **Step 1: Write the failing tests.**
  - `highlightMatch('Liquid glass', 'GLA')` → markup `Liquid <mark data-slot="combobox-match">gla</mark>ss`.
  - `highlightMatch('C++ tools', 'c++')` marks `C++`.
  - `highlightMatch('abc', '(')` → `'abc'`.
  - `highlightMatch('abc', '')` → `'abc'`.
  - `shouldOfferCreate('  liquid GLASS ', ['Liquid glass'])` → false; `shouldOfferCreate('gla', ['Liquid glass'])` → true; `shouldOfferCreate('   ', [])` → false.
  - The contract: Radix lists `cmdk` and `@radix-ui/react-popover`, and Base UI lists neither.
  - The server markup with `defaultQuery="gla"`: the input has `role="combobox"`, `aria-autocomplete="list"`, `aria-expanded="false"` and `value="gla"`. The open list (options with `aria-selected`, and the Create row) is covered in the browser (Task 7).
  - Multiple mode with `defaultValue={['ombelle']}` renders a chip remove button named `Remove Ombelle`.
- [ ] **Step 2: Run** `corepack pnpm exec vitest run packages/catalog/test/combobox.test.ts`. Expected: FAIL.
- [ ] **Step 3: Implement** both templates and the styles from board section 04. Chips copy each family's `chip` look.
- [ ] **Step 4: Run** the build and the test. Expected: PASS.
- [ ] **Step 5: Commit** with `feat(catalog): add Combobox`.

### Task 6: Compiler specimens and install gating

**Files:**
- Modify:
  - `packages/compiler/src/recipe-specimen.ts`: four `case`s.
  - `tests/helpers/catalog-recipe-fixtures.ts`: `editedFields`.
  - `apps/www/src/snapshots/install-command.ts`: add the four ids to `catalog073Components`.
  - `packages/compiler/test/fixtures/stable-family-hashes.json`: regenerate with `corepack pnpm exec tsx scripts/record-stable-hashes.ts`.
- Test: `packages/compiler/test/overlays-search.test.ts` (new) and `apps/www/src/snapshots/display-install.test.ts`.

**Interfaces (specimens from the Task 1 fields).** Overlay specimens are closed, like the existing Popover and Dropdown Menu specimens. The audit opens them (Task 9).
- **`combobox`:** a label and `Combobox { multiple: mode === 'multiple', defaultValue: selection, defaultQuery: 'gla' }`, containing `ComboboxInput` (`aria-labelledby`, `placeholder`) and `ComboboxContent`. The content holds the items, `ComboboxEmpty`, and `ComboboxCreate` when `creatable`. Items group by `group` when set.
- **`command`:** with `inline`, a `Command defaultSearch="add"` with groups, items and `CommandShortcut`. With `dialog`, a trigger button "Open command menu" plus `CommandDialog`, closed.
- **`hover-card`:** a sentence with `HoverCardTrigger` (`href="#"`) and `HoverCardContent side` holding the avatar, title, handle, body, and `HoverCardArrow` when `arrow`.
- **`context-menu`:** a focusable `ContextMenuTrigger` zone (`tabIndex={0}`, `aria-label` = `zoneText`) showing `zoneText`, with the items in `ContextMenuContent`. Each `submenu` item becomes a `ContextMenuSub` with two fixed children, "Ombelle" and "Liquid glass".

- [ ] **Step 1: Write the failing tests.**
  - The defaults compile in all five families and both editions.
  - The part names match.
  - `findShadowedNames` is `[]`.
  - The output is deterministic.
  - Each id reports minimum CLI `0.7.3`.
- [ ] **Step 2: Run** `corepack pnpm exec vitest run packages/compiler/test/overlays-search.test.ts apps/www/src/snapshots`. Expected: FAIL.
- [ ] **Step 3: Implement**, then regenerate the hashes.
- [ ] **Step 4: Run** the same tests. Expected: PASS.
- [ ] **Step 5: Commit** with `feat(compiler): describe and gate the overlay and search recipes`.

### Task 7: Preview scenes, site catalog and browser tests

**Files:**
- Modify:
  - `apps/www/src/site/components/expansion.ts`: four docs entries with `minimumCli: '0.7.3'`.
  - `apps/preview/src/scenes/projects.tsx`: a multiple `Combobox` "Owner" filter beside the status `ChipGroup`, which filters the rows; a `HoverCard` on each owner name; and a `ContextMenu` on each row, with Open, Duplicate, Archive, a separator and Delete (destructive).
  - `apps/preview/src/scenes/settings.tsx`: a creatable single `Combobox` "Default preset", where a created name is added to the list, and an inline `Command` card with a "Open with Ctrl+K" button that opens `CommandDialog`.
  - `apps/www/src/preset-editor/preview-scenes.ts`: register the four ids.
  - `fixtures/shared/preset-gallery.tsx`: a `data-testid="overlays-search"` section.
  - `fixtures/shared/edition-scenario.tsx` and `edition-scenario-base.tsx`: the fixtures below, each with a `data-testid`.
  - `playwright.specimen-audit.config.ts` `testMatch` gets the new spec, and the default config ignores it.
- Create: `tests/e2e/overlays-search.spec.ts`.
- Test: `apps/www/src/preset-editor/model.test.ts`, which requires every catalog id on a page.

**Browser tests:** each runs for `radix` and `base` on `/editions/ombelle/<edition>/?mode=light`.
- **Combobox, single:**
  - Typing `gla` leaves three options and shows Create.
  - ArrowDown moves `aria-activedescendant`.
  - Enter puts the label in the input and closes the list.
  - Esc keeps the value.
  - Create calls back with the query, so the fixture shows `Created: gla`.
- **Combobox, multiple:**
  - Enter on two options adds two chips.
  - Typing `x` and pressing Backspace removes the `x` and keeps both chips (Review Focus).
  - Backspace on the empty input removes the last chip.
  - `Remove Ombelle` removes that chip and focuses the input.
- **Command:**
  - The fixture's Ctrl+K handler opens the dialog with focus in the search box.
  - Typing `theme` hides the Components heading.
  - Typing `zzz` shows the empty text in a status region.
  - Enter runs the highlighted item, so the fixture shows `Ran: …`.
  - Esc returns focus to the opener.
- **Hover Card:**
  - Hovering the trigger shows the content after its delay, and so does Tab focus.
  - Esc closes it.
  - Clicking the trigger navigates to its `href` (a `#hover-target` hash).
- **Context Menu:**
  - A right-click at the zone shows the menu near the pointer.
  - Shift+F10 on the focused zone opens it.
  - ArrowDown moves through the items, ArrowRight opens the submenu, and ArrowLeft closes it.
  - Esc returns focus to the zone.
  - A right-click 4px from the bottom-right of the viewport keeps the menu's bounding box inside the viewport (Review Focus).

- [ ] **Step 1: Run** `corepack pnpm exec vitest run apps/www/src/preset-editor/model.test.ts`. Expected: FAIL, because the ids are missing.
- [ ] **Step 2: Write `tests/e2e/overlays-search.spec.ts`.**
- [ ] **Step 3: Implement** the scenes, gallery, fixtures and site entries.
- [ ] **Step 4: Run** `pnpm generate:preview`, the model test, and `corepack pnpm exec playwright test -c playwright.specimen-audit.config.ts tests/e2e/overlays-search.spec.ts`. Expected: PASS. When a behaviour test fails, fix the templates.
- [ ] **Step 5: Commit** with `feat(preview): show the overlays and search components in the scenes, gallery and site`.

### Task 8: Editor palette and Combobox pickers

**Files:**
- Modify:
  - `scripts/generate-www-ui.ts`: `wwwUiComponents` gains `combobox` and `command`.
  - `apps/www/package.json`: add `cmdk` 1.1.1 and the Radix popover and dialog packages, if they are not already present.
  - `apps/www/src/app/globals.css`: any token the two new stylesheets read and the site lacks, found by the existing `generated-ui.test.ts`.
- Create:
  - `apps/www/src/editor-shell/command-palette.tsx` (the dialog, loaded lazily);
  - `apps/www/src/editor-shell/use-command-shortcut.ts`.
- Modify:
  - `apps/www/src/editor-shell/top-bar.tsx`: an optional `commands` prop renders a toolbar button "Commands" with a `<kbd>` hint `Ctrl K` (`⌘K` on macOS), and mounts the palette lazily.
  - `apps/www/src/editor/components/button-editor.tsx`, `catalog-component-editor.tsx` and `apps/www/src/preset-editor/components/preset-editor.tsx`: pass their groups.
  - `apps/www/src/editor/components/properties-panel.tsx`: the icon `<select id="button-icon">` becomes a single `Combobox`, with an empty value meaning None. `id="button-icon"` stays on the input, so the reset button's focus target still works.
  - `apps/www/src/site/glass-preset-select.tsx`: the glass preset `<select>` becomes a single `Combobox` with the same props. Ruling: the spec's "preset picker in `preset-controls.tsx`" is this component. `preset-controls.tsx` holds no preset select.
- Test:
  - `apps/www/src/editor-shell/command-palette.test.tsx` (new);
  - `top-bar.test.tsx`;
  - `properties-panel.test.tsx`;
  - `apps/www/src/site/glass-preset-select.test.tsx` (new, or extend an existing one);
  - e2e: `tests/e2e/editor.spec.ts` and `liquid-glass.spec.ts` where they used `selectOption`.

**Interfaces:**
- `type PaletteCommand = { id: string; label: string; keywords?: string[]; shortcut?: string; run(): void }`.
- `type PaletteGroup = { heading: string; commands: readonly PaletteCommand[] }`.
- `EditorTopBar` gains `commands?: readonly PaletteGroup[]`.
- `useCommandShortcut(onToggle: () => void)` listens on `window` for `keydown`. Ctrl+K, or Meta+K on macOS, calls `preventDefault` and toggles, even inside inputs.
- **The editors' groups:**
  - *Components*: every catalog id plus Button, navigating with `router.push` to `/editor/component/<id>/` (Button: `/editor/component/button/`).
  - *Families*: the five, calling the editor's existing family change.
  - *Actions*: Reset, through the existing reset; Copy install command, through the existing copy action; Toggle dark preview, through the existing mode toggle. An action whose handler an editor lacks is left out.
- `command-palette.tsx` is imported with `next/dynamic(() => import('./command-palette'), { ssr: false })` and rendered only after the first open.

- [ ] **Step 1: Write the failing tests.**
  - `CommandPalette` lists the group headings and runs `run` on Enter.
  - `useCommandShortcut` toggles on `ctrlKey + 'k'` and prevents the default.
  - `EditorTopBar` with `commands` renders the "Commands" button and its `<kbd>`.
  - The icon picker is `role="combobox"` named "Icon", and picking "None" clears the icon.
  - `GlassPresetSelect` is a combobox with the given label.
- [ ] **Step 2: Run** `corepack pnpm exec vitest run apps/www/src/editor-shell apps/www/src/editor apps/www/src/site`. Expected: FAIL.
- [ ] **Step 3: Implement.** Run `corepack pnpm exec tsx scripts/generate-www-ui.ts`.
- [ ] **Step 4: Run** the same unit tests. Expected: PASS.
  - Add to `tests/e2e/editor.spec.ts`:
    - Ctrl+K, typing `dialog` and pressing Enter opens `/editor/component/dialog/`.
    - Ctrl+K pressed in the name field opens the palette, and Esc returns focus to the field (Review Focus).
    - Picking the icon "Arrow right" through the combobox updates the preview.
  - Update the `selectOption` uses.
  - Run those e2e files. Expected: PASS.
- [ ] **Step 5: Measure the size.**
  - Build the www app and run `node scripts/measure-www-first-load.mjs`.
  - Record the after values next to the baseline.
  - If any editor route grows by more than 20 kB gzip, stop and report.
- [ ] **Step 6: Commit** with `feat(www): add the editor command palette and Combobox pickers`.

### Task 9: Audit and board comparison

**Files:**
- Modify: `tests/e2e/specimen-audit.spec.ts` (the `overlays` map).
- Modify: the family CSS that the audit or the board comparison flags.
- Modify: `packages/catalog/test/specimen-audit-fixes.test.ts`, one pinned declaration per fix.
- Modify: `docs/evidence/overlays-search-073.md`.

- [ ] **Step 0: Teach the audit to open the overlays.** In `tests/e2e/specimen-audit.spec.ts`, give the `overlays` entries an optional `trigger(section)` locator (default: the current `button, [role="combobox"]` lookup) and an `open` value of `'contextmenu'` (a right-click on the trigger). Add these entries:
  - `combobox`: `open: 'click'`, content `page.getByRole('listbox')`.
  - `hover-card`: `open: 'focus'`, trigger `section.locator('[data-slot="hover-card-trigger"]')`, content `[data-slot$="hover-card-content"]`.
  - `context-menu`: `open: 'contextmenu'`, trigger `[data-slot="context-menu-trigger"]`, content `page.getByRole('menu')`.
  - The inline Command needs no entry.
- [ ] **Step 1: Audit.**
  - Run `pnpm generate:preview` and `pnpm test:specimen-audit`.
  - Expected: no findings in the four stable families.
  - Fix each finding with a test that fails first, and rerun only the configurations a fix affects.
- [ ] **Step 2: Compare with the boards.**
  - Compare computed styles of matching elements on board sections 04, 06, 08 and 09 with the audit specimens: font, colours, padding, borders, radius, shadow and size.
  - Fix the differences, with tests.
  - Record the rest under "Differences that remain", with reasons.
- [ ] **Step 3: Commit** with `fix(catalog): make the overlays pass the specimen audit and match the boards`. If there are no fixes, use `docs:`.

### Task 10: Documentation

**Files:**
- Create: `docs/components/{combobox,command,hover-card,context-menu}.md`, following `docs/components/input-otp.md`. The Command doc shows how a consumer wires Ctrl+K.
- Modify:
  - `docs/accessibility-review.md`: rows for the four.
  - `docs/03-components-styles-accessibility.md`: a paragraph on the 0.7.3 overlays.
  - `README.md`: 44 components.
  - `CHANGELOG.md`: the four components, the editor palette and the Combobox pickers.
  - `tests/integration/liquid-glass-cli.test.ts`: the glass id list and install order.

- [ ] **Step 1: Write the docs.** Claim only what Tasks 1–9 measured.
- [ ] **Step 2: Run** `corepack pnpm exec vitest run --config vitest.integration.config.ts tests/integration/liquid-glass-cli.test.ts`. Expected: PASS.
- [ ] **Step 3: Commit** with `docs: document the overlays and search components`.
