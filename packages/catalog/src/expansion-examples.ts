/** Standalone examples shared by the compiler and component reference pages. */
export const expansionExamples = {
  slider: `import { Slider, SliderTicks } from '@/components/ui/slider'
export function Example(){return <><Slider defaultValue={[12]} max={24} aria-label="Border radius" getValueText={value => value + ' pixels'} /><Slider defaultValue={[20, 80]} thumbLabels={['Minimum price', 'Maximum price']} /><SliderTicks values={[0, 25, 50, 75, 100]} /></>}`,
  'toggle-group': `import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
export function Example(){return <ToggleGroup type="single" defaultValue="week" aria-label="Calendar view"><ToggleGroupItem value="day">Day</ToggleGroupItem><ToggleGroupItem value="week">Week</ToggleGroupItem><ToggleGroupItem value="month">Month</ToggleGroupItem></ToggleGroup>}`,
  'tag-input': `import { TagInput, TagInputList, TagInputInput } from '@/components/ui/tag-input'
export function Example(){return <><label id="topics-label">Topics</label><TagInput defaultValue={['design-tokens', 'glass']} name="topics"><TagInputList /><TagInputInput aria-labelledby="topics-label" placeholder="Add a topic" /></TagInput></>}`,
  chip: `import { Chip, ChipGroup, ChipRemove } from '@/components/ui/chip'
export function Example(){return <><ChipGroup aria-label="Status filter"><Chip defaultPressed>On track</Chip><Chip defaultPressed={false}>Shipped</Chip></ChipGroup><Chip>glass<ChipRemove /></Chip></>}`,
  stepper: `import { Stepper, StepperItem, StepperIndicator, StepperTitle, StepperDescription, StepperSeparator } from '@/components/ui/stepper'
export function Example(){return <Stepper aria-label="Setup"><StepperItem status="complete"><StepperIndicator>1</StepperIndicator><StepperTitle>Preset</StepperTitle><StepperDescription>Ombelle</StepperDescription><StepperSeparator /></StepperItem><StepperItem status="current"><StepperIndicator>2</StepperIndicator><StepperTitle>Components</StepperTitle><StepperSeparator /></StepperItem><StepperItem status="upcoming"><StepperIndicator>3</StepperIndicator><StepperTitle>Install CLI</StepperTitle></StepperItem></Stepper>}`,
  meter: `import { Meter, MeterLabel } from '@/components/ui/meter'
export function Example(){return <Meter value={128} max={200} segments={10} warningAt={0.6}><MeterLabel>Deploys this month</MeterLabel></Meter>}`,
  field: `import { Field, FieldLabel, FieldControl, FieldDescription, FieldError } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
export function Example(){return <Field required><FieldLabel>Project name</FieldLabel><FieldControl><Input placeholder="acme-dashboard" /></FieldControl><FieldDescription>Shown in the CLI and the editor header.</FieldDescription><FieldError>Use lower case letters and dashes only.</FieldError></Field>}`,
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
