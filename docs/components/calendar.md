# Calendar

Calendar is a month grid for choosing a date or a range of dates. The same component provides a Date Picker: a button that shows the chosen date and opens the Calendar in a popover. It is available in all five families in light and dark mode, with Radix and Base UI editions; the template is a client component.

This component requires CLI **0.7.3** or later: `npx @ombelle-ui/cli@0.7.3 add calendar`. For a built local checkout:

```powershell
pnpm exec node packages/cli/dist/main.js add calendar --cwd APP --dry-run --json
pnpm exec node packages/cli/dist/main.js add calendar --cwd APP --yes
```

```tsx
import { Calendar, DatePicker, formatDate } from '@/components/ui/calendar'

export function Availability() {
  const [away, setAway] = React.useState<{ from?: Date; to?: Date }>()
  const [due, setDue] = React.useState<Date>()
  return (
    <>
      <Calendar mode="range" numberOfMonths={2} disablePast aria-label="Days away" selected={away} onSelect={setAway} />
      <p role="status">{away?.from ? `Away ${formatDate(away)}` : 'No days away'}</p>
      <label id="due-label">Due date</label>
      <DatePicker aria-labelledby="due-label" name="due" value={due ?? null} onValueChange={setDue} />
    </>
  )
}
```

## API and accessibility

- **Calendar**
  - `mode`: `single` (`selected` is a Date, `onSelect(date)`) or `range` (`selected` is `{ from, to }`, `onSelect(range)`).
  - Other props: `defaultMonth`, `month`, `numberOfMonths`, `today`, `weekStartsOn` (0 Sunday by default, or 1 Monday) and `locale` (a date-fns locale).
  - `disabled` takes react-day-picker matchers, and `disablePast` disables the days before today.
  - Dates may be Date objects or `YYYY-MM-DD` strings. Other react-day-picker props pass through.
- **DatePicker**
  - `value` or `defaultValue`, `onValueChange`, `mode` (`single` or `range`), `placeholder` (default "Choose a date"), `format` (`Intl.DateTimeFormatOptions`, default `{ dateStyle: 'medium' }`), `locale` (a BCP 47 tag) and `disabled`.
  - `name` submits `YYYY-MM-DD`; a range submits `name-from` and `name-to`.
  - `calendar` passes options such as `disablePast` or `today` to the Calendar inside.
- **Helpers:** `toIsoDate`, `fromIsoDate` and `formatDate`.
  - `fromIsoDate` returns a local date at noon, so a time zone never moves it to another day.
  - `formatDate` writes a range with `Intl.DateTimeFormat.formatRange`, for example "Nov 12 – 18, 2026".
- **Keyboard**
  - The month is a grid named by its month, with one Tab stop.
  - Arrow keys move by day, Page Up and Page Down by month (with Shift, by year), and Home and End to the ends of the week. Enter or Space chooses.
  - In a range, two choices make the range and a third starts a new one.
- **Announcements**
  - Each day is named by its full date ("Sunday, November 1, 2026"), with "Today" and "selected" when they apply. The `labels` prop replaces these names.
  - The shown month is announced politely when it changes, and disabled days cannot be chosen.
- **Date Picker focus:** opening it focuses the chosen day, or today. Choosing a day, or completing a range, closes it; Escape closes it without a change. Focus then returns to the button. The button text always shows the current value, including a value changed from outside.

## Recipe

The recipe editor sets the mode (`single`, `range` or `picker`), the first day of the week, the month shown, the selected date or range, whether past days are disabled, the label and the placeholder. Its validation rejects:

- a date that does not exist;
- a range that ends before it starts;
- an end date outside range mode.

Specimens fix today at 10 November 2026, so they do not change from day to day.

Compilation emits `components/ui/calendar.tsx`, `components/ui/calendar.css` and `examples/calendar.tsx`.

Runtime dependencies of the Radix edition are:

- React 19.3.1;
- react-day-picker 10.0.2 (MIT), with date-fns 4.4.0 and @date-fns/tz 1.5.0;
- @radix-ui/react-popover 1.3.1;
- clsx 2.1.1 and tailwind-merge 3.7.0;
- lucide-react 1.55.0.

The Base UI edition uses @base-ui/react 1.9.0 in place of Radix Popover.

## Editions

Neither Radix nor Base UI has a calendar, so both editions use react-day-picker for the grid. They differ only in the Date Picker's popover: Radix Popover in the Radix edition, and Base UI Popover in the Base UI edition. Part names and `data-slot` values are the same in both.

## Liquid glass

Liquid glass is experimental for Calendar, as for every glass component, and its findings do not block a release. See [liquid glass](liquid-glass.md).

See [Calendar evidence](../evidence/calendar-073.md) for the specimen audit, the browser tests and the board comparison.
