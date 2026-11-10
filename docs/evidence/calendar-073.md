# Calendar evidence (0.7.3)

Calendar and Date Picker. Spec: `docs/superpowers/specs/2026-11-10-calendar-design.md`.

## Specimen audit

`pnpm test:specimen-audit`, limited to this component (`OMBELLE_AUDIT_COMPONENTS=calendar`), measured the Calendar specimen in five families, both editions and both colour modes, with Playwright's bundled Chromium. The other 44 components were not re-run: nothing they render changed. The default specimen is a single-date Calendar, measured in place. The Date Picker specimen (`picker` mode) is opened by a click, and the harness skips the overlay step when a section has no trigger.

| Run | Result |
| --- | --- |
| First run | 16 configurations failed, all on axe `label-content-name-mismatch`: every day button showed "1" and was named "Sunday, November 1st, 2026". The four liquid glass configurations passed, as their findings do not block |
| After naming days with `Intl` (`dateStyle: 'full'`) | 18 of 20 passed; minimalist light, both editions, drew 128 of the 130 focus pixels needed on the chosen day |
| After the minimalist day ring fix, minimalist only | 4 of 4 passed; no Calendar findings remain in any configuration, liquid glass included |

Fixes, pinned in tests:

- **Day names:** each day is named with its number as a word, such as "Sunday, November 1, 2026", with "Today, " before and ", selected" after, as react-day-picker does. Test: `packages/catalog/test/calendar.test.ts`, "names each day with its number as a word".
- **Minimalist focus ring:** the family's 1px ring with a 4px gap fell on the neighbouring days. Days take a 2px ring with a 1px gap. Test: `packages/catalog/test/specimen-audit-fixes.test.ts`, "the 0.7.3 calendar".

## Browser tests

`tests/e2e/calendar.spec.ts` passes 12 of 12 in both editions:

- Tab entry into the grid, and the Arrow, Home, End, Page Up and Page Down keys.
- A disabled past day, by click and by keyboard.
- Ranges in either click order, and a third click that restarts the range.
- The Date Picker opening on its date, closing on Enter and Escape with focus returned, its hidden input, and a value cleared from outside.
- Escape inside a dialog closes only the picker.
- Choosing a day in `America/Los_Angeles` submits the same day.

## Board comparison

Section 05 of each family's `project/<Family>073Components.dc.html`:

| Part | Board | Ours |
| --- | --- | --- |
| Card | Family border, large radius and shadow, 14px padding | The family's Popover surface, 0.875rem padding |
| Month | 800, 15px | 800, 0.9375rem |
| Weekdays | 700, 10px, uppercase, 0.06em; neo-brutalism the text colour, 900 | As the board |
| Days | 36px; pill in ombelle, minimalist and liquid glass; 8px in flat; square and bold in neo-brutalism | As the board |
| Today | Border colour ring, bold; flat a 2px inset `primary` ring in `primary` | As the board |
| Range ends | `primary`; minimalist `foreground` | As the board |
| Range middle | `accent`, no rounding | As the board |
| Outside days | Muted, 60% | As the board |

Differences that remain: the board's display fonts, a preset-level difference as in sub-project 2, and the minimalist day ring described above, which favours a visible focus ring.

## Website size

The website editor does not use Calendar. The catalog's growth reaches its editor routes through the in-browser compiler; measured by `node scripts/measure-www-first-load.mjs` (gzip, level 9), with no limit set:

| Route | After sub-project 4 | Now | Growth |
| --- | --- | --- | --- |
| `/editor/preset` | 781.2 kB | 789.7 kB | +8.5 kB |
| `/editor/component` | 238.5 kB | 238.8 kB | +0.3 kB |
| `/editor/component/button` | 786.2 kB | 794.5 kB | +8.3 kB |
