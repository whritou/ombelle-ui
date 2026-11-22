# Calendar

Sub-project 5 of the 0.7.3 work. It adds one catalog component, Calendar, which also provides a Date Picker: a button that opens the Calendar in a Popover. Both come in the Radix and Base UI editions and all five style families, with a component-editor recipe. The preview scenes use them; the website editor does not change. This work stacks on sub-project 4 (overlays and search, PR #104).

## Intent

The 0.7.3 design artifact (https://claude.ai/artifact/1FMRGWoyJSwht9wATT838U, "0.7.3 new components" boards, section 05) shows a month grid with previous and next buttons, a today marker and a selected range, and notes that a Date Picker is a Calendar inside a Popover. Neither Radix nor Base UI 1.9 has a calendar.

Decisions taken in brainstorming (10 November 2026):

- **Primitive:** `react-day-picker` 10.0.2 (MIT) for the grid, keyboard and ARIA, in both editions, as the board names.
- **Scope:** Calendar with single and range modes, plus a `DatePicker` part.
- **Use:** the preview scenes only. The website editor has no date field and does not change.

## Component

`calendar` is a client component in five families and both colour modes. Liquid glass is experimental, and its findings do not block the release. Installing it needs CLI 0.7.3, and the catalog grows from 44 to 45 components.

### Calendar

- **Props:**
  - `mode`: `single` (`selected?: Date`, `onSelect(date?: Date)`) or `range` (`selected?: { from?: Date; to?: Date }`, `onSelect(range?)`).
  - `defaultMonth`, `disabled` (react-day-picker matchers: dates, ranges, `{ before: date }`), `weekStartsOn` (0 Sunday by default, as on the board, or 1 Monday), `locale` (a date-fns locale; English by default), `numberOfMonths` and `today`.
  - Other DayPicker props pass through.
- **Slots:** every part carries a `data-slot`, set through DayPicker's `components` prop: `calendar`, `calendar-months`, `calendar-month`, `calendar-nav`, `calendar-previous`, `calendar-next`, `calendar-caption`, `calendar-grid`, `calendar-weekdays`, `calendar-weekday`, `calendar-week`, `calendar-day` and `calendar-day-button`.
- **States:** the styles read react-day-picker's day attributes under the `calendar-day` slot: `data-selected`, `data-today`, `data-outside`, `data-disabled`, `data-range-start`, `data-range-middle`, `data-range-end` and `data-focused`.
- **Accessibility, from react-day-picker:**
  - The month is an ARIA `grid` named by its caption, with a single Tab stop.
  - Arrow keys move by day, Page Up and Page Down by month, Shift+Page Up and Shift+Page Down by year, and Home and End to the start and end of the week. Enter and Space choose.
  - Each day button is named by its full date, and today is announced as "Today".
  - The previous and next buttons are named, and the shown month is announced politely when it changes.
  - The English labels stay the defaults, and DayPicker's `labels` prop replaces them.

### DatePicker

- **Props:** `value`, `defaultValue`, `onValueChange`, `mode` (`single` by default, or `range`), `placeholder` (default "Choose a date"), `format` (`Intl.DateTimeFormatOptions`, default `{ dateStyle: 'medium' }`), `locale` (a BCP 47 tag for `Intl`, default the document's), `disabled` and `name`. Every Calendar prop except `mode`, `selected` and `onSelect` passes to its Calendar.
- **Form values:** a named DatePicker submits a hidden input holding the date as `YYYY-MM-DD`. A range submits two inputs, `name` + `-from` and `name` + `-to`.
- **Trigger text:** the trigger is a button showing the formatted value or the placeholder. A range is shown with `Intl.DateTimeFormat.formatRange`, for example "Nov 12 – 18, 2026".
- **Behaviour:**
  - Opening focuses the selected day, or today.
  - Choosing a day in single mode closes the popover, and so does completing a range. Focus then returns to the trigger.
  - Escape closes the popover without changing the value.
- **Editions:** the popover is Radix Popover (`@radix-ui/react-popover` 1.3.1) in the Radix edition and Base UI Popover in the Base UI edition. The Calendar part is identical in the two templates.
- **Helpers:** the templates export three pure helpers:
  - `toIsoDate(date)` gives `YYYY-MM-DD` from the local calendar date.
  - `fromIsoDate(text)` gives a local Date at noon, so time zones never shift the day. An invalid string gives `undefined`.
  - `formatDate(value, options, locale)` formats a single date or a range.

### Dependencies

| Edition | Packages |
| --- | --- |
| Both | React 19.3.1, react-day-picker 10.0.2 (with the date-fns and @date-fns/tz versions it requires, pinned in `manifest.ts`), clsx 2.1.1, tailwind-merge 3.7.0, lucide-react 1.55.0 for the chevrons |
| Radix | @radix-ui/react-popover 1.3.1 |
| Base UI | @base-ui/react 1.9.0; no Radix package |

## Styles

All five families follow their board's section 05:

- **Surface:** the Calendar is a rounded card with the family's border and shadow. The header shows the month in bold between two outline icon buttons.
- **Weekdays:** small uppercase headers.
- **Days:** round 36px buttons.
  - Today is ringed with the border colour.
  - The start and end of a range use `primary` and `primary-foreground`.
  - The middle of a range uses `accent` with no rounding.
  - Days outside the month are muted, and disabled days are muted and dashed.
- **Focus:** a day or button with focus draws the family's focus ring; liquid glass draws a 2px `foreground` ring with no gap.
- **Forced colours:** chosen days use `Highlight` and `HighlightText`.
- **Reduced motion:** no transition.
- **Date Picker:** the trigger takes the Input look of its family, with a calendar icon. Its popover is the Popover surface.
- **Lint:** the rules follow the existing ones: one `data-slot` per selector, logical properties, and the glass `@supports` form.

## Recipe and the component editor

| Props | Content |
| --- | --- |
| `mode` enum `single\|range\|picker` (default `single`); `weekStartsOn` 0 or 1 (default 0); `month` `YYYY-MM` (default `2026-11`); `selectedFrom` `YYYY-MM-DD` (default `2026-11-12`); `selectedTo` `YYYY-MM-DD`, optional (default `2026-11-18` when `mode` is `range`); `disablePast` boolean (default false) | `label` (default `Pick a date`), the grid's or the trigger's name; `placeholder` (default `Choose a date`) |

`validateComposition` rejects:

- a date that is not a real calendar date;
- `selectedTo` earlier than `selectedFrom`;
- `selectedTo` in `single` or `picker` mode.

The compiler specimen draws November 2026 with `today` fixed at 2026-11-10, so the audit and the stable hashes do not change from day to day. It shows:

- a range of the 12th to the 18th in `range` mode;
- the 12th in `single` mode;
- in `picker` mode, a closed DatePicker holding the 12th. The specimen audit opens it with a click, as it opens Popover.

`install-command.ts` adds `calendar` to the 0.7.3 gate.

## Preview scenes and gallery

- **projects:** a DatePicker "Due date" in the Filters Sheet, beside the Owner Combobox. Every row gets a fixed due date, and choosing a date shows only the projects due by then.
- **settings:** an "Out of office" card holding a two-month range Calendar, with past days disabled, and a live summary such as "Away Nov 12 – 18, 2026".
- **Gallery and edition scenarios:** a `data-testid="calendar"` section with a single Calendar, a range Calendar and a DatePicker in both editions, for the browser tests. Their `today` is fixed.
- **Site:** a catalog entry with `minimumCli: '0.7.3'`.
- **Website editor:** unchanged and not measured. The catalog's growth reaches the editor through the in-browser compiler; the evidence records it without a limit.

## Verification

- **Unit tests (vitest):**
  - **Contract:** the parts and slots, dependencies per edition and experimental glass.
  - **Server markup with `today` fixed:**
    - a `grid` named "November 2026";
    - seven weekday headers starting with Su, or Mo with `weekStartsOn={1}`;
    - day buttons named by their full date;
    - `data-range-start`, `-middle` and `-end` on the 12th, the 13th to 17th and the 18th;
    - the DatePicker trigger showing "Nov 12, 2026" or the placeholder;
    - the hidden inputs.
  - **Helpers:** `toIsoDate` and `fromIsoDate` round trips with no time-zone shift, invalid input, and `formatDate` for a single date and for a range across two months.
  - **Contracts and compiler:** the `validateComposition` rules, the specimen in all five families, deterministic output and the 0.7.3 gate.
- **Browser tests:** `tests/e2e/calendar.spec.ts` runs in both editions on the edition pages.
  - One Tab enters the grid.
  - Arrow keys, Page Up and Page Down, and Home and End move the focus as described.
  - Enter chooses a day.
  - In range mode, two clicks make a range and a third starts a new one.
  - Disabled days cannot be chosen.
  - DatePicker: Enter on a day closes it and focus returns to the trigger, and Escape closes it without changing the value.
- **Specimen audit:** `OMBELLE_AUDIT_COMPONENTS=calendar` only, in all 20 configurations, with an `overlays` entry that opens the picker by click.
- **Board comparison:** section 05 in the five families. Fixed differences are pinned in `specimen-audit-fixes.test.ts`, and the rest are listed with their reason.
- **Reruns:** only the tests a change can affect are rerun; passing tests on unchanged code are not.

## Documentation

- `docs/components/calendar.md`: usage, keyboard, modes, `locale` and `weekStartsOn`, the DatePicker, and the editions.
- `docs/evidence/calendar-073.md`.
- Updates to `docs/accessibility-review.md`, docs/03, the README (45 components), the CHANGELOG and `tests/integration/liquid-glass-cli.test.ts`.

## Out of scope

- Typing a date into a text field.
- Choosing several separate dates.
- Times and time zones.
- Month and year drop-downs.
- Any use in the website editor.
- Releases and the CLI version bump.
