'use client'
import * as React from 'react'
import { Day, DayButton, DayPicker, Month, MonthCaption, MonthGrid, Months, Nav, NextMonthButton, PreviousMonthButton, Root, Week, Weekday, Weekdays, type DateRange, type DayPickerProps } from 'react-day-picker'
import { Popover as PopoverPrimitive } from '@base-ui/react/popover'
import { CalendarIcon, ChevronLeftIcon, ChevronRightIcon } from 'lucide-react'
import { cn } from './utils.js'
import './calendar.css'

/** The local calendar date as YYYY-MM-DD. */
export function toIsoDate(date: Date): string {
  const pad = (value: number) => String(value).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
}

/** YYYY-MM-DD as a local date at noon, so no time zone moves it to another day; undefined when it is not a real date. */
export function fromIsoDate(text: string): Date | undefined {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(text)
  if (!match) return undefined
  const [year, month, day] = [Number(match[1]), Number(match[2]), Number(match[3])]
  const date = new Date(year, month - 1, day, 12)
  return date.getFullYear() === year && date.getMonth() === month - 1 && date.getDate() === day ? date : undefined
}

type Range = { from?: Date; to?: Date }
/** A date, or a range shown with Intl's formatRange; '' when there is none. */
export function formatDate(value: Date | Range | undefined, options: Intl.DateTimeFormatOptions = { dateStyle: 'medium' }, locale?: string): string {
  if (!value) return ''
  const format = new Intl.DateTimeFormat(locale, options)
  if (value instanceof Date) return format.format(value)
  if (value.from && value.to) return format.formatRange(value.from, value.to)
  return value.from ? format.format(value.from) : ''
}

type DateInput = Date | string
const asDate = (value: DateInput | undefined) => (typeof value === 'string' ? fromIsoDate(value) : value)
type DistributiveOmit<T, K extends PropertyKey> = T extends unknown ? Omit<T, K> : never

export type CalendarProps = DistributiveOmit<DayPickerProps, 'selected' | 'defaultMonth' | 'month' | 'today'> & {
  /** A Date or a YYYY-MM-DD string; a range takes { from, to }. */
  selected?: DateInput | { from?: DateInput; to?: DateInput }
  defaultMonth?: DateInput
  month?: DateInput
  today?: DateInput
  /** Disables the days before today. */
  disablePast?: boolean
}

// Every part carries its data-slot; days also say where they sit in a range, which
// react-day-picker marks only with classes.
const parts: DayPickerProps['components'] = {
  Root: (props) => <Root {...props} data-slot="calendar" />,
  Months: (props) => <Months {...props} data-slot="calendar-months" />,
  Month: (props) => <Month {...props} data-slot="calendar-month" />,
  Nav: (props) => <Nav {...props} data-slot="calendar-nav" />,
  PreviousMonthButton: (props) => <PreviousMonthButton {...props} data-slot="calendar-previous" />,
  NextMonthButton: (props) => <NextMonthButton {...props} data-slot="calendar-next" />,
  MonthCaption: (props) => <MonthCaption {...props} data-slot="calendar-caption" />,
  MonthGrid: (props) => <MonthGrid {...props} data-slot="calendar-grid" />,
  Weekdays: (props) => <Weekdays {...props} data-slot="calendar-weekdays" />,
  Weekday: (props) => <Weekday {...props} data-slot="calendar-weekday" />,
  Week: (props) => <Week {...props} data-slot="calendar-week" />,
  Day: (props) => (
    <Day
      {...props}
      data-slot="calendar-day"
      data-range-start={props.modifiers.range_start || undefined}
      data-range-middle={props.modifiers.range_middle || undefined}
      data-range-end={props.modifiers.range_end || undefined}
    />
  ),
  DayButton: (props) => <DayButton {...props} data-slot="calendar-day-button" />,
  Chevron: ({ orientation }) => (orientation === 'right' ? <ChevronRightIcon aria-hidden="true" /> : <ChevronLeftIcon aria-hidden="true" />),
}

/**
 * Day names with the day number as its own word ("Sunday, November 1, 2026"), so the visible
 * number is part of the button's name; react-day-picker's default says "1st".
 */
function dayName(date: Date, modifiers: { today?: boolean; selected?: boolean }, options?: { locale?: { code?: string } }) {
  let label = new Intl.DateTimeFormat(options?.locale?.code, { dateStyle: 'full' }).format(date)
  if (modifiers.today) label = `Today, ${label}`
  if (modifiers.selected) label = `${label}, selected`
  return label
}

/**
 * A month grid for choosing a date or a range. Arrow keys move by day, Page Up and Page Down by
 * month (with Shift, by year), Home and End to the ends of the week; Enter or Space chooses.
 */
export function Calendar({ className, selected, defaultMonth, month, today, disablePast, disabled, components, labels, showOutsideDays = true, weekStartsOn = 0, ...props }: CalendarProps) {
  const now = asDate(today)
  const chosen = selected === undefined || typeof selected === 'string' || selected instanceof Date
    ? asDate(selected as DateInput | undefined)
    : { from: asDate(selected.from), to: asDate(selected.to) }
  const past = disablePast ? [{ before: now ?? new Date() }] : []
  const blocked = disabled === undefined ? past : [...past, ...(Array.isArray(disabled) ? disabled : [disabled])]
  return (
    <DayPicker
      {...(props as DayPickerProps)}
      {...(selected === undefined ? {} : { selected: chosen as never })}
      defaultMonth={asDate(defaultMonth) ?? (chosen instanceof Date ? chosen : (chosen as Range | undefined)?.from)}
      {...(month === undefined ? {} : { month: asDate(month) })}
      {...(now ? { today: now } : {})}
      {...(blocked.length ? { disabled: blocked } : {})}
      showOutsideDays={showOutsideDays}
      weekStartsOn={weekStartsOn}
      className={cn(className)}
      components={{ ...parts, ...components }}
      labels={{ labelDayButton: dayName, labelGridcell: dayName, ...labels }}
    />
  )
}

type PickerCommon = {
  placeholder?: string
  /** How the trigger shows the date; default { dateStyle: 'medium' }. */
  format?: Intl.DateTimeFormatOptions
  /** A BCP 47 tag for the trigger text; default the document's language. */
  locale?: string
  disabled?: boolean
  /** Submits YYYY-MM-DD as a hidden input; a range submits name-from and name-to. */
  name?: string
  id?: string
  className?: string
  'aria-label'?: string
  'aria-labelledby'?: string
  'aria-describedby'?: string
  /** Props for the Calendar inside, such as disablePast, today or weekStartsOn. */
  calendar?: Omit<CalendarProps, 'mode' | 'selected' | 'onSelect' | 'required'>
}
export type DatePickerProps = PickerCommon & (
  | { mode?: 'single'; value?: Date | null; defaultValue?: DateInput; onValueChange?(value: Date | undefined): void }
  | { mode: 'range'; value?: DateRange | null; defaultValue?: { from?: DateInput; to?: DateInput }; onValueChange?(value: DateRange | undefined): void }
)

/** A button that shows the chosen date and opens a Calendar to change it. */
export function DatePicker(props: DatePickerProps) {
  const { placeholder = 'Choose a date', format = { dateStyle: 'medium' }, locale, disabled, name, id, className, calendar } = props
  const range = props.mode === 'range'
  const initial = props.defaultValue === undefined ? undefined
    : range ? { from: asDate((props.defaultValue as Range).from), to: asDate((props.defaultValue as Range).to) } as DateRange
    : asDate(props.defaultValue as DateInput)
  const [own, setOwn] = React.useState<Date | DateRange | undefined>(initial)
  // The trigger always reads the current value, so a change from outside shows at once.
  const value = props.value === undefined ? own : props.value ?? undefined
  const [open, setOpen] = React.useState(false)
  const commit = (next: Date | DateRange | undefined) => {
    if (props.value === undefined) setOwn(next)
    ;(props.onValueChange as ((value: Date | DateRange | undefined) => void) | undefined)?.(next)
  }
  const text = formatDate(value, format, locale)
  const focusDay = value instanceof Date ? value : (value as DateRange | undefined)?.from
  return (
    <div data-slot="date-picker" className={cn(className)}>
      <PopoverPrimitive.Root open={open} onOpenChange={setOpen}>
        <PopoverPrimitive.Trigger
          id={id}
          disabled={disabled}
          aria-label={props['aria-label']}
          aria-labelledby={props['aria-labelledby']}
          aria-describedby={props['aria-describedby']}
          data-slot="date-picker-trigger"
          data-placeholder={text ? undefined : ''}
          render={(triggerProps) => <button {...triggerProps} type="button" />}
        >
          <CalendarIcon aria-hidden="true" />
          <span>{text || placeholder}</span>
        </PopoverPrimitive.Trigger>
        <PopoverPrimitive.Portal>
          <PopoverPrimitive.Positioner align="start" sideOffset={6}>
          <PopoverPrimitive.Popup data-slot="date-picker-content">
            {range ? (
              <Calendar
                {...calendar}
                mode="range"
                autoFocus
                defaultMonth={calendar?.defaultMonth ?? focusDay}
                selected={value as DateRange | undefined}
                onSelect={(next: DateRange | undefined) => {
                  commit(next)
                  if (next?.from && next.to) setOpen(false)
                }}
              />
            ) : (
              <Calendar
                {...calendar}
                mode="single"
                autoFocus
                defaultMonth={calendar?.defaultMonth ?? focusDay}
                selected={value as Date | undefined}
                onSelect={(next: Date | undefined) => {
                  commit(next)
                  setOpen(false)
                }}
              />
            )}
          </PopoverPrimitive.Popup>
          </PopoverPrimitive.Positioner>
        </PopoverPrimitive.Portal>
      </PopoverPrimitive.Root>
      {name && (range ? (
        <>
          <input type="hidden" name={`${name}-from`} value={(value as DateRange | undefined)?.from ? toIsoDate((value as DateRange).from!) : ''} />
          <input type="hidden" name={`${name}-to`} value={(value as DateRange | undefined)?.to ? toIsoDate((value as DateRange).to!) : ''} />
        </>
      ) : <input type="hidden" name={name} value={value instanceof Date ? toIsoDate(value) : ''} />)}
    </div>
  )
}
