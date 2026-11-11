import { expansionExamples } from '@ombelle/catalog'
import type { ComponentDoc } from './catalog'

export const expansionDocs = {
  spinner: {
    name: 'Spinner', description: 'A busy indicator announced as a status.',
    api: 'Spinner (size, aria-label)', states: 'Spinning, slowed under reduced motion, hidden inside a labelled control',
    basis: 'SVG with role="status"', client: false, usage: expansionExamples.spinner, minimumCli: '0.7.3',
  },
  kbd: {
    name: 'Kbd', description: 'Keyboard keys and shortcuts in text.',
    api: 'Kbd, KbdGroup', states: 'Single key, combination', basis: 'Native kbd element', client: false,
    usage: expansionExamples.kbd, minimumCli: '0.7.3',
  },
  empty: {
    name: 'Empty State', description: 'A consistent zero-data screen with a title, description and actions.',
    api: 'Empty, EmptyHeader, EmptyMedia (variant), EmptyTitle (asChild), EmptyDescription, EmptyContent',
    states: 'With icon, without media, one or two actions', basis: 'Divs with an app-chosen heading', client: false,
    usage: expansionExamples.empty, minimumCli: '0.7.3',
  },
  field: {
    name: 'Field', description: 'Wires a label, hint and error to one control.',
    api: 'Field (orientation, invalid, required, disabled), FieldLabel, FieldControl, FieldDescription, FieldError',
    states: 'Default, required, invalid, disabled, horizontal', basis: 'Native label and aria-describedby; Base UI uses its Field', client: true,
    usage: expansionExamples.field, minimumCli: '0.7.3',
    note: 'FieldControl wraps one control, such as Input, Textarea, Native Select or a Select trigger, and keeps its own styles.',
  },
  meter: {
    name: 'Meter', description: 'A measurement within a known range, such as a quota, in cells or labelled parts.',
    api: 'Meter (value, min, max, segments, warningAt), MeterLabel, MeterSegment (value, tone), MeterLegend, MeterLegendItem (tone)',
    states: 'Discrete, warning, labelled parts, clamped values', basis: 'role="meter" with value text; Base UI uses its Meter', client: true,
    usage: expansionExamples.meter, minimumCli: '0.7.3',
  },
  slider: {
    name: 'Slider', description: 'A value or a range chosen along a track, with optional ticks.',
    api: 'Slider (value, defaultValue, min, max, step, orientation, thumbLabels, getValueText), SliderTicks (values, min, max)',
    states: 'Single, range, disabled, vertical, focus', basis: 'Reviewed Radix Slider; Base UI Slider in the Base UI edition', client: true,
    usage: expansionExamples.slider, minimumCli: '0.7.3',
  },
  'toggle-group': {
    name: 'Toggle Group', description: 'A segmented single choice or a toolbar of pressed buttons, with one Tab stop.',
    api: 'ToggleGroup (type, value, defaultValue, variant, orientation), ToggleGroupItem (value)',
    states: 'Checked, pressed, disabled, segmented, toolbar, focus', basis: 'Reviewed Radix Toggle Group; Base UI Toggle Group in the Base UI edition', client: true,
    usage: expansionExamples['toggle-group'], minimumCli: '0.7.3',
  },
  chip: {
    name: 'Chip', description: 'Pressable filter chips and removable tokens.',
    api: 'Chip (pressed, defaultPressed, onPressedChange), ChipRemove (label, onRemove), ChipGroup',
    states: 'Pressed, static, removable, disabled, focus', basis: 'Native button with aria-pressed, and a span with a remove button', client: true,
    usage: expansionExamples.chip, minimumCli: '0.7.3',
  },
  'tag-input': {
    name: 'Tag Input', description: 'A field of removable tags: Enter or comma adds one, Backspace removes the last.',
    api: 'TagInput (value, defaultValue, separators, max, allowDuplicates, name), TagInputList, TagInputInput',
    states: 'Empty, tags, duplicate, at maximum, disabled, focus within', basis: 'Native input and list with a polite live region', client: true,
    usage: expansionExamples['tag-input'], minimumCli: '0.7.3',
  },
  'input-otp': {
    name: 'Input OTP', description: 'A one-time code in separate slots; pasting a code fills them all.',
    api: 'InputOTP (maxLength, value, onChange, onComplete, pattern, name), InputOTPGroup, InputOTPSlot (index), InputOTPSeparator',
    states: 'Empty, active, filled, disabled', basis: 'input-otp; Base UI OTP Field in the Base UI edition', client: true,
    usage: expansionExamples['input-otp'], minimumCli: '0.7.3',
  },
  calendar: {
    name: 'Calendar', description: 'A month grid for a date or a range, and a Date Picker that opens it from a button.',
    api: 'Calendar (mode single or range, selected, onSelect, defaultMonth, disabled, disablePast, weekStartsOn, locale, numberOfMonths, today), DatePicker (value, defaultValue, onValueChange, mode, placeholder, format, locale, name, calendar), toIsoDate, fromIsoDate, formatDate',
    states: 'Today, selected, range start, middle and end, outside the month, disabled, picker open', basis: 'react-day-picker; Radix Popover, or Base UI Popover in the Base UI edition, for the Date Picker', client: true,
    usage: expansionExamples.calendar, minimumCli: '0.7.3',
  },
  combobox: {
    name: 'Combobox', description: 'A text field that filters a list of options, with an optional create row and chips for several values.',
    api: 'Combobox (value, onValueChange, multiple, onCreate, name, disabled), ComboboxInput, ComboboxContent, ComboboxList, ComboboxGroup (heading), ComboboxItem (value), ComboboxCreate, ComboboxEmpty, highlightMatch',
    states: 'Closed, open, filtered, empty, create offered, chips, disabled', basis: 'cmdk in Radix Popover; Base UI Combobox in the Base UI edition', client: true,
    usage: expansionExamples.combobox, minimumCli: '0.7.3',
  },
  command: {
    name: 'Command', description: 'A keyboard-first command menu, inline or in a dialog.',
    api: 'Command (label, filter, defaultSearch), CommandDialog (open, onOpenChange, title), CommandDialogTrigger, CommandInput, CommandList, CommandGroup (heading), CommandItem (value, keywords, onSelect, disabled), CommandShortcut, CommandSeparator, CommandEmpty',
    states: 'Filtered, highlighted, empty, disabled item, dialog', basis: 'cmdk and Radix Dialog; Base UI Autocomplete and Dialog in the Base UI edition', client: true,
    usage: expansionExamples.command, minimumCli: '0.7.3',
  },
  'hover-card': {
    name: 'Hover Card', description: 'A preview card for a link, shown on hover and keyboard focus.',
    api: 'HoverCard (open, onOpenChange, openDelay, closeDelay), HoverCardTrigger (href), HoverCardContent (side, align), HoverCardArrow',
    states: 'Closed, open on hover, open on focus', basis: 'Radix Hover Card; Base UI Preview Card in the Base UI edition', client: true,
    usage: expansionExamples['hover-card'], minimumCli: '0.7.3',
  },
  'context-menu': {
    name: 'Context Menu', description: 'A menu that opens at the pointer on right-click, or with Shift+F10.',
    api: 'ContextMenu, ContextMenuTrigger (variant zone), ContextMenuContent, ContextMenuItem (variant destructive), ContextMenuCheckboxItem, ContextMenuRadioGroup, ContextMenuRadioItem, ContextMenuLabel, ContextMenuSeparator, ContextMenuShortcut, ContextMenuSub, ContextMenuSubTrigger, ContextMenuSubContent',
    states: 'Closed, open, highlighted, submenu, destructive, disabled', basis: 'Radix Context Menu; Base UI Context Menu in the Base UI edition', client: true,
    usage: expansionExamples['context-menu'], minimumCli: '0.7.3',
  },
  stepper: {
    name: 'Stepper', description: 'Ordered steps with done, current and upcoming states.',
    api: 'Stepper (orientation), StepperItem (status), StepperIndicator, StepperTitle, StepperDescription, StepperSeparator',
    states: 'Complete, current, upcoming, horizontal, vertical', basis: 'Native nav and ordered list with aria-current="step"', client: false,
    usage: expansionExamples.stepper, minimumCli: '0.7.3',
  },
  toast: {
    name: 'Toast', description: 'Transient feedback with optional actions, pausing and keyboard dismissal.',
    api: 'ToastProvider (duration), ToastViewport (stack), Toast (variant, duration), ToastTitle, ToastDescription, ToastAction (altText), ToastClose, ToastPromise (promise, loading, success, error), toastDuration',
    states: 'Open, timed dismissal by content length, kept open with an action, paused on hover and focus, pending promise, stacked, swipe, focus', basis: 'Reviewed Toast primitive; Base UI uses its native toast manager', client: true,
    usage: expansionExamples.toast, minimumCli: '0.7.2',
    note: 'The Base UI edition uses useToastManager and a native toast object; see the exported example for that edition.',
  },
  'input-group': {
    name: 'Input Group', description: 'Combines a native input or textarea with text, icons and action buttons.',
    api: 'InputGroup, InputGroupInput, InputGroupTextarea, InputGroupAddon (align), InputGroupText, InputGroupButton, InputGroupClear (label, onClear), InputGroupCount (value, max)',
    states: 'Focus within, invalid, disabled, multiline', basis: 'Native input, textarea and button in a group', client: false,
    usage: expansionExamples['input-group'], minimumCli: '0.7.2',
  },
  sheet: {
    name: 'Sheet', description: 'A modal side panel for navigation, filters and project details.',
    api: 'Sheet, SheetTrigger, SheetClose, SheetContent (side, size, resizable, defaultSize, minSize, maxSize, onSizeChange), SheetHandle, SheetHeader, SheetFooter, SheetTitle, SheetDescription',
    states: 'Open, closed, scroll, focus return, RTL, bottom drawer resized or closed by its handle, side panel resized', basis: 'Reviewed Dialog primitive with logical edge positioning', client: true,
    usage: expansionExamples.sheet, minimumCli: '0.7.2',
  },
  'alert-dialog': {
    name: 'Alert Dialog', description: 'Requests a deliberate response before a destructive or important action.',
    api: 'AlertDialog, AlertDialogTrigger, AlertDialogContent, AlertDialogHeader, AlertDialogFooter, AlertDialogTitle, AlertDialogDescription, AlertDialogCancel, AlertDialogAction',
    states: 'Open, closed, cancel focus, focus return', basis: 'Dedicated Alert Dialog primitive', client: true,
    usage: expansionExamples['alert-dialog'], minimumCli: '0.7.2',
  },
  breadcrumb: {
    name: 'Breadcrumb', description: 'Shows a page’s place in a hierarchy of links.',
    api: 'Breadcrumb, BreadcrumbList, BreadcrumbItem, BreadcrumbLink, BreadcrumbPage, BreadcrumbSeparator, BreadcrumbEllipsis',
    states: 'Link, current page, focus', basis: 'Native nav, ordered list, links and current-page span', client: false,
    usage: expansionExamples.breadcrumb, minimumCli: '0.7.2',
  },
  pagination: {
    name: 'Pagination', description: 'Links between pages of results with active and disabled states.',
    api: 'Pagination, PaginationContent, PaginationItem, PaginationLink (isActive, disabled), PaginationPrevious, PaginationNext, PaginationEllipsis, PaginationCompact (page, pageCount), PaginationPageSize (value, options, onValueChange, range)',
    states: 'Default, active, disabled, focus', basis: 'Native nav, list and anchor links', client: false,
    usage: expansionExamples.pagination, minimumCli: '0.7.2',
  },
} satisfies Record<keyof typeof expansionExamples, Omit<ComponentDoc, 'id'>>
