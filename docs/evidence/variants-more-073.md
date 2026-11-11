# Variants, batches 6b and 6c, evidence (0.7.3)

The 0.7.3 variants of Tabs, Table, Input, Textarea, Input Group, Pagination and Select (batch 6b), and of Toast and Sheet (batch 6c). Spec: `docs/superpowers/specs/2026-11-11-variants-more-design.md`.

## Specimen audit

`scripts/generate-audit.ts` adds one section per variant beside each component's default specimen:

| Component | Variant sections |
| --- | --- |
| Tabs | `pills` (with counts) |
| Table | `sticky` (sortable, actions), `loading` |
| Input | `sm`, `lg` |
| Textarea | `sm` |
| Input Group | `clearable` (with a counter) |
| Pagination | `compact` (with the page-size select) |
| Select | `multiple` (with item icons) |
| Toast | `promise`, `stack` |
| Sheet | `handle` (bottom), `resizable` (inline-end) |

Each run measured only the components it names, in five families, both editions and both colour modes, with Playwright's bundled Chromium. The other components were not re-run, because nothing they render changed.

| Run | Result |
| --- | --- |
| First run, the nine components | 13 of 21 passed. The failures came from the harness and from real CSS findings. The harness problems: the Select locator also caught the Command list; Base UI kept a closed Select popup in the DOM; the fixed toast viewports of different sections overlapped; the Base UI toast section picked up another section's toast; and the spread stack moved on focus. The CSS findings: the Select item icon overflowed its box; the Sheet grip ring was clipped; the sticky header shadow was cut by the container; the neo-brutalism option ring was too faint |
| Toast, after the stack rework | 21 of 21 passed |
| Select, Sheet and Table, after their CSS fixes | 20 of 21 passed. In minimalist Radix light, the Close ring of `sheet~handle` measured 108 of the 115 focus pixels needed |
| Sheet, after the Close ring fix | 21 of 21 passed |

Fixes, pinned in `packages/catalog/test/specimen-audit-fixes.test.ts`:

- **Toast stack:** the viewport keeps `overflow: visible`, so the layers behind the newest toast are not cut off.
- **Select item icon:** `overflow: hidden` and a 0.625rem text size keep the icon inside its 1rem box.
- **Sheet grip:** the 8px resize grip draws a solid 2px ring inside itself (`outline-offset: -2px`), so its edges are never clipped.
- **Sticky header:** the shadow is `0 6px 6px -6px`. The spread cancels the blur, so the shadow falls only below the header, where the container does not cut it.
- **Neo-brutalism options:** the highlighted option keeps the family's solid ring.
- **Minimalist Close in top and bottom sheets:** a top or bottom sheet is as high as its content, so its edge can fall between pixels (y = 637.6 in the failing run). That blurred minimalist's 1px ring below 3:1. These two sheets now draw a 2px ring; minimalist's other rings stay 1px.

The harness now:

- finds the visible Select popup by its slot suffix;
- scopes the Base UI toast to its own section;
- places each toast section's viewport at its own height;
- spreads stacked viewports before measuring them.

**Liquid glass (experimental, non-blocking):** the glass configurations pass.

- **Toast:** the remaining findings are focus pixels on the translucent toast, promise and stack surfaces. There, a 2px `--foreground` ring partly falls below 3:1 against the backdrop.
- **Select:** in light mode, the trigger ring of `select` and `select~multiple` falls short too. The default Select already had this finding, so it was not introduced here.
- **Sheet and Table:** no findings.

## Browser tests

`tests/e2e/variants-more.spec.ts` runs under `playwright.specimen-audit.config.ts` and passes 34 of 34: 17 tests in both editions.

- **Tabs:**
  - Vertical tabs move with Arrow Up and Arrow Down.
  - A pill tab's name includes its count.
- **Pagination:**
  - The compact layout moves between pages, and is disabled at the ends.
  - The page-size select updates the range.
- **Table:**
  - Sorting cycles `aria-sort`.
  - The header stays in view while the rows scroll.
  - The actions column is named.
  - Loading marks the table busy, with skeleton rows.
- **Input Group:**
  - Clear empties a controlled field and returns focus to it. It is hidden while the field is empty.
  - The counter becomes live near the limit, and destructive past it.
  - Small and large inputs are shorter and taller than the default.
- **Select:**
  - A multiple Select chooses by keyboard and by pointer, and stays open.
  - It submits every value, and resets.
- **Toast:**
  - A short toast stays 6 seconds; a toast with an action stays until dismissed.
  - A toast pauses while hovered and while focused.
  - Exactly one live region announces it.
  - `ToastPromise` follows the task to success or to an error, and stays open while pending.
  - Stacked toasts overlap, and spread out on hover:
    - The newest toast is in front.
    - No layer rises above it.
    - The layers' bottoms sit 10px and 20px below it.
- **Sheet:**
  - The bottom handle resizes by keyboard, and a drag below a quarter closes the sheet.
  - The side sheet resizes by keyboard and pointer, within its bounds and within the viewport.

## Toast measurements

These were measured in both editions before any change to the primitives:

| Behaviour | Radix | Base UI |
| --- | --- | --- |
| Live regions announcing a toast | 1 | 1 |
| Pause while hovered | Yes | Yes |
| Pause while focused | Yes | Yes, with keyboard focus (`:focus-visible`), as Base UI does |

No announcement fix was needed. The duration (6000 ms, plus 60 ms per character beyond 80, up to 10000 ms; no timer with an action) is computed by `toastDuration` in both editions.

The stack was reworked after a visual review:

- The first version let the older toasts stick out above the newest one, with uneven offsets.
- Now each older toast is a 2.5rem layer with its content hidden. The layers are narrower and paler, and peek out 10px and 20px below the newest toast, as on the board.
- The Base UI edition lists the newest toast last, as the Radix edition does.

## Board comparison

Sections 05–10, 12 and 14 of each family's `project/<Family>073Variants.dc.html`, against the audit screenshots:

| Part | Board | Ours |
| --- | --- | --- |
| Tabs vertical (05) | Triggers stacked on the left, panel beside | Each family's existing vertical style, unchanged |
| Tabs pills (05) | Rounded triggers, the selected one filled with `primary` | As the board |
| Tabs count (05) | 20px × 18px mono pill on `muted`; 25 % `primary-foreground` when selected | 1.25rem × 1.125rem on `muted`; 25 % `primary-foreground` when selected |
| Table sticky and sort (06) | Header in view, sorted header with an arrow button | As the board, with a shadow under the stuck header |
| Table actions (06) | A narrow last column of small icon buttons | As the board, with an "Actions" header hidden from view |
| Table loading (06) | 10px rounded `muted` bars | 0.625rem rounded `muted` bars, pulsing unless reduced motion is set |
| Input sizes (07) | sm 32px at 13px, lg 50px at 16px | sm 2rem at 0.8125rem, lg 3rem at 1rem |
| Input Group clear (07) | A 24px round button on `muted` | A 24px round button, transparent at rest, `muted` on hover |
| Textarea counter (07) | "46 / 160" in the bottom addon, at the end | As the board |
| Toast promise (08) | Spinner, "Publishing preset…" | As the board |
| Toast stack (08) | Two 40px layers, 10px and 20px inset, at 80 % and 55 % | As the board |
| Sheet bottom handle (09) | A short bar at the top of a bottom drawer | A 40px × 4px bar in a 48px × 24px separator |
| Sheet resizable (10) | An 8px × 44px grip on the open edge | An 8px-wide separator along the whole edge, which shows a 2px line on hover and focus |
| Pagination compact (12) | Previous, "Page 2 of 12" in bold, next, spread apart | As the board |
| Pagination page size (12) | "Rows per page", a 34px select, "1–25 of 290" | As the board, with a native select |
| Select multiple (14) | Chips in the trigger; checkboxes in the options | Chips in the trigger; each family's check mark in the options |
| Select chip (14) | 28px `accent` chip with a remove button | 22px `muted` chip with no remove button |
| Select icons (14) | An icon before each option's label | As the board |

The remaining differences:

- **Select chips:** our chips have no remove button, because a button cannot sit inside the trigger button. A choice is removed from the list instead.
- **Select options:** they keep the check mark that single selection already uses, so the two modes match.
- **Input lg:** it is 48px (3rem) high, 2px less than the board's 50px.
- **Resizable sheet:** the whole edge is the grip, a larger target than the board's short bar.
- **Fonts:** the display fonts differ at the preset level, as in earlier sub-projects.

## Website size

Measured by `node scripts/measure-www-first-load.mjs` (gzip, level 9), after a fresh `pnpm build:www`, with no limit set. The editor routes reach the catalog through the in-browser compiler, so the nine components' new templates and styles weigh on them:

| Route | After batch 6a | Now | Growth |
| --- | --- | --- | --- |
| `/editor/preset` | 796.6 kB | 813.6 kB | +17.0 kB |
| `/editor/component` | 239.1 kB | 239.4 kB | +0.3 kB |
| `/editor/component/button` | 801.1 kB | 817.9 kB | +16.8 kB |
