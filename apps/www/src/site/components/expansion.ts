import { expansionExamples } from '@ombelle/catalog'
import type { ComponentDoc } from './catalog'

export const expansionDocs = {
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
