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
  stepper: {
    name: 'Stepper', description: 'Ordered steps with done, current and upcoming states.',
    api: 'Stepper (orientation), StepperItem (status), StepperIndicator, StepperTitle, StepperDescription, StepperSeparator',
    states: 'Complete, current, upcoming, horizontal, vertical', basis: 'Native nav and ordered list with aria-current="step"', client: false,
    usage: expansionExamples.stepper, minimumCli: '0.7.3',
  },
  toast: {
    name: 'Toast', description: 'Transient feedback with optional actions, pausing and keyboard dismissal.',
    api: 'ToastProvider (duration), ToastViewport, Toast (variant), ToastTitle, ToastDescription, ToastAction (altText), ToastClose',
    states: 'Open, timed dismissal, paused, swipe, focus', basis: 'Reviewed Toast primitive; Base UI uses its native toast manager', client: true,
    usage: expansionExamples.toast, minimumCli: '0.7.2',
    note: 'The Base UI edition uses useToastManager and a native toast object; see the exported example for that edition.',
  },
  'input-group': {
    name: 'Input Group', description: 'Combines a native input or textarea with text, icons and action buttons.',
    api: 'InputGroup, InputGroupInput, InputGroupTextarea, InputGroupAddon (align), InputGroupText, InputGroupButton',
    states: 'Focus within, invalid, disabled, multiline', basis: 'Native input, textarea and button in a group', client: false,
    usage: expansionExamples['input-group'], minimumCli: '0.7.2',
  },
  sheet: {
    name: 'Sheet', description: 'A modal side panel for navigation, filters and project details.',
    api: 'Sheet, SheetTrigger, SheetClose, SheetContent (side, size), SheetHeader, SheetFooter, SheetTitle, SheetDescription',
    states: 'Open, closed, scroll, focus return, RTL', basis: 'Reviewed Dialog primitive with logical edge positioning', client: true,
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
    api: 'Pagination, PaginationContent, PaginationItem, PaginationLink (isActive, disabled), PaginationPrevious, PaginationNext, PaginationEllipsis',
    states: 'Default, active, disabled, focus', basis: 'Native nav, list and anchor links', client: false,
    usage: expansionExamples.pagination, minimumCli: '0.7.2',
  },
} satisfies Record<keyof typeof expansionExamples, Omit<ComponentDoc, 'id'>>
