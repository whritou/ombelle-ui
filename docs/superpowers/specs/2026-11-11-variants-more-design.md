# Variants, batches 6b and 6c: Tabs, Table, Input, Pagination, Select, Toast and Sheet

Sub-project 6 of the 0.7.3 work adds variants to 13 existing components and fixes Toast. Batch 6a (Button, Badge, Alert, Card, Avatar and Accordion, PR #106) shipped first. This spec covers the rest, in one PR, as the user asked:

- **6b:** Tabs, Table, Input with Textarea and Input Group, Pagination, and Select.
- **6c:** Toast and Sheet.

## Intent

The 0.7.3 design artifact (https://claude.ai/artifact/1FMRGWoyJSwht9wATT838U) has one "0.7.3 new variants" board per family, `project/<Family>073Variants.dc.html`. This work covers its sections 05 to 10, 12 and 14. The board's variant CSS is the same in every family; only the family tokens differ. Every default stays.

The sub-project decomposition also lists three Toast fixes: pause on hover or focus, a sensible default duration, and a single announcement.

Decisions taken in brainstorming (11 November 2026):

- **Scope:** 6b and 6c in one branch and one PR, stacked on #106.
- **Select `multiple` in the Radix edition:** a hand-written listbox in a Popover, with the same API as the Base UI edition, which uses Base UI's native multiple Select. Its keyboard and ARIA follow the Radix Combobox of sub-project 4.
- **Toast promise:** a declarative `ToastPromise` component in both editions. Base UI builds on `manager.promise`, and Radix on local state.
- **Sheet drag:** in-house pointer events with no new dependency. Each handle is an ARIA separator that works with the keyboard.

Batch 6a's conventions carry over:

- A variant is an optional prop that sets a `data-*` attribute on an existing slot, or a new part with its own `data-slot`.
- The variant CSS is appended by a scratchpad generator between `/* 0.7.3 variants */` markers.
- Every selector names one `data-slot`; parent states go through `:is()`, `:has()` and `data-<component>-…` markers.
- The audit pages add `component~variant` sections.
- The minor findings of the final review are fixed before the PR is pushed.

## Batch 6b

### Tabs

- `Tabs orientation="vertical"` is already supported by both primitives. It gains the board's styles: the list sits in a column beside the panel, and the selected trigger has an inline-start bar.
- **`TabsList appearance`** gains `'pills'`, beside `contained` and `underline`.
- **`TabsCount`** (`data-slot="tabs-count"`) is a count in any trigger. It is part of the trigger's name, so "Review 3" is read as one name.

### Table

- **`Table stickyHeader`** sets `data-sticky-header`. The header cells stick to the top of the nearest scrolling ancestor, on the family's `--card` surface.
- **Sorting:**
  - `TableHead` gains `sort?: 'ascending' | 'descending' | 'none'` and `onSort?: () => void`.
  - With `onSort`, the header renders a `<button data-slot="table-sort">` with an arrow icon (`aria-hidden`), and the `th` carries `aria-sort` when `sort` is ascending or descending.
  - Sorting the rows stays with the consumer.
- **Actions column:**
  - `TableHead actions` and `TableCell actions` set `data-actions`, which aligns the column to the end and shrinks it to its content.
  - A `TableHead` with `actions` and no children renders a visually hidden "Actions" label.
- **Loading:**
  - `Table loading` sets `aria-busy="true"`.
  - `TableSkeletonRows` (`rows = 3`, `columns`) renders rows of cells, each with a `data-slot="table-skeleton"` bar at a fixed set of widths. The bars are `aria-hidden` and shimmer, except under reduced motion. They do not depend on the Skeleton component.

### Input, Textarea and Input Group

- **`size`**, `'sm' | 'default' | 'lg'`, on `Input` and `Textarea`.
  - It sets `data-size` only when it is not `default`, so default output and the default sizes do not change.
  - `sm` is 2rem high and `lg` 3rem. `default` stays each family's own size.
- **`InputGroupClear`** (`data-slot="input-group-clear"`) is a button inside an addon.
  - Props: `label` (default `'Clear'`) and `onClear`.
  - It calls `onClear`, then moves focus to the group's input.
  - It is hidden while the input is empty, by CSS on `:placeholder-shown` through the group.
- **`InputGroupCount`** (`data-slot="input-group-count"`) takes `value: number` and `max: number` and shows "46 / 160".
  - The consumer gives it an `id` and lists that id in the control's `aria-describedby`.
  - It is a polite live region only within 10 % of `max`, or past it. Past `max`, it sets `data-over` and the destructive colour.

### Pagination

- **`PaginationCompact`** (`data-slot="pagination-compact"`) takes `page`, `pageCount`, `previousHref` and `nextHref` (or `onPrevious` and `onNext`). It renders a previous button, "Page {page} of {pageCount}" and a next button, all inside the `nav`.
  - The previous and next buttons are `icon-sm` targets of at least 24px, named "Previous page" and "Next page".
  - They are disabled at the ends.
- **`PaginationPageSize`** (`data-slot="pagination-page-size"`):
  - It takes `value`, `options` (default `[10, 25, 50, 100]`), `onValueChange`, `label` (default `'Rows per page'`) and `range`, a text such as "1–25 of 290".
  - It renders a label, a native `<select>` and the range text.

### Select

- **`multiple`**: `value` and `defaultValue` become `string[]`, and `onValueChange(value: string[])` receives the new array.
  - The list stays open while options are chosen.
  - The trigger shows each choice as a chip (`data-slot="select-chip"`, the label only), and the placeholder when none is chosen.
  - A form submits one `name` entry per value.
  - **Base UI edition:** Base UI's native `multiple` Select.
  - **Radix edition:** a listbox in a Radix Popover.
    - The trigger is a `button` with `aria-haspopup="listbox"` and `aria-expanded`. The list has `role="listbox"` and `aria-multiselectable="true"`, and each option has `role="option"` and `aria-selected`.
    - Focus stays on the trigger, and the highlighted option is named through `aria-activedescendant`.
    - Keys: arrows, Home, End, typeahead, Space and Enter to toggle, and Escape to close and return focus.
    - Hidden inputs carry the values for forms.
  - Single selection is unchanged in both editions.
- **`SelectItem icon`**: a decorative leading icon (`aria-hidden`, `data-slot="select-item-icon"`).
- `SelectGroup`, `SelectLabel` and `SelectSeparator` already exist. They gain the board's styles: an uppercase muted label and a 1px separator.

## Batch 6c

### Toast

- **`ToastPromise`** takes `promise`, `loading`, `success` and `error`.
  - `success` and `error` are either content or `(result) => content`.
  - It shows one toast that follows the task: while pending, a Spinner-style indicator (`data-slot="toast-spinner"`) and no timeout; once settled, the `success` or `destructive` variant with the normal duration.
  - The content is the toast's title and optional description.
  - The Radix edition renders a `Toast` and changes its children and variant from local state. The Base UI edition calls `manager.promise` from inside the provider.
- **Stack:** `ToastViewport stack` sets `data-stack`.
  - Only the newest toast is shown in full; older ones peek out by 8px behind it, scaled to 96 % and 92 %.
  - Hovering or focusing inside the viewport expands the stack: `:hover` and `:focus-within` in the Radix edition, and Base UI's native `data-expanded` in the Base UI edition.
  - There is no animation under reduced motion.
- **Pause on hover and focus:** both primitives already pause the timer while the viewport is hovered or focused. A browser test pins it: with a frozen clock, a toast that is hovered, or that holds focus, is still open after its duration, and closes once the pointer leaves or focus moves away. If the test fails, the templates are fixed until it passes.
- **Sensible duration:**
  - The default becomes 6000ms plus 60ms per character of title and description beyond 80, up to 10000ms.
  - A toast with a `ToastAction` defaults to `Infinity`, because WCAG 2.2.1 forbids an action that disappears on a timer.
  - An explicit `duration` on the provider or the toast wins.
  - In the Base UI edition, the same rule applies to the timeout passed to `manager.add`, through an exported `toastDuration(content)` helper that both editions use.
- **Single announcement:** a browser test counts the live regions holding a toast's text after it opens.
  - It must be exactly one in each edition.
  - If the Radix edition announces twice, through its own announce region and a status role on the toast, the extra role is removed. The fix follows the measurement, and the test stays as the guard.

### Sheet

- **`SheetHandle`** (`data-slot="sheet-handle"`) is for `side="bottom"`.
  - It is a horizontal ARIA separator with `tabIndex={0}`, named "Resize sheet". `aria-valuenow`, `aria-valuemin` (25) and `aria-valuemax` (95) give the height as a percentage of the viewport.
  - Arrow Up and Down change the height by 10 %; Home and End go to the bounds.
  - Dragging uses pointer events with pointer capture. Releasing below 25 % closes the sheet through its own `onOpenChange(false)`.
  - The height starts at the content's natural height, up to 95 %.
- **`SheetContent resizable`**, for `side="inline-start"` or `"inline-end"`:
  - It takes `defaultSize` (default 320), `minSize` (240), `maxSize` (640) in pixels, and `onSizeChange`.
  - It renders a vertical separator (`data-slot="sheet-resize-handle"`) on the open edge, named "Resize panel", with `aria-valuenow`, `aria-valuemin` and `aria-valuemax` in pixels.
  - Arrow keys change the width by 16px, or 64px with Shift; Home and End go to the bounds. Dragging uses pointer events.
- **Bounds:** the size never goes outside its bounds or past the viewport.
- **Motion:** there is no animation while dragging, and none under reduced motion.

## Styles

- **Generator:** `scratchpad/gen-variants-more.mjs` follows batch 6a's generator.
- **CSS rules:**
  - Every family has a forced-colours block.
  - Targets are at least 24px.
  - The liquid glass ring is 2px `--foreground` with no gap, and glass findings do not block.
  - Button and Input keep their default sizes.
- **Board values:**
  - **Tabs:**
    - The vertical list is 9rem wide.
    - Pills have a full radius, and the selected pill uses the primary colours.
    - The count in a selected pill is the primary foreground at 25 %.
  - **Table:** the sort arrow is 12px; skeleton bars are 0.625rem high.
  - **Input:** `sm` and `lg` padding scales from each family's default.
  - **Compact pagination:** uses an 8px gap.
  - **Toast stack:** offsets of 8px and 16px.
  - **Sheet handles:**
    - The bottom handle is a 2.5rem by 0.25rem pill, centred in a 24px target.
    - The resize handle is an 8px hit area with a 2px line on hover and focus.

## Recipes and editor

The `component-recipe` schema gains:

| Component | New fields |
| --- | --- |
| `tabs` | `appearance` gains `pills`; `counts` (boolean) |
| `table` | `stickyHeader`, `sortable`, `actions`, `loading` (booleans) |
| `input`, `textarea` | `size` (`sm`, `default`, `lg`) |
| `input-group` | `clearable`, `counter` (booleans) |
| `pagination` | `layout` (`default`, `compact`), `pageSize` (boolean) |
| `select` | `multiple`, `icons` (booleans) |
| `toast` | `mode` (`default`, `promise`, `stack`) |
| `sheet` | `handle`, `resizable` (booleans) |

- **No schema defaults:** none of these fields has one, so existing recipes stay byte-identical.
- **Specimens:** each field gets one in `recipe-specimen.ts`. The editor shows each field with the existing control types.
- **CLI gate:** `install-command.ts` requires CLI 0.7.3 for these fields and for `tabs.appearance = 'pills'`.

## Preview and site

- **Projects scene:**
  - The table gets a sticky, sortable header, an actions column and a loading state, shown by a "Refresh" button.
  - The list tabs become pills with counts.
  - The footer gets compact pagination and a page-size select.
  - A search field gets `InputGroupClear`.
- **Settings scene:**
  - Vertical tabs, if the layout allows them.
  - A multiple Select for roles, with icons and groups.
  - A Textarea counter for the bio.
  - A `ToastPromise` "Publish preset".
  - A resizable inspector Sheet, and a bottom drawer on narrow widths.
- **Edition fixtures:** `VariantsMoreScenario` holds every variant in both editions, for the browser tests.
- **Gallery and site catalog:** the gallery and the site catalog entries list the new variants.

## Testing

- **Catalog unit tests**, through server rendering, CSS and source:
  - one file per component;
  - the slot contracts, updated;
  - the Toast duration helper as a pure function: 6000 for short text, growth per character, the 10000 cap, `Infinity` with an action, and an explicit duration winning.
- **Compiler tests:**
  - specimens for every new field, deterministic in all families;
  - the stable hashes re-recorded, with only these components' artifacts and the family stylesheets changing.
- **Browser:** `tests/e2e/variants-more.spec.ts`, in both editions, under the specimen-audit config:
  - Table:
    - sorting cycles `aria-sort`, and the arrow follows;
    - the header stays visible when the container scrolls;
    - the loading rows are `aria-busy`.
  - Clear empties the field and returns focus to it, and the counter turns live and destructive past the limit.
  - Select multiple:
    - opening, toggling three options by keyboard and by pointer;
    - the chips;
    - the form's values;
    - Escape returning focus.
  - Pagination:
    - compact previous and next, disabled at the ends;
    - the page-size change.
  - Vertical tabs move with Arrow Up and Down.
  - Toast:
    - `ToastPromise` resolving to success and rejecting to error;
    - pause while hovered and while focused;
    - the default duration;
    - one live region with the text;
    - the stack expanding on hover and focus.
  - Sheet:
    - the bottom handle by keyboard, by drag, and closing below the threshold;
    - the resizable panel by keyboard and pointer, staying within its bounds.
- **Specimen audit:**
  - Only `OMBELLE_AUDIT_COMPONENTS=tabs,table,input,textarea,input-group,pagination,select,toast,sheet`, with the variant sections, in all 20 configurations.
  - The other components are not re-run.

## Docs

- **Component pages:** `docs/components/` for the nine components.
- **Project docs:** `docs/accessibility-review.md`, `CHANGELOG.md` and the README variant notes.
- **Evidence:** `docs/evidence/variants-more-073.md`, with:
  - the audit runs;
  - the browser tests;
  - the Toast measurements (pause, duration, announcements);
  - the board comparison for sections 05 to 10, 12 and 14;
  - the website size.

## Out of scope

- Sub-project 7: the editors and liquid glass.
- New components.
- Resizing the default Button or Input.
- Releases and publishing.

## Delivery

- **Branch:** `feat/variants-more-073`, from `feat/variants-basics-073`. The PR stacks on #106.
- **Review:** a fresh reviewer reviews the whole branch.
- **Before the PR:** the Critical and Important findings are fixed, then the Minor ones, as the user asked for batch 6a.
