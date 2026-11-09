/** Standalone examples shared by the compiler and component reference pages. */
export const expansionExamples = {
  empty: `import { Empty, EmptyHeader, EmptyMedia, EmptyTitle, EmptyDescription, EmptyContent } from '@/components/ui/empty'
import { Button } from '@/components/ui/button'
export function Example(){return <Empty><EmptyHeader><EmptyMedia variant="icon">+</EmptyMedia><EmptyTitle asChild><h2>No presets yet</h2></EmptyTitle><EmptyDescription>Start from a built-in family or import a preset file.</EmptyDescription></EmptyHeader><EmptyContent><Button>New preset</Button></EmptyContent></Empty>}`,
  spinner: `import { Spinner } from '@/components/ui/spinner'
export function Example(){return <p><Spinner size="sm" /> Saving…</p>}`,
  kbd: `import { Kbd, KbdGroup } from '@/components/ui/kbd'
export function Example(){return <p>Search with <KbdGroup><Kbd>Ctrl</Kbd><Kbd>K</Kbd></KbdGroup></p>}`,
  toast: `import { ToastProvider, ToastViewport, Toast, ToastTitle, ToastDescription, ToastClose } from '@/components/ui/toast'
export function Example(){return <ToastProvider><Toast defaultOpen><ToastTitle>Changes saved</ToastTitle><ToastDescription>Your project is up to date.</ToastDescription><ToastClose>Dismiss</ToastClose></Toast><ToastViewport /></ToastProvider>}`,
  'input-group': `import { InputGroup, InputGroupInput, InputGroupAddon, InputGroupText, InputGroupButton } from '@/components/ui/input-group'
export function Example(){return <><label htmlFor="website">Website</label><InputGroup><InputGroupAddon><InputGroupText>https://</InputGroupText></InputGroupAddon><InputGroupInput id="website" placeholder="example.com" /><InputGroupAddon align="inline-end"><InputGroupButton>Check</InputGroupButton></InputGroupAddon></InputGroup></>}`,
  sheet: `import { Sheet, SheetTrigger, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet'
export function Example(){return <Sheet><SheetTrigger>Open details</SheetTrigger><SheetContent side="inline-end"><SheetHeader><SheetTitle>Project details</SheetTitle><SheetDescription>Review the current project.</SheetDescription></SheetHeader><p>Your project is ready to review.</p></SheetContent></Sheet>}`,
  'alert-dialog': `import { AlertDialog, AlertDialogTrigger, AlertDialogContent, AlertDialogHeader, AlertDialogFooter, AlertDialogTitle, AlertDialogDescription, AlertDialogCancel, AlertDialogAction } from '@/components/ui/alert-dialog'
export function Example(){return <AlertDialog><AlertDialogTrigger>Delete project</AlertDialogTrigger><AlertDialogContent><AlertDialogHeader><AlertDialogTitle>Delete this project?</AlertDialogTitle><AlertDialogDescription>This action cannot be undone.</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel>Cancel</AlertDialogCancel><AlertDialogAction>Delete project</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog>}`,
  breadcrumb: `import { Breadcrumb, BreadcrumbList, BreadcrumbItem, BreadcrumbLink, BreadcrumbPage, BreadcrumbSeparator } from '@/components/ui/breadcrumb'
export function Example(){return <Breadcrumb><BreadcrumbList><BreadcrumbItem><BreadcrumbLink href="/">Home</BreadcrumbLink></BreadcrumbItem><BreadcrumbSeparator /><BreadcrumbItem><BreadcrumbPage>Projects</BreadcrumbPage></BreadcrumbItem></BreadcrumbList></Breadcrumb>}`,
  pagination: `import { Pagination, PaginationContent, PaginationItem, PaginationLink, PaginationPrevious, PaginationNext, PaginationEllipsis } from '@/components/ui/pagination'
export function Example(){return <Pagination><PaginationContent><PaginationItem><PaginationPrevious disabled /></PaginationItem><PaginationItem><PaginationLink href="?page=1" isActive aria-label="Page 1">1</PaginationLink></PaginationItem><PaginationItem><PaginationLink href="?page=2" aria-label="Page 2">2</PaginationLink></PaginationItem><PaginationItem><PaginationEllipsis /></PaginationItem><PaginationItem><PaginationNext href="?page=2" /></PaginationItem></PaginationContent></Pagination>}`,
} as const

export const baseToastExample = `'use client'
import { ToastProvider, ToastViewport, Toast, ToastTitle, ToastDescription, ToastClose, useToastManager } from '@/components/ui/toast'
function Notifications(){const manager = useToastManager();return <><button type="button" onClick={() => manager.add({ title: 'Changes saved', description: 'Your project is up to date.' })}>Save changes</button><ToastViewport>{manager.toasts.map(item => <Toast key={item.id} toast={item}><ToastTitle>{item.title}</ToastTitle><ToastDescription>{item.description}</ToastDescription><ToastClose>Dismiss</ToastClose></Toast>)}</ToastViewport></>}
export function Example(){return <ToastProvider><Notifications /></ToastProvider>}`
