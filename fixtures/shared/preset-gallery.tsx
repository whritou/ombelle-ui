'use client'
import * as React from 'react'
import { Button } from '@/components/ui/button'
import { InputGroup, InputGroupInput, InputGroupTextarea, InputGroupAddon, InputGroupText, InputGroupButton, InputGroupClear, InputGroupCount } from '@/components/ui/input-group'
import { Breadcrumb, BreadcrumbList, BreadcrumbItem, BreadcrumbLink, BreadcrumbPage, BreadcrumbSeparator } from '@/components/ui/breadcrumb'
import { Pagination, PaginationCompact, PaginationContent, PaginationItem, PaginationLink, PaginationPageSize, PaginationPrevious, PaginationNext, PaginationEllipsis } from '@/components/ui/pagination'
import { Sheet, SheetTrigger, SheetContent, SheetHeader, SheetTitle, SheetDescription, SheetFooter, SheetClose } from '@/components/ui/sheet'
import { AlertDialog, AlertDialogTrigger, AlertDialogContent, AlertDialogHeader, AlertDialogFooter, AlertDialogTitle, AlertDialogDescription, AlertDialogCancel, AlertDialogAction } from '@/components/ui/alert-dialog'
import { Badge, BadgeDot } from '@/components/ui/badge'
import { ToastProvider, ToastViewport, Toast, ToastTitle, ToastDescription, ToastAction, ToastClose } from '@/components/ui/toast'
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
  CardGroup,
  CardOption,
} from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { NativeSelect, NativeSelectOption } from '@/components/ui/native-select'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from '@/components/ui/select'
import {
  RadioGroup,
  RadioGroupItem,
  RadioGroupOption,
  RadioGroupOptionLabel,
  RadioGroupOptionDescription,
} from '@/components/ui/radio-group'
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuItem,
  DropdownMenuShortcut,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu'
import { Alert, AlertActions, AlertTitle, AlertDescription } from '@/components/ui/alert'
import {
  Popover,
  PopoverTrigger,
  PopoverContent,
  PopoverTitle,
  PopoverDescription,
} from '@/components/ui/popover'
import {
  Avatar,
  AvatarFallback,
  AvatarOverflow,
  AvatarStatus,
  AvatarGroup,
} from '@/components/ui/avatar'
import { Separator } from '@/components/ui/separator'
import {
  Table,
  TableCaption,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from '@/components/ui/table'
import {
  Accordion,
  AccordionItem,
  AccordionTrigger,
  AccordionContent,
} from '@/components/ui/accordion'
import { Progress } from '@/components/ui/progress'
import { Skeleton } from '@/components/ui/skeleton'
import { Switch, SwitchThumb } from '@/components/ui/switch'
import { Tabs, TabsCount, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import {
  TooltipProvider,
  Tooltip,
  TooltipTrigger,
  TooltipContent,
  TooltipArrow,
} from '@/components/ui/tooltip'
import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'

import { Spinner } from '@/components/ui/spinner'
import { Kbd, KbdGroup } from '@/components/ui/kbd'
import { Empty, EmptyHeader, EmptyMedia, EmptyTitle, EmptyDescription, EmptyContent } from '@/components/ui/empty'
import { Field, FieldLabel, FieldControl, FieldDescription, FieldError } from '@/components/ui/field'
import { Meter, MeterLabel, MeterValue, MeterSegment, MeterLegend, MeterLegendItem } from '@/components/ui/meter'
import { Slider, SliderTicks } from '@/components/ui/slider'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
import { Chip, ChipGroup, ChipRemove } from '@/components/ui/chip'
import { TagInput, TagInputInput, TagInputList } from '@/components/ui/tag-input'
import { InputOTP, InputOTPGroup, InputOTPSeparator, InputOTPSlot } from '@/components/ui/input-otp'
import { Combobox, ComboboxContent, ComboboxCreate, ComboboxEmpty, ComboboxInput, ComboboxItem, ComboboxList } from '@/components/ui/combobox'
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList, CommandSeparator, CommandShortcut } from '@/components/ui/command'
import { Calendar, DatePicker } from '@/components/ui/calendar'
import { HoverCard, HoverCardArrow, HoverCardContent, HoverCardTrigger } from '@/components/ui/hover-card'
import { ContextMenu, ContextMenuContent, ContextMenuItem, ContextMenuSeparator, ContextMenuShortcut, ContextMenuTrigger } from '@/components/ui/context-menu'
import { Stepper, StepperItem, StepperIndicator, StepperTitle, StepperDescription, StepperSeparator } from '@/components/ui/stepper'

// Family-independent: callers pass the component ids their family cannot
// style (from the shared support table) and the family's display name.
export type PresetGalleryProps = {
  unavailable?: readonly string[]
  familyLabel?: string
}

function ToastExample() {
  const [open, setOpen] = React.useState(false)
  return <><Button variant="outline" onClick={() => setOpen(true)}>Show notification</Button>
    <Toast open={open} onOpenChange={setOpen} variant="success">
      <ToastTitle>Changes saved</ToastTitle><ToastDescription>Your project is up to date.</ToastDescription>
      <ToastAction altText="Undo the last change">Undo</ToastAction><ToastClose />
    </Toast><ToastViewport /></>
}

function Unavailable({
  id,
  name,
  familyLabel,
}: {
  id: string
  name: string
  familyLabel: string
}) {
  return (
    <div
      className="preset-unavailable"
      data-component={id}
      data-unavailable=""
      aria-disabled="true"
    >
      <strong>{name}</strong>
      <span>Unavailable in {familyLabel}</span>
    </div>
  )
}

export function PresetGallery({
  unavailable = [],
  familyLabel = '',
}: PresetGalleryProps = {}) {
  const gate = (id: string, name: string, node: React.ReactNode) =>
    unavailable.includes(id) ? (
      <Unavailable id={id} name={name} familyLabel={familyLabel} />
    ) : (
      node
    )
  return (
    <main
      className="preset-gallery"
      data-testid="preset-gallery"
      aria-label="Preset component gallery"
    >
      <header>
        <h1>Your design system</h1>
        <p>A working collection of components in your project theme.</p>
      </header>
      {gate('input-group', 'Input Group', <section aria-label="Input Group" data-component="input-group">
        <h2>Input Group</h2>
        <div className="preset-stack">
          <label htmlFor="preset-website">Website</label>
          <InputGroup>
            <InputGroupAddon><InputGroupText>https://</InputGroupText></InputGroupAddon>
            <InputGroupInput id="preset-website" placeholder="example.com" />
            <InputGroupAddon align="inline-end"><InputGroupButton>Check</InputGroupButton></InputGroupAddon>
          </InputGroup>
          <label htmlFor="preset-group-invalid">Project slug</label>
          <InputGroup><InputGroupInput id="preset-group-invalid" defaultValue="already-taken" aria-invalid="true" aria-describedby="preset-group-error" /></InputGroup>
          <p id="preset-group-error">Choose another slug.</p>
          <label htmlFor="preset-group-disabled">Managed domain</label>
          <InputGroup><InputGroupInput id="preset-group-disabled" defaultValue="acme.app" disabled /></InputGroup>
          <label htmlFor="preset-group-notes">Notes</label>
          <InputGroup><InputGroupTextarea id="preset-group-notes" placeholder="Add a note" aria-describedby="preset-group-count" /><InputGroupAddon align="block-end"><InputGroupText>Optional</InputGroupText><InputGroupCount id="preset-group-count" value={0} max={160} /></InputGroupAddon></InputGroup>
          <label htmlFor="preset-group-search">Search</label>
          <InputGroup><InputGroupInput id="preset-group-search" placeholder="Search" defaultValue="glass toast" /><InputGroupAddon align="inline-end"><InputGroupClear label="Clear search" /></InputGroupAddon></InputGroup>
        </div>
      </section>)}
      {gate('breadcrumb', 'Breadcrumb', <section aria-label="Breadcrumb" data-component="breadcrumb">
        <h2>Breadcrumb</h2>
        <Breadcrumb aria-label="Gallery path"><BreadcrumbList>
          <BreadcrumbItem><BreadcrumbLink href="#home">Home</BreadcrumbLink></BreadcrumbItem><BreadcrumbSeparator />
          <BreadcrumbItem><BreadcrumbLink href="#projects">Projects</BreadcrumbLink></BreadcrumbItem><BreadcrumbSeparator />
          <BreadcrumbItem><BreadcrumbPage>Website refresh</BreadcrumbPage></BreadcrumbItem>
        </BreadcrumbList></Breadcrumb>
      </section>)}
      {gate('pagination', 'Pagination', <section aria-label="Pagination" data-component="pagination">
        <h2>Pagination</h2><Pagination><PaginationContent>
          <PaginationItem><PaginationPrevious disabled /></PaginationItem>
          <PaginationItem><PaginationLink href="#page-1" isActive aria-label="Page 1">1</PaginationLink></PaginationItem>
          <PaginationItem><PaginationLink href="#page-2" aria-label="Page 2">2</PaginationLink></PaginationItem>
          <PaginationItem><PaginationEllipsis /></PaginationItem>
          <PaginationItem><PaginationNext href="#page-2" /></PaginationItem>
        </PaginationContent></Pagination>
        <Pagination aria-label="Compact pages"><PaginationCompact page={2} pageCount={12} previousHref="#page-1" nextHref="#page-3" /></Pagination>
        <PaginationPageSize value={25} range="1–25 of 290" />
      </section>)}
      {gate('sheet', 'Sheet', <section aria-label="Sheet" data-component="sheet">
        <h2>Sheet</h2><Sheet><SheetTrigger asChild><Button variant="outline">Open details</Button></SheetTrigger><SheetContent>
          <SheetHeader><SheetTitle>Project details</SheetTitle><SheetDescription>Review the current project.</SheetDescription></SheetHeader>
          <p>Your project is ready to review.</p><SheetFooter><SheetClose asChild><Button>Done</Button></SheetClose></SheetFooter>
        </SheetContent></Sheet>
      </section>)}
      {gate('alert-dialog', 'Alert Dialog', <section aria-label="Alert Dialog" data-component="alert-dialog">
        <h2>Alert Dialog</h2><AlertDialog><AlertDialogTrigger asChild><Button variant="destructive">Delete project</Button></AlertDialogTrigger><AlertDialogContent>
          <AlertDialogHeader><AlertDialogTitle>Delete this project?</AlertDialogTitle><AlertDialogDescription>This preview does not delete any data.</AlertDialogDescription></AlertDialogHeader>
          <AlertDialogFooter><AlertDialogCancel>Cancel</AlertDialogCancel><AlertDialogAction>Delete project</AlertDialogAction></AlertDialogFooter>
        </AlertDialogContent></AlertDialog>
      </section>)}
      {gate('toast', 'Toast', <section aria-label="Toast" data-component="toast">
        <h2>Toast</h2><ToastProvider><ToastExample /></ToastProvider>
      </section>)}
      {gate('spinner', 'Spinner', <section aria-label="Spinner" data-component="spinner">
        <h2>Spinner</h2><p><Spinner size="sm" /> <Spinner /> <Spinner size="lg" aria-label="Saving" /></p>
      </section>)}
      {gate('kbd', 'Kbd', <section aria-label="Kbd" data-component="kbd">
        <h2>Kbd</h2><p>Search with <KbdGroup><Kbd>Ctrl</Kbd><Kbd>K</Kbd></KbdGroup></p>
      </section>)}
      {gate('empty', 'Empty State', <section aria-label="Empty State" data-component="empty">
        <h2>Empty State</h2>
        <Empty><EmptyHeader><EmptyMedia variant="icon" aria-hidden="true">+</EmptyMedia>
          <EmptyTitle asChild><h3>No presets yet</h3></EmptyTitle>
          <EmptyDescription>Start from a built-in family or import a preset file.</EmptyDescription></EmptyHeader>
          <EmptyContent><Button variant="outline">Import file</Button><Button>New preset</Button></EmptyContent></Empty>
      </section>)}
      {gate('field', 'Field', <section aria-label="Field" data-component="field">
        <h2>Field</h2>
        <Field required><FieldLabel>Project name</FieldLabel><FieldControl><Input placeholder="acme-dashboard" /></FieldControl>
          <FieldDescription>Shown in the CLI and the editor header.</FieldDescription><FieldError>Use lower case letters and dashes only.</FieldError></Field>
        <Field invalid><FieldLabel>Package scope</FieldLabel><FieldControl><Input defaultValue="Acme UI" /></FieldControl>
          <FieldError>Use lower case letters and dashes only.</FieldError></Field>
      </section>)}
      {gate('meter', 'Meter', <section aria-label="Meter" data-component="meter">
        <h2>Meter</h2>
        <Meter value={128} max={200} segments={10} warningAt={0.6}><MeterLabel>Deploys this month</MeterLabel><MeterValue /></Meter>
        <Meter max={10}><MeterLabel>Storage</MeterLabel><MeterValue>7 / 10 GB</MeterValue><MeterSegment value={4} tone="primary" /><MeterSegment value={2} tone="info" /><MeterSegment value={1} tone="success" />
          <MeterLegend><MeterLegendItem tone="primary">Builds</MeterLegendItem><MeterLegendItem tone="info">Assets</MeterLegendItem><MeterLegendItem tone="success">Logs</MeterLegendItem></MeterLegend></Meter>
      </section>)}
      {gate('stepper', 'Stepper', <section aria-label="Stepper" data-component="stepper">
        <h2>Stepper</h2>
        <Stepper aria-label="Setup">
          <StepperItem status="complete"><StepperIndicator>1</StepperIndicator><StepperTitle>Preset</StepperTitle><StepperDescription>Ombelle</StepperDescription><StepperSeparator /></StepperItem>
          <StepperItem status="current"><StepperIndicator>2</StepperIndicator><StepperTitle>Components</StepperTitle><StepperDescription>Choose 4</StepperDescription><StepperSeparator /></StepperItem>
          <StepperItem status="upcoming"><StepperIndicator>3</StepperIndicator><StepperTitle>Install CLI</StepperTitle></StepperItem>
        </Stepper>
      </section>)}
      {gate('slider', 'Slider', <section aria-label="Slider" data-component="slider">
        <h2>Slider</h2>
        <Slider defaultValue={[12]} max={24} aria-label="Border radius" getValueText={value => `${value} pixels`} />
        <Slider defaultValue={[20, 80]} thumbLabels={['Minimum price', 'Maximum price']} />
        <SliderTicks values={[0, 25, 50, 75, 100]} />
      </section>)}
      {gate('toggle-group', 'Toggle Group', <section aria-label="Toggle Group" data-component="toggle-group">
        <h2>Toggle Group</h2>
        <ToggleGroup type="single" defaultValue="week" aria-label="Calendar view"><ToggleGroupItem value="day">Day</ToggleGroupItem><ToggleGroupItem value="week">Week</ToggleGroupItem><ToggleGroupItem value="month">Month</ToggleGroupItem></ToggleGroup>
        <ToggleGroup type="multiple" variant="toolbar" defaultValue={['bold']} aria-label="Text formatting"><ToggleGroupItem value="bold" aria-label="Bold"><b aria-hidden="true">B</b></ToggleGroupItem><ToggleGroupItem value="italic" aria-label="Italic"><i aria-hidden="true">I</i></ToggleGroupItem><ToggleGroupItem value="underline" aria-label="Underline"><u aria-hidden="true">U</u></ToggleGroupItem></ToggleGroup>
      </section>)}
      {gate('chip', 'Chip', <section aria-label="Chip" data-component="chip">
        <h2>Chip</h2>
        <ChipGroup aria-label="Status filter"><Chip defaultPressed>On track</Chip><Chip defaultPressed={false}>Needs attention</Chip><Chip defaultPressed={false}>Shipped</Chip></ChipGroup>
        <p><Chip>glass<ChipRemove /></Chip></p>
      </section>)}
      {gate('tag-input', 'Tag Input', <section aria-label="Tag Input" data-component="tag-input">
        <h2>Tag Input</h2>
        <label id="gallery-topics">Topics</label>
        <TagInput defaultValue={['design-tokens', 'glass']}><TagInputList /><TagInputInput aria-labelledby="gallery-topics" placeholder="Add a topic" /></TagInput>
      </section>)}
      {gate('input-otp', 'Input OTP', <section aria-label="Input OTP" data-component="input-otp">
        <h2>Input OTP</h2>
        <InputOTP maxLength={6} aria-label="Verification code"><InputOTPGroup><InputOTPSlot index={0} /><InputOTPSlot index={1} /><InputOTPSlot index={2} /></InputOTPGroup><InputOTPSeparator /><InputOTPGroup><InputOTPSlot index={3} /><InputOTPSlot index={4} /><InputOTPSlot index={5} /></InputOTPGroup></InputOTP>
      </section>)}
      <div data-testid="overlays-search">
      {gate('combobox', 'Combobox', <section aria-label="Combobox" data-component="combobox">
        <h2>Combobox</h2>
        <label id="gallery-preset">Preset</label>
        <Combobox defaultValue="ombelle">
          <ComboboxInput aria-labelledby="gallery-preset" placeholder="Search presets" />
          <ComboboxContent>
            <ComboboxList>
              <ComboboxItem value="liquid-glass">Liquid glass</ComboboxItem>
              <ComboboxItem value="liquid-glass-givre">Liquid glass — Givre</ComboboxItem>
              <ComboboxItem value="ombelle">Ombelle</ComboboxItem>
              <ComboboxCreate />
            </ComboboxList>
            <ComboboxEmpty>No presets found.</ComboboxEmpty>
          </ComboboxContent>
        </Combobox>
      </section>)}
      {gate('command', 'Command', <section aria-label="Command" data-component="command">
        <h2>Command</h2>
        <Command label="Commands">
          <CommandInput placeholder="Search commands" />
          <CommandList>
            <CommandGroup heading="Components">
              <CommandItem>Add Button<CommandShortcut>↵</CommandShortcut></CommandItem>
              <CommandItem>Add Dialog</CommandItem>
            </CommandGroup>
            <CommandSeparator />
            <CommandGroup heading="Theme">
              <CommandItem>Add theme from preset<CommandShortcut>Ctrl+T</CommandShortcut></CommandItem>
            </CommandGroup>
          </CommandList>
          <CommandEmpty>No results.</CommandEmpty>
        </Command>
      </section>)}
      {gate('calendar', 'Calendar', <section aria-label="Calendar" data-component="calendar">
        <h2>Calendar</h2>
        <Calendar mode="range" today="2026-11-10" defaultMonth="2026-11-01" aria-label="Stay" selected={{ from: '2026-11-12', to: '2026-11-18' }} />
        <p id="gallery-due">Due date</p>
        <DatePicker aria-labelledby="gallery-due" defaultValue="2026-11-12" calendar={{ today: '2026-11-10' }} />
      </section>)}
      {gate('hover-card', 'Hover Card', <section aria-label="Hover Card" data-component="hover-card">
        <h2>Hover Card</h2>
        <p>Built with <HoverCard><HoverCardTrigger href="#ombelle">@ombelle</HoverCardTrigger><HoverCardContent><strong>Ombelle UI</strong><p>Reviewed React components with deterministic presets.</p><HoverCardArrow /></HoverCardContent></HoverCard> presets.</p>
      </section>)}
      {gate('context-menu', 'Context Menu', <section aria-label="Context Menu" data-component="context-menu">
        <h2>Context Menu</h2>
        <ContextMenu>
          <ContextMenuTrigger variant="zone" tabIndex={0} aria-label="Layer: Hero card">Right-click or Shift+F10 on a layer</ContextMenuTrigger>
          <ContextMenuContent>
            <ContextMenuItem>Duplicate<ContextMenuShortcut>Ctrl+D</ContextMenuShortcut></ContextMenuItem>
            <ContextMenuItem>Copy as JSX</ContextMenuItem>
            <ContextMenuSeparator />
            <ContextMenuItem variant="destructive">Delete<ContextMenuShortcut>Del</ContextMenuShortcut></ContextMenuItem>
          </ContextMenuContent>
        </ContextMenu>
      </section>)}
      </div>
      <section aria-label="Actions" data-component="button">
        <h2>Actions</h2>
        <div className="preset-row">
          <Button data-testid="preset-button">Save changes</Button>
          <Button variant="secondary">Secondary action</Button>
          <Button disabled>Disabled</Button>
          <Button disabled aria-busy="true">
            Saving…
          </Button>
          <Button variant="link-destructive">Remove member</Button>
        </div>
      </section>
      <section aria-label="Status" data-component="badge">
        <h2>Status</h2>
        <div className="preset-row">
          <Badge>Up to date</Badge>
          <Badge variant="destructive">Needs attention</Badge>
        </div>
        <div className="preset-row preset-variant">
          <Badge size="sm"><BadgeDot />Active</Badge>
          <Badge><BadgeDot />Default</Badge>
        </div>
        <div className="preset-row preset-variant">
          <Badge appearance="soft" variant="success"><BadgeDot />Live</Badge>
          <Badge appearance="soft" variant="warning">Degraded</Badge>
          <Badge appearance="soft" variant="info">Info</Badge>
          <Badge appearance="outline" variant="destructive">Deprecated</Badge>
        </div>
      </section>
      {gate(
        'alert',
        'Alert',
        <section aria-label="Messages" data-component="alert">
          <h2>Messages</h2>
          <div className="preset-stack">
            <Alert>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <circle cx="12" cy="12" r="10" />
                <path d="M12 16v-4M12 8h.01" />
              </svg>
              <AlertTitle>Preset saved</AlertTitle>
              <AlertDescription>
                New components in this project now use your preset.
              </AlertDescription>
            </Alert>
            <Alert variant="destructive">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="m21.7 18-8-14a2 2 0 0 0-3.5 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.7-3Z" />
                <path d="M12 9v4M12 17h.01" />
              </svg>
              <AlertTitle>Install blocked</AlertTitle>
              <AlertDescription>
                button.tsx was edited locally. Review the change before replacing
                it.
              </AlertDescription>
            </Alert>
            <Alert variant="success"><AlertTitle>Saved</AlertTitle><AlertDescription>Your changes are ready.</AlertDescription></Alert>
            <Alert variant="warning"><AlertTitle>Review needed</AlertTitle><AlertDescription>Two items need your attention.</AlertDescription></Alert>
            <Alert variant="info"><AlertTitle>New version</AlertTitle><AlertDescription>A component update is available.</AlertDescription>
              <AlertActions><Button size="sm">Update</Button><Button size="sm" variant="outline">Release notes</Button></AlertActions></Alert>
            <Alert variant="warning" layout="compact"><AlertDescription>One seat left on the Team plan.</AlertDescription><a href="#upgrade">Upgrade</a></Alert>
          </div>
        </section>,
      )}
      {gate(
        'avatar',
        'Avatar',
        <section aria-label="People" data-component="avatar">
          <h2>People</h2>
          <div className="preset-row">
            <Avatar size="lg" variant="primary" role="img" aria-label="Ada Lovelace, online">
              <AvatarFallback>AL</AvatarFallback>
              <AvatarStatus />
            </Avatar>
            <Avatar role="img" aria-label="Grace Hopper">
              <AvatarFallback>GH</AvatarFallback>
            </Avatar>
            <Avatar size="sm" variant="secondary" role="img" aria-label="Margaret Knight">
              <AvatarFallback>MK</AvatarFallback>
            </Avatar>
          </div>
          <div className="preset-row">
            <AvatarGroup aria-label="Reviewers">
              <Avatar variant="primary" role="img" aria-label="Ada Lovelace">
                <AvatarFallback>AL</AvatarFallback>
              </Avatar>
              <Avatar role="img" aria-label="Grace Hopper">
                <AvatarFallback>GH</AvatarFallback>
              </Avatar>
              <Avatar variant="secondary" role="img" aria-label="Margaret Knight">
                <AvatarFallback>MK</AvatarFallback>
              </Avatar>
              <AvatarOverflow count={3} label="3 more reviewers" />
            </AvatarGroup>
            <Avatar shape="square" role="img" aria-label="Acme workspace">
              <AvatarFallback>AC</AvatarFallback>
            </Avatar>
            <span>6 people review this preset</span>
          </div>
        </section>,
      )}
      <section aria-label="Project card" data-component="card">
        <h2>Project card</h2>
        <Card>
          <CardHeader>
            <CardTitle level={3}>Website refresh</CardTitle>
            <CardDescription>
              A shared workspace for your next release.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p>All components use your project preset.</p>
          </CardContent>
          <CardFooter>Updated today</CardFooter>
        </Card>
        <div className="preset-variants">
          <Card appearance="outlined"><CardHeader><CardTitle level={3}>Outlined card</CardTitle></CardHeader><CardContent>Project summary.</CardContent></Card>
          <Card appearance="subtle" density="dense"><CardHeader><CardTitle level={3}>Subtle card</CardTitle></CardHeader><CardContent>Recent activity.</CardContent></Card>
        </div>
        <p id="gallery-plan">Plan</p>
        <CardGroup name="gallery-plan" aria-labelledby="gallery-plan" defaultValue="team">
          <CardOption value="starter" title="Starter" description="One project." />
          <CardOption value="team" title="Team" description="Ten seats." />
        </CardGroup>
      </section>
      <form
        className="preset-form"
        onSubmit={(event) => event.preventDefault()}
        aria-label="Project settings"
      >
        <h2>Project settings</h2>
        {gate(
          'label',
          'Label',
          <div data-component="label">
            <Label htmlFor="preset-project-name">Project name</Label>
          </div>,
        )}
        {gate(
          'input',
          'Input',
          <div data-component="input">
            <Input id="preset-project-name" defaultValue="Ombelle workspace" />
            <Input size="sm" aria-label="Small input" placeholder="Small" />
            <Input size="lg" aria-label="Large input" placeholder="Large" />
            <Label htmlFor="preset-email">Email</Label>
            <Input
              id="preset-email"
              type="email"
              defaultValue="invalid"
              aria-invalid="true"
              aria-describedby="preset-email-error"
            />
            <p id="preset-email-error">Enter a valid email address.</p>
          </div>,
        )}
        {gate(
          'textarea',
          'Textarea',
          <div data-component="textarea">
            <Label htmlFor="preset-description">Description</Label>
            <Textarea
              id="preset-description"
              defaultValue="A small idea, ready to grow."
            />
          </div>,
        )}
        {gate(
          'native-select',
          'Native Select',
          <div data-component="native-select">
            <Label htmlFor="preset-region">Region</Label>
            <NativeSelect id="preset-region" defaultValue="eu">
              <NativeSelectOption value="eu">Europe</NativeSelectOption>
              <NativeSelectOption value="us">United States</NativeSelectOption>
            </NativeSelect>
          </div>,
        )}
        {gate(
          'checkbox',
          'Checkbox',
          <div className="preset-row" data-component="checkbox">
            <Checkbox id="preset-terms" defaultChecked />
            <Label htmlFor="preset-terms">Accept project guidelines</Label>
          </div>,
        )}
        {gate(
          'switch',
          'Switch',
          <div className="preset-row" data-component="switch">
            <Switch id="preset-notifications" defaultChecked>
              <SwitchThumb />
            </Switch>
            <Label htmlFor="preset-notifications">Enable notifications</Label>
          </div>,
        )}
        {gate(
          'select',
          'Select',
          <div data-component="select">
            <Label id="preset-role-label">Role</Label>
            <Select defaultValue="designer">
              <SelectTrigger aria-labelledby="preset-role-label">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="designer">Designer</SelectItem>
                <SelectItem value="engineer">Engineer</SelectItem>
                <SelectItem value="product">Product manager</SelectItem>
                <SelectItem value="researcher" disabled hint="Seat limit">
                  Researcher
                </SelectItem>
              </SelectContent>
            </Select>
          </div>,
        )}
        {gate(
          'radio-group',
          'Radio Group',
          <div data-component="radio-group">
            <Label id="preset-plan-label">Plan</Label>
            <RadioGroup defaultValue="team" aria-labelledby="preset-plan-label">
              <RadioGroupOption>
                <RadioGroupItem value="starter" />
                <span>
                  <RadioGroupOptionLabel>Starter</RadioGroupOptionLabel>
                  <RadioGroupOptionDescription>
                    One project, community support
                  </RadioGroupOptionDescription>
                </span>
              </RadioGroupOption>
              <RadioGroupOption>
                <RadioGroupItem value="team" />
                <span>
                  <RadioGroupOptionLabel>Team</RadioGroupOptionLabel>
                  <RadioGroupOptionDescription>
                    Unlimited projects and shared presets
                  </RadioGroupOptionDescription>
                </span>
              </RadioGroupOption>
              <RadioGroupOption aria-disabled="true">
                <RadioGroupItem value="enterprise" disabled />
                <span>
                  <RadioGroupOptionLabel>Enterprise</RadioGroupOptionLabel>
                  <RadioGroupOptionDescription>
                    Contact sales to enable
                  </RadioGroupOptionDescription>
                </span>
              </RadioGroupOption>
            </RadioGroup>
          </div>,
        )}
      </form>
      <section aria-label="Project sections" data-component="tabs">
        <h2>Project sections</h2>
        <Tabs defaultValue="overview">
          <TabsList aria-label="Project sections">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="activity">Activity<TabsCount>3</TabsCount></TabsTrigger>
            <TabsTrigger value="settings" disabled>
              Settings
            </TabsTrigger>
          </TabsList>
          <TabsContent value="overview">
            Your project is ready to preview.
          </TabsContent>
          <TabsContent value="activity">
            Your latest changes are saved.
          </TabsContent>
        </Tabs>
        <Tabs defaultValue="overview" className="preset-variant">
          <TabsList appearance="underline" aria-label="Underline sections"><TabsTrigger value="overview">Overview</TabsTrigger><TabsTrigger value="activity">Activity</TabsTrigger></TabsList>
          <TabsContent value="overview">Project overview.</TabsContent>
          <TabsContent value="activity">Recent activity.</TabsContent>
        </Tabs>
      </section>
      <section aria-label="Help" data-component="tooltip">
        <h2>Help</h2>
        <TooltipProvider delayDuration={300}>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="outline">Preview help</Button>
            </TooltipTrigger>
            <TooltipContent>
              Inspect your components in both color modes.
              <TooltipArrow />
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </section>
      {gate(
        'dropdown-menu',
        'Dropdown Menu',
        <section aria-label="Project actions" data-component="dropdown-menu">
          <h2>Project actions</h2>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline">Project actions</Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              <DropdownMenuLabel>Project</DropdownMenuLabel>
              <DropdownMenuItem>
                Rename<DropdownMenuShortcut>F2</DropdownMenuShortcut>
              </DropdownMenuItem>
              <DropdownMenuItem>
                Duplicate<DropdownMenuShortcut>Ctrl D</DropdownMenuShortcut>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem variant="destructive">Archive</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </section>,
      )}
      {gate(
        'popover',
        'Popover',
        <section aria-label="Sharing" data-component="popover">
          <h2>Sharing</h2>
          <Popover>
            <PopoverTrigger asChild>
              <Button>Share preset</Button>
            </PopoverTrigger>
            <PopoverContent align="start" aria-labelledby="preset-share-title">
              <PopoverTitle id="preset-share-title">Share preset</PopoverTitle>
              <PopoverDescription>
                Anyone with the link can install this preset.
              </PopoverDescription>
              {gate(
                'input',
                'Input',
                <Input aria-label="Preset link" defaultValue="ombelle.dev/p/7f3a2c" readOnly />,
              )}
            </PopoverContent>
          </Popover>
        </section>,
      )}
      {gate(
        'separator',
        'Separator',
        <section aria-label="Sign-in options" data-component="separator">
          <h2>Sign-in options</h2>
          <div className="preset-stack">
            <Button variant="outline">Continue with SSO</Button>
            <Separator>or</Separator>
            <Button>Continue with email</Button>
            <Separator />
            <nav aria-label="Gallery links" className="preset-row preset-inline-nav">
              <a href="#docs">Docs</a>
              <Separator orientation="vertical" />
              <a href="#components">Components</a>
              <Separator orientation="vertical" />
              <a href="#changelog">Changelog</a>
            </nav>
          </div>
        </section>,
      )}
      {gate(
        'table',
        'Table',
        <section aria-label="Projects table" data-component="table">
          <h2>Projects table</h2>
          <Table>
            <TableCaption>4 of 12 projects · 1 selected</TableCaption>
            <TableHeader>
              <TableRow>
                <TableHead>Project</TableHead>
                <TableHead>Owner</TableHead>
                <TableHead>Status</TableHead>
                <TableHead numeric>Components</TableHead>
                <TableHead numeric>Updated</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {[
                ['Website refresh', 'Ada L.', 'AL', 'primary', 'On track', '12', '2 h ago', false],
                ['Mobile onboarding', 'Grace H.', 'GH', 'default', 'Needs attention', '8', 'Yesterday', false],
                ['Billing migration', 'Margaret K.', 'MK', 'secondary', 'On track', '5', 'Oct 28', true],
                ['Design system docs', 'Ada L.', 'AL', 'primary', 'Draft', '21', 'Oct 21', false],
              ].map(([project, owner, initials, tone, status, count, updated, selected]) => (
                <TableRow key={project as string} selected={selected as boolean}>
                  <TableCell>{project}</TableCell>
                  <TableCell>
                    <span className="preset-row preset-tight">
                      {gate(
                        'avatar',
                        'Avatar',
                        <Avatar size="sm" variant={tone as 'default' | 'primary' | 'secondary'} aria-hidden="true">
                          <AvatarFallback>{initials}</AvatarFallback>
                        </Avatar>,
                      )}
                      {owner}
                    </span>
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant={
                        status === 'Needs attention'
                          ? 'destructive'
                          : status === 'Draft'
                            ? 'outline'
                            : 'secondary'
                      }
                    >
                      {status}
                    </Badge>
                  </TableCell>
                  <TableCell numeric>{count}</TableCell>
                  <TableCell numeric>{updated}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          <div className="preset-variant"><Table density="compact" striped><TableCaption>Compact project list</TableCaption><TableHeader><TableRow><TableHead>Project</TableHead><TableHead>Status</TableHead></TableRow></TableHeader><TableBody><TableRow><TableCell>Website</TableCell><TableCell>Active</TableCell></TableRow><TableRow><TableCell>Mobile</TableCell><TableCell>Review</TableCell></TableRow><TableRow selected><TableCell>Billing</TableCell><TableCell>Selected</TableCell></TableRow></TableBody></Table></div>
        </section>,
      )}
      {gate(
        'accordion',
        'Accordion',
        <section aria-label="Questions" data-component="accordion">
          <h2>Questions</h2>
          <Accordion type="single" collapsible defaultValue="preset">
            <AccordionItem value="preset">
              <AccordionTrigger>What does a preset change?</AccordionTrigger>
              <AccordionContent>
                Colors, radius, borders, shadows and type. Installed source
                stays yours to edit.
              </AccordionContent>
            </AccordionItem>
            <AccordionItem value="edit">
              <AccordionTrigger>Can I edit installed components?</AccordionTrigger>
              <AccordionContent>
                Yes. The CLI only replaces a file you have not changed.
              </AccordionContent>
            </AccordionItem>
            <AccordionItem value="families">
              <AccordionTrigger>Which families are stable?</AccordionTrigger>
              <AccordionContent>
                Flat, minimalist, neo brutalism and ombelle. Liquid glass is
                experimental.
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </section>,
      )}
      {gate(
        'progress',
        'Progress',
        <section aria-label="Progress" data-component="progress">
          <h2>Progress</h2>
          <div className="preset-stack">
            <div className="preset-progress-label">
              <span id="preset-progress-install">Installing components</span>
              <span>64%</span>
            </div>
            <Progress value={64} aria-labelledby="preset-progress-install" />
            <div className="preset-progress-label">
              <span id="preset-progress-contrast">Contrast checks</span>
              <span>8 / 8</span>
            </div>
            <Progress value={8} max={8} aria-labelledby="preset-progress-contrast" />
            <div className="preset-progress-label">
              <span id="preset-progress-sync">Syncing presets</span>
            </div>
            <Progress aria-labelledby="preset-progress-sync" />
          </div>
        </section>,
      )}
      {gate(
        'skeleton',
        'Skeleton',
        <section aria-label="Loading" data-component="skeleton">
          <h2>Loading</h2>
          <div className="preset-stack" role="group" aria-busy="true" aria-label="Loading project">
            <div className="preset-row preset-skeleton-card">
              <Skeleton shape="circle" />
              <div className="preset-stack preset-grow">
                <Skeleton style={{ inlineSize: '60%' }} />
                <Skeleton style={{ inlineSize: '85%' }} />
              </div>
            </div>
            <Skeleton shape="block" />
            <Skeleton style={{ inlineSize: '70%' }} />
          </div>
        </section>,
      )}
      <section aria-label="Dialog" data-component="dialog">
        <h2>Dialog</h2>
        <Dialog>
          <DialogTrigger asChild>
            <Button variant="outline">Open dialog</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Ready to publish?</DialogTitle>
              <DialogDescription>
                This is a preview. Your preset stays on this device until you
                download it.
              </DialogDescription>
            </DialogHeader>
            <p className="preset-dialog-copy">
              Review your choices and close this dialog to continue editing.
            </p>
          </DialogContent>
        </Dialog>
      </section>
    </main>
  )
}
