import * as React from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectSeparator, SelectTrigger, SelectValue } from '@/components/ui/select'
import { DropdownMenu, DropdownMenuCheckboxItem, DropdownMenuContent, DropdownMenuGroup, DropdownMenuItem, DropdownMenuLabel, DropdownMenuRadioGroup, DropdownMenuRadioItem, DropdownMenuSeparator, DropdownMenuShortcut, DropdownMenuSub, DropdownMenuSubContent, DropdownMenuSubTrigger, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Popover, PopoverContent, PopoverDescription, PopoverTitle, PopoverTrigger } from '@/components/ui/popover'
import { Tooltip, TooltipArrow, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion'
import { Tabs, TabsContent, TabsCount, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { RadioGroup, RadioGroupItem, RadioGroupOption, RadioGroupOptionDescription, RadioGroupOptionLabel } from '@/components/ui/radio-group'
import { Checkbox } from '@/components/ui/checkbox'
import { Switch } from '@/components/ui/switch'
import { Avatar, AvatarFallback, AvatarGroup, AvatarImage, AvatarOverflow, AvatarStatus } from '@/components/ui/avatar'
import { Progress } from '@/components/ui/progress'
import { Separator } from '@/components/ui/separator'
import { InputGroup, InputGroupAddon, InputGroupButton, InputGroupClear, InputGroupCount, InputGroupInput, InputGroupText, InputGroupTextarea } from '@/components/ui/input-group'
import { Breadcrumb, BreadcrumbEllipsis, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from '@/components/ui/breadcrumb'
import { Pagination, PaginationCompact, PaginationContent, PaginationEllipsis, PaginationItem, PaginationLink, PaginationNext, PaginationPageSize, PaginationPrevious } from '@/components/ui/pagination'
import { Sheet, SheetClose, SheetContent, SheetDescription, SheetFooter, SheetHandle, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet'
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog'
import { Card, CardContent, CardDescription, CardGroup, CardHeader, CardLink, CardMedia, CardOption, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCaption, TableCell, TableHead, TableHeader, TableRow, TableSkeletonRows } from '@/components/ui/table'
import { Badge, BadgeDot } from '@/components/ui/badge'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Field, FieldControl, FieldDescription, FieldError, FieldLabel } from '@/components/ui/field'
import { Slider } from '@/components/ui/slider'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
import { Toggle } from '@/components/ui/toggle'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area'
import { ButtonGroup, ButtonGroupSeparator } from '@/components/ui/button-group'
import { Item, ItemActions, ItemContent, ItemDescription, ItemGroup, ItemMedia, ItemTitle } from '@/components/ui/item'
import { NumberInput } from '@/components/ui/number-input'
import { ColorPicker, ColorPickerPair } from '@/components/ui/color-picker'
import { TagInput, TagInputInput, TagInputList } from '@/components/ui/tag-input'
import { InputOTP, InputOTPGroup, InputOTPSeparator, InputOTPSlot } from '@/components/ui/input-otp'
import { Combobox, ComboboxContent, ComboboxCreate, ComboboxEmpty, ComboboxInput, ComboboxItem, ComboboxList } from '@/components/ui/combobox'
import { Command, CommandDialog, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList, CommandSeparator, CommandShortcut } from '@/components/ui/command'
import { Calendar, DatePicker, toIsoDate } from '@/components/ui/calendar'
import { HoverCard, HoverCardArrow, HoverCardContent, HoverCardTrigger } from '@/components/ui/hover-card'
import { ContextMenu, ContextMenuContent, ContextMenuItem, ContextMenuSeparator, ContextMenuShortcut, ContextMenuSub, ContextMenuSubContent, ContextMenuSubTrigger, ContextMenuTrigger } from '@/components/ui/context-menu'
import { Toast, ToastAction, ToastClose, ToastDescription, ToastPromise, ToastProvider, ToastTitle, ToastViewport } from '@/components/ui/toast'

// Ported components rendered identically in both editions; the parity test
// compares computed styles of every [data-slot] element per section.
// Keep this file and its other-edition twin in sync, except for APIs that
// differ by edition (asChild in Radix, render in Base UI).
function Parity({ id, children }: { id: string; children: React.ReactNode }) {
  return (
    <section data-parity={id} className="specimen">
      <button type="button" data-parity-start={id}>
        Start {id}
      </button>
      {children}
    </section>
  )
}

const overlayPresets = [
  ['liquid-glass', 'Liquid glass'],
  ['liquid-glass-givre', 'Liquid glass — Givre'],
  ['liquid-glass-prism', 'Liquid glass — Prism'],
  ['ombelle', 'Ombelle'],
] as const

// Browser coverage for Calendar and Date Picker; the same in both editions. Today is fixed.
function CalendarScenario() {
  const [single, setSingle] = React.useState<Date>()
  const [range, setRange] = React.useState<{ from?: Date; to?: Date }>()
  const [due, setDue] = React.useState<Date | undefined>(new Date(2026, 10, 12, 12))
  const [scheduling, setScheduling] = React.useState(false)
  const shown = { today: '2026-11-10', defaultMonth: '2026-11-01' }
  return (
    <section aria-label="Calendar" data-testid="calendar">
      <button type="button" data-testid="calendar-before">Before the calendar</button>
      <div data-testid="calendar-single">
        <Calendar mode="single" {...shown} disablePast aria-label="Delivery day" selected={single} onSelect={setSingle} />
      </div>
      <p data-testid="calendar-single-value">Chosen: {single ? toIsoDate(single) : ''}</p>
      <div data-testid="calendar-range">
        <Calendar mode="range" {...shown} aria-label="Stay" selected={range} onSelect={setRange} />
      </div>
      <p data-testid="calendar-range-value">Range: {range?.from ? toIsoDate(range.from) : ''}–{range?.to ? toIsoDate(range.to) : ''}</p>
      <form data-testid="calendar-form">
        <p id="calendar-due-label">Due date</p>
        <DatePicker aria-labelledby="calendar-due-label" name="due" locale="en-US" value={due ?? null} onValueChange={setDue} calendar={shown} />
      </form>
      <button type="button" data-testid="calendar-clear" onClick={() => setDue(undefined)}>Clear</button>
      <form data-testid="calendar-stay-form">
        <p id="calendar-stay-label">Stay</p>
        <DatePicker mode="range" aria-labelledby="calendar-stay-label" name="stay" locale="en-US" calendar={shown} />
      </form>
      <button type="button" data-testid="calendar-schedule" onClick={() => setScheduling(true)}>Schedule</button>
      <Dialog open={scheduling} onOpenChange={setScheduling}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Schedule</DialogTitle>
            <DialogDescription>Pick the day the post goes out.</DialogDescription>
          </DialogHeader>
          <DatePicker aria-label="Publish date" locale="en-US" calendar={shown} />
        </DialogContent>
      </Dialog>
    </section>
  )
}

const deploys = Array.from({ length: 12 }, (_, index) => ({ name: `Project ${String.fromCharCode(65 + index)}`, minutes: (index * 37) % 120 + 5 }))
function VariantsMoreTable() {
  const [sort, setSort] = React.useState<'ascending' | 'descending'>('descending')
  const [loading, setLoading] = React.useState(false)
  const rows = [...deploys].sort((a, b) => sort === 'ascending' ? a.minutes - b.minutes : b.minutes - a.minutes)
  return (
    <div data-testid="vm-table">
      <button type="button" data-testid="vm-table-loading" onClick={() => setLoading(value => !value)}>Toggle loading</button>
      <Table stickyHeader maxBlockSize="12rem" loading={loading} aria-label="Deploys">
        <TableHeader>
          <TableRow>
            <TableHead sort={sort} onSort={() => setSort(value => value === 'descending' ? 'ascending' : 'descending')}>Updated</TableHead>
            <TableHead>Project</TableHead>
            <TableHead actions />
          </TableRow>
        </TableHeader>
        <TableBody>
          {loading ? <TableSkeletonRows rows={3} columns={3} /> : rows.map(row => (
            <TableRow key={row.name}>
              <TableCell>{row.minutes} min ago</TableCell>
              <TableCell>{row.name}</TableCell>
              <TableCell actions><button type="button" aria-label={`Actions for ${row.name}`}>…</button></TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}

function VariantsMoreFields() {
  const [query, setQuery] = React.useState('')
  const [bio, setBio] = React.useState('Designing systems that stay calm under change.')
  return (
    <div data-testid="vm-fields">
      <Input size="sm" aria-label="Small input" placeholder="Small" />
      <Input aria-label="Default input" placeholder="Default" />
      <Input size="lg" aria-label="Large input" placeholder="Large" />
      <InputGroup>
        <InputGroupInput aria-label="Search projects" placeholder="Search" value={query} onChange={event => setQuery(event.target.value)} />
        <InputGroupAddon align="inline-end">
          {/* The consumer empties the field after a tick, as an async store would. */}
          <InputGroupClear label="Clear search" onClear={() => setTimeout(() => setQuery(''), 0)} />
        </InputGroupAddon>
      </InputGroup>
      <InputGroup>
        <InputGroupTextarea aria-label="Bio" aria-describedby="vm-bio-count" value={bio} onChange={event => setBio(event.target.value)} />
        <InputGroupAddon align="block-end">
          <InputGroupText>Shown on your profile</InputGroupText>
          <InputGroupCount id="vm-bio-count" value={bio.length} max={160} />
        </InputGroupAddon>
      </InputGroup>
    </div>
  )
}

const dot = <svg viewBox="0 0 16 16" width="16" height="16"><circle cx="8" cy="8" r="5" fill="currentColor" /></svg>
function VariantsMoreSelect() {
  const [roles, setRoles] = React.useState<string[]>([])
  const [sent, setSent] = React.useState('')
  return (
    <form data-testid="vm-select" onSubmit={event => { event.preventDefault(); setSent(new FormData(event.currentTarget).getAll('roles').join(',')) }}>
      <p id="vm-roles-label">Roles</p>
      <Select multiple name="roles" value={roles} onValueChange={setRoles}>
        <SelectTrigger aria-labelledby="vm-roles-label"><SelectValue placeholder="Choose roles" /></SelectTrigger>
        <SelectContent>
          <SelectGroup>
            <SelectLabel>Team</SelectLabel>
            <SelectItem value="designer" icon={dot}>Designer</SelectItem>
            <SelectItem value="engineer" icon={dot}>Engineer</SelectItem>
          </SelectGroup>
          <SelectSeparator />
          <SelectGroup>
            <SelectLabel>Guests</SelectLabel>
            <SelectItem value="researcher" icon={dot}>Researcher</SelectItem>
          </SelectGroup>
        </SelectContent>
      </Select>
      <button type="submit" data-testid="vm-select-submit">Save roles</button>
      <button type="button" data-testid="vm-select-reset" onClick={() => setRoles([])}>Reset roles</button>
      <output data-testid="vm-select-output">{sent}</output>
    </form>
  )
}

const vmCities = ['Amsterdam', 'Berlin', 'Copenhagen', 'Dublin', 'Edinburgh', 'Florence', 'Geneva', 'Helsinki', 'Istanbul', 'Jena', 'Kyiv', 'Lisbon', 'Madrid', 'Naples', 'Oslo', 'Prague']
function VariantsMoreRequiredSelect() {
  const [sent, setSent] = React.useState('')
  return (
    <form data-testid="vm-select-required" onSubmit={event => { event.preventDefault(); setSent(new FormData(event.currentTarget).getAll('cities').join(',') || 'none') }}>
      <p id="vm-cities-label">Cities</p>
      <Select multiple required name="cities" defaultValue={[]}>
        <SelectTrigger aria-labelledby="vm-cities-label"><SelectValue placeholder="Choose cities" /></SelectTrigger>
        <SelectContent>
          {vmCities.map(city => <SelectItem key={city} value={city.toLowerCase()}>{city}</SelectItem>)}
        </SelectContent>
      </Select>
      <button type="submit">Save cities</button>
      <output data-testid="vm-cities-output">{sent}</output>
    </form>
  )
}

function VariantsMoreToasts() {
  const [short, setShort] = React.useState(false)
  const [action, setAction] = React.useState(false)
  const [stack, setStack] = React.useState(false)
  const [promise, setPromise] = React.useState<Promise<string> | null>(null)
  const [pending, setPending] = React.useState(false)
  const start = (outcome: 'resolve' | 'reject') => {
    const run = new Promise<string>((resolve, reject) => {
      ;(window as unknown as Record<string, () => void>).__vmSettle = () => outcome === 'resolve' ? resolve('Ombelle') : reject(new Error('offline'))
    })
    setPromise(run)
  }
  return (
    <ToastProvider>
      <div data-testid="vm-toasts">
        <button type="button" onClick={() => setShort(true)}>Show short toast</button>
        <button type="button" onClick={() => setAction(true)}>Show action toast</button>
        <button type="button" onClick={() => setStack(true)}>Show three toasts</button>
        <button type="button" onClick={() => start('resolve')}>Publish preset</button>
        <button type="button" onClick={() => start('reject')}>Publish offline</button>
        <button type="button" onClick={() => { start('resolve'); setPending(true) }}>Publish and leave</button>
        <button type="button" onClick={() => setPending(false)}>Leave</button>
      </div>
      <Toast open={short} onOpenChange={setShort} data-testid="vm-toast-short">
        <ToastTitle>Preset saved</ToastTitle>
        <ToastClose />
      </Toast>
      <Toast open={action} onOpenChange={setAction} data-testid="vm-toast-action">
        <ToastTitle>Project archived</ToastTitle>
        <ToastAction altText="Undo archiving">Undo</ToastAction>
      </Toast>
      {['First', 'Second', 'Third'].map(name => (
        <Toast key={name} open={stack} onOpenChange={setStack} duration={Infinity} data-testid="vm-toast-stacked">
          <ToastTitle>{name} notification</ToastTitle>
        </Toast>
      ))}
      {promise && !pending ? <ToastPromise key={String(promise)} promise={promise} loading="Publishing preset…" success={(name: string) => `${name} published`} error="Publishing failed" /> : null}
      {promise && pending ? <ToastPromise promise={promise} loading="Publishing preset…" success="Published" error="Failed" /> : null}
      <ToastViewport stack data-testid="vm-toast-viewport" />
    </ToastProvider>
  )
}

function VariantsMoreSheets() {
  const [width, setWidth] = React.useState(320)
  return (
    <div data-testid="vm-sheets">
      <Sheet>
        <SheetTrigger asChild><Button>Filter projects</Button></SheetTrigger>
        <SheetContent side="bottom">
          <SheetHandle />
          <SheetHeader><SheetTitle>Filter projects</SheetTitle><SheetDescription>Drag the handle to resize or close.</SheetDescription></SheetHeader>
        </SheetContent>
      </Sheet>
      <Sheet>
        <SheetTrigger asChild><Button>Open inspector</Button></SheetTrigger>
        <SheetContent side="inline-end" resizable onSizeChange={setWidth}>
          <SheetHeader><SheetTitle>Inspector</SheetTitle><SheetDescription>{width} px</SheetDescription></SheetHeader>
        </SheetContent>
      </Sheet>
      <Sheet>
        <SheetTrigger asChild><Button>Show notices</Button></SheetTrigger>
        <SheetContent side="top">
          <SheetHeader><SheetTitle>Notices</SheetTitle><SheetDescription>Drag the handle down to show more.</SheetDescription></SheetHeader>
          <SheetHandle />
        </SheetContent>
      </Sheet>
      <output data-testid="vm-sheet-width">{width}</output>
    </div>
  )
}

// Browser coverage for the 0.7.3 batch 6b and 6c variants; the same in both editions.
function VariantsMoreScenario() {
  const [page, setPage] = React.useState(1)
  const [report, setReport] = React.useState(1)
  const [rows, setRows] = React.useState(25)
  return (
    <section aria-label="More variants" data-testid="variants-more">
      <Tabs defaultValue="general" orientation="vertical" data-testid="vm-vertical-tabs">
        <TabsList aria-label="Settings sections">
          <TabsTrigger value="general">General</TabsTrigger>
          <TabsTrigger value="members">Members</TabsTrigger>
          <TabsTrigger value="billing">Billing</TabsTrigger>
        </TabsList>
        <TabsContent value="general">Profile, language and theme.</TabsContent>
        <TabsContent value="members">People in this workspace.</TabsContent>
        <TabsContent value="billing">Plan and invoices.</TabsContent>
      </Tabs>
      <Tabs defaultValue="all">
        <TabsList appearance="pills" aria-label="Project lists">
          <TabsTrigger value="all">All<TabsCount>12</TabsCount></TabsTrigger>
          <TabsTrigger value="review">Review<TabsCount>3</TabsCount></TabsTrigger>
          <TabsTrigger value="archived">Archived<TabsCount>0</TabsCount></TabsTrigger>
        </TabsList>
        <TabsContent value="all">All projects.</TabsContent>
        <TabsContent value="review">Projects in review.</TabsContent>
        <TabsContent value="archived">Archived projects.</TabsContent>
      </Tabs>
      <Pagination aria-label="Project pages" data-testid="vm-compact">
        <PaginationCompact page={page} pageCount={3} previousHref="#vm-page" nextHref="#vm-page"
          onPrevious={event => { event.preventDefault(); setPage(value => value - 1) }}
          onNext={event => { event.preventDefault(); setPage(value => value + 1) }} />
      </Pagination>
      <Pagination aria-label="Report pages" data-testid="vm-compact-buttons">
        <PaginationCompact page={report} pageCount={2} onPrevious={() => setReport(value => value - 1)} onNext={() => setReport(value => value + 1)} />
      </Pagination>
      <PaginationPageSize data-testid="vm-page-size" value={rows} onValueChange={setRows}
        range={<output data-testid="vm-range">1–{rows} of 290</output>} />
      <VariantsMoreTable />
      <VariantsMoreFields />
      <VariantsMoreSelect />
      <VariantsMoreRequiredSelect />
      <VariantsMoreToasts />
      <VariantsMoreSheets />
    </section>
  )
}

// Browser coverage for the 0.7.3 batch 6a variants; the same in both editions.
const pixel = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+M8AAAMBAQBYkfQ8AAAAAElFTkSuQmCC'
function VariantsBasicsScenario() {
  const [saving, setSaving] = React.useState(false)
  const [longLabel, setLongLabel] = React.useState(false)
  const [notice, setNotice] = React.useState(true)
  const [shared, setShared] = React.useState(false)
  const [submitted, setSubmitted] = React.useState('')
  const heading = React.useRef<HTMLHeadingElement>(null)
  return (
    <section aria-label="Variants" data-testid="variants">
      <div className="specimen-row">
        <Button data-testid="vb-save" loading={saving}>{longLabel ? 'Save all twelve changes' : 'Save changes'}</Button>
        <button type="button" data-testid="vb-toggle-loading" onClick={() => setSaving(value => !value)}>Toggle saving</button>
        <button type="button" data-testid="vb-longer-label" onClick={() => setLongLabel(true)}>Longer label</button>
        <Button variant="link-destructive">Remove member</Button>
      </div>
      <div className="specimen-row">
        <Badge appearance="soft" variant="success"><BadgeDot />Live</Badge>
        <Badge appearance="soft" variant="warning">Degraded</Badge>
        <Badge appearance="outline" variant="destructive">Deprecated</Badge>
      </div>
      {notice ? (
        <Alert variant="info" data-testid="vb-alert" onDismiss={() => { setNotice(false); heading.current?.focus() }}>
          <AlertTitle>New version available</AlertTitle>
          <AlertDescription>0.7.3 adds 14 components.</AlertDescription>
        </Alert>
      ) : null}
      <h3 ref={heading} tabIndex={-1} data-testid="vb-plan-heading">Plan</h3>
      <Card data-testid="vb-link-card">
        <CardHeader>
          <CardTitle><CardLink href="#featured">Website refresh</CardLink></CardTitle>
          <CardDescription data-testid="vb-link-description">Whole card is the link.</CardDescription>
        </CardHeader>
        <CardContent>
          <button type="button" data-testid="vb-share" onClick={() => setShared(true)}>Share</button>
          <span data-testid="vb-shared">{shared ? 'Shared' : ''}</span>
        </CardContent>
      </Card>
      <form data-testid="vb-plan-form" onSubmit={event => { event.preventDefault(); setSubmitted('plan=' + String(new FormData(event.currentTarget).get('plan'))) }}>
        <button type="button" data-testid="vb-before-plans">Before the plans</button>
        <CardGroup name="plan" aria-labelledby="vb-plans-label" defaultValue="team">
          <CardOption value="starter" title="Starter" description="One project." />
          <CardOption value="team" title="Team" description="Selected option." />
          <CardOption value="enterprise" title="Enterprise" description="Unlimited projects." />
        </CardGroup>
        <p id="vb-plans-label">Plan</p>
        <button type="submit" data-testid="vb-plan-submit">Choose plan</button>
        <output data-testid="vb-plan-output">{submitted}</output>
      </form>
      <Card>
        <CardMedia><span /></CardMedia>
        <CardHeader><CardTitle>Media header</CardTitle></CardHeader>
      </Card>
      <AvatarGroup aria-label="Reviewers: 7">
        <Avatar role="img" aria-label="Ada Lovelace"><AvatarFallback>AL</AvatarFallback></Avatar>
        <Avatar role="img" aria-label="Grace Hopper" data-testid="vb-avatar-broken"><AvatarImage src="/missing-avatar.png" alt="" /><AvatarFallback>GH</AvatarFallback></Avatar>
        <Avatar role="img" aria-label="Hedy Lamarr" data-testid="vb-avatar-fast"><AvatarImage src={pixel} alt="" /><AvatarFallback>HL</AvatarFallback></Avatar>
        <AvatarOverflow count={4} label="4 more reviewers" />
      </AvatarGroup>
      <Avatar shape="square" role="img" aria-label="Acme workspace"><AvatarFallback delayMs={0}>AC</AvatarFallback></Avatar>
      <Accordion type="single" collapsible defaultValue="export" appearance="flush" icon="plus" data-testid="vb-accordion">
        <AccordionItem value="export">
          <AccordionTrigger>Can I export a preset?</AccordionTrigger>
          <AccordionContent>Yes, as JSON or with the CLI.</AccordionContent>
        </AccordionItem>
        <AccordionItem value="glass">
          <AccordionTrigger>Does glass work in Firefox?</AccordionTrigger>
          <AccordionContent>Mostly.</AccordionContent>
        </AccordionItem>
      </Accordion>
    </section>
  )
}

// Browser coverage for Combobox, Command, Hover Card and Context Menu; the same in both editions.
function OverlaysScenario() {
  const [preset, setPreset] = React.useState('')
  const [created, setCreated] = React.useState('')
  const [presets, setPresets] = React.useState<string[]>([])
  const [ran, setRan] = React.useState('')
  const [palette, setPalette] = React.useState(false)
  const [action, setAction] = React.useState('')
  React.useEffect(() => {
    const toggle = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault()
        setPalette((open) => !open)
      }
    }
    window.addEventListener('keydown', toggle)
    return () => window.removeEventListener('keydown', toggle)
  }, [])
  const options = overlayPresets.map(([value, label]) => <ComboboxItem key={value} value={value}>{label}</ComboboxItem>)
  const run = (name: string) => {
    setRan(name)
    setPalette(false)
  }
  return (
    <section aria-label="Overlays and search" data-testid="overlays-search">
      <p id="os-preset-label">Preset</p>
      <div data-testid="combobox-single">
        <Combobox value={preset} onValueChange={setPreset} onCreate={setCreated}>
          <ComboboxInput aria-labelledby="os-preset-label" placeholder="Search presets" />
          <ComboboxContent>
            <ComboboxList>{options}<ComboboxCreate /></ComboboxList>
            <ComboboxEmpty>No presets found.</ComboboxEmpty>
          </ComboboxContent>
        </Combobox>
      </div>
      <p data-testid="combobox-value">Value: {preset}</p>
      <button type="button" data-testid="combobox-set-ombelle" onClick={() => setPreset('ombelle')}>Use Ombelle</button>
      <p data-testid="combobox-created">Created: {created}</p>
      <p id="os-presets-label">Presets</p>
      <div data-testid="combobox-multiple">
        <Combobox multiple value={presets} onValueChange={setPresets}>
          <ComboboxInput aria-labelledby="os-presets-label" />
          <ComboboxContent>
            <ComboboxList>{options}</ComboboxList>
            <ComboboxEmpty>No presets found.</ComboboxEmpty>
          </ComboboxContent>
        </Combobox>
      </div>
      <button type="button" data-testid="command-opener" onClick={() => setPalette(true)}>Open command menu</button>
      <CommandDialog open={palette} onOpenChange={setPalette}>
        <Command label="Commands">
          <CommandInput placeholder="Search commands" />
          <CommandList>
            <CommandGroup heading="Components">
              <CommandItem onSelect={() => run('Add Button')}>Add Button<CommandShortcut>↵</CommandShortcut></CommandItem>
              <CommandItem onSelect={() => run('Add Dialog')}>Add Dialog</CommandItem>
            </CommandGroup>
            <CommandSeparator />
            <CommandGroup heading="Theme">
              <CommandItem onSelect={() => run('Add theme from preset')}>Add theme from preset<CommandShortcut>Ctrl+T</CommandShortcut></CommandItem>
            </CommandGroup>
          </CommandList>
          <CommandEmpty>No results.</CommandEmpty>
        </Command>
      </CommandDialog>
      <p data-testid="command-ran">Ran: {ran}</p>
      <p>
        Built with{' '}
        <HoverCard>
          <HoverCardTrigger href="#hover-target" data-testid="hover-trigger">@ombelle</HoverCardTrigger>
          <HoverCardContent data-testid="hover-content">
            <strong>Ombelle UI</strong>
            <p>Reviewed React components with deterministic presets.</p>
            <HoverCardArrow />
          </HoverCardContent>
        </HoverCard>{' '}
        presets.
      </p>
      <ContextMenu>
        <ContextMenuTrigger variant="zone" tabIndex={0} aria-label="Layer: Hero card" data-testid="context-zone" style={{ minHeight: 160 }}>
          Right-click or Shift+F10 on a layer
        </ContextMenuTrigger>
        <ContextMenuContent>
          <ContextMenuItem onClick={() => setAction('Duplicate')}>Duplicate<ContextMenuShortcut>Ctrl+D</ContextMenuShortcut></ContextMenuItem>
          <ContextMenuSub>
            <ContextMenuSubTrigger>Apply preset</ContextMenuSubTrigger>
            <ContextMenuSubContent>
              <ContextMenuItem onClick={() => setAction('Ombelle')}>Ombelle</ContextMenuItem>
              <ContextMenuItem onClick={() => setAction('Liquid glass')}>Liquid glass</ContextMenuItem>
            </ContextMenuSubContent>
          </ContextMenuSub>
          <ContextMenuItem onClick={() => setAction('Copy as JSX')}>Copy as JSX</ContextMenuItem>
          <ContextMenuSeparator />
          <ContextMenuItem variant="destructive" onClick={() => setAction('Delete')}>Delete<ContextMenuShortcut>Del</ContextMenuShortcut></ContextMenuItem>
        </ContextMenuContent>
      </ContextMenu>
      <p data-testid="context-action">Action: {action}</p>
    </section>
  )
}

// Browser coverage for newly added catalog contracts lives outside the parity
// sections, so the existing edition comparisons keep their original contents.
const editorInputSwatches = [
  { label: 'Rose', value: 'oklch(0.55 0.22 6)' },
  { label: 'Blue', value: '#1d4ed8' },
  { label: 'Ink', value: 'oklch(0.22 0.012 275)' },
]

/** Number Input and Color Picker fixtures for tests/e2e/editor-inputs-075.spec.ts. */
function EditorInputsScenario() {
  const [radius, setRadius] = React.useState<number | null>(12)
  const [report, setReport] = React.useState('')
  const [color, setColor] = React.useState('oklch(0.55 0.22 6)')
  // An editor shortcut sets the value while the popover stays open: Alt+R resets the accent.
  React.useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.altKey && event.code === 'KeyR') setColor('#1d4ed8')
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [])
  return (
    <section aria-label="Editor inputs" data-testid="editor-inputs-075">
      <div data-testid="number-fixture">
        <label htmlFor="fixture-radius">Border radius</label>
        <NumberInput id="fixture-radius" value={radius} min={0} max={32} unit="px"
          onValueChange={(value, details) => {
            setRadius(value)
            setReport(`${value === null ? 'null' : value} ${details.valid}`)
          }} />
        <output data-testid="number-report">{report}</output>
        <button type="button" onClick={() => setRadius(4)}>Reset radius</button>
      </div>
      <div data-testid="color-fixture">
        <ColorPicker label="Accent" value={color} onValueChange={setColor} swatches={editorInputSwatches}
          contrastWith="oklch(0.99 0 0)" contrastLabel="white" />
        <output data-testid="color-report">{color}</output>
        <button type="button" onClick={() => setColor('#1d4ed8')}>Reset accent</button>
      </div>
      <div data-testid="pair-fixture">
        <ColorPickerPair label="Primary">
          <ColorPicker mode="light" defaultValue="oklch(0.55 0.22 6)" />
          <ColorPicker mode="dark" defaultValue="oklch(0.7 0.18 6)" />
        </ColorPickerPair>
      </div>
    </section>
  )
}

function CatalogExpansionScenario() {
  const [submits, setSubmits] = React.useState(0)
  const [checks, setChecks] = React.useState(0)
  const [pages, setPages] = React.useState(0)
  const [archives, setArchives] = React.useState(0)
  return (
    <>
      <section data-expansion="input-group" className="specimen">
        <h2>Composed form controls</h2>
        <form onSubmit={(event) => { event.preventDefault(); setSubmits((count) => count + 1) }}>
          <label htmlFor="expansion-search">Expansion search</label>
          <InputGroup>
            <InputGroupAddon><InputGroupText aria-hidden="true">@</InputGroupText></InputGroupAddon>
            <InputGroupInput id="expansion-search" name="search" />
            <InputGroupAddon align="inline-end">
              <InputGroupButton onClick={() => setChecks((count) => count + 1)}>Check</InputGroupButton>
              <InputGroupButton type="submit">Go</InputGroupButton>
            </InputGroupAddon>
          </InputGroup>
          <p>Checks: <span data-check-count>{checks}</span>. Submissions: <span data-submit-count>{submits}</span>.</p>
        </form>
        <label htmlFor="expansion-email">Expansion email</label>
        <InputGroup>
          <InputGroupInput id="expansion-email" type="email" defaultValue="invalid" required aria-invalid="true" aria-describedby="expansion-email-error" />
          <InputGroupAddon align="inline-end"><InputGroupText aria-hidden="true">!</InputGroupText></InputGroupAddon>
        </InputGroup>
        <p id="expansion-email-error">Enter a complete email address.</p>
        <section aria-label="Form controls" data-testid="form-controls">
          <p id="fc-radius-label">Border radius</p>
          <Slider data-testid="slider-single" defaultValue={[12]} max={24} aria-labelledby="fc-radius-label" getValueText={(value) => `${value} pixels`} />
          <Slider data-testid="slider-range" defaultValue={[20, 80]} thumbLabels={['Minimum price', 'Maximum price']} />
          <ToggleGroup data-testid="toggle-single" type="single" defaultValue="week" aria-label="Calendar view">
            <ToggleGroupItem value="day">Day</ToggleGroupItem>
            <ToggleGroupItem value="week">Week</ToggleGroupItem>
            <ToggleGroupItem value="month">Month</ToggleGroupItem>
          </ToggleGroup>
          <Field>
            <FieldLabel>Topics</FieldLabel>
            <TagInput data-testid="tag-input" defaultValue={['glass']}>
              <TagInputList />
              <FieldControl><TagInputInput /></FieldControl>
            </TagInput>
            <FieldDescription>Enter or comma adds a topic.</FieldDescription>
          </Field>
          <p id="fc-otp-label">Verification code</p>
          <InputOTP data-testid="input-otp" maxLength={6} aria-labelledby="fc-otp-label">
            <InputOTPGroup>
              <InputOTPSlot index={0} />
              <InputOTPSlot index={1} />
              <InputOTPSlot index={2} />
            </InputOTPGroup>
            <InputOTPSeparator />
            <InputOTPGroup>
              <InputOTPSlot index={3} />
              <InputOTPSlot index={4} />
              <InputOTPSlot index={5} />
            </InputOTPGroup>
          </InputOTP>
        </section>
        <section aria-label="Primitives" data-testid="primitives-075">
          <Toggle data-testid="toggle-bold" aria-label="Bold">B</Toggle>
          <Collapsible data-testid="collapsible-advanced">
            <CollapsibleTrigger>Advanced</CollapsibleTrigger>
            <CollapsibleContent><a href="#collapsible-link">Shadow offsets</a></CollapsibleContent>
          </Collapsible>
          <ScrollArea data-testid="scroll-long" aria-label="Release notes" style={{ blockSize: '8rem', inlineSize: '16rem' }}>
            {Array.from({ length: 24 }, (_, index) => <p key={index}>Release note {index + 1}</p>)}
          </ScrollArea>
          <ScrollArea data-testid="scroll-short" aria-label="Short note" style={{ blockSize: '8rem', inlineSize: '16rem' }}>
            <p>Nothing to scroll.</p>
          </ScrollArea>
          <ScrollArea data-testid="scroll-wide" aria-label="Long line" style={{ blockSize: '8rem', inlineSize: '16rem' }}>
            <p>{'Ombelle'.repeat(40)}</p>
          </ScrollArea>
          <ScrollArea data-testid="scroll-sideways" aria-label="Wide row" style={{ blockSize: '4rem', inlineSize: '16rem' }}>
            <p style={{ inlineSize: '40rem', margin: 0 }}>Wide row</p>
            <ScrollBar orientation="horizontal" />
          </ScrollArea>
          <ButtonGroup data-testid="group-two" aria-label="Alignment">
            <Button variant="outline">Left</Button>
            <ButtonGroupSeparator />
            <Button variant="outline">Right</Button>
          </ButtonGroup>
          <ButtonGroup data-testid="group-disabled" aria-label="Disabled middle">
            <Button variant="outline">Before</Button>
            <Button variant="outline" disabled>Middle</Button>
            <Button variant="outline">After</Button>
          </ButtonGroup>
          <ButtonGroup data-testid="group-one" aria-label="Single action">
            <Button variant="outline">Only</Button>
          </ButtonGroup>
          <ItemGroup data-testid="item-group" aria-label="Projects">
            <Item variant="outline">
              <ItemMedia variant="icon" aria-hidden="true">P</ItemMedia>
              <ItemContent><ItemTitle>Plain project</ItemTitle><ItemDescription>No link.</ItemDescription></ItemContent>
            </Item>
            <Item variant="outline" asChild>
              <a href="#item-link" data-testid="item-link">
                <ItemContent><ItemTitle>Linked project</ItemTitle><ItemDescription>Opens the project.</ItemDescription></ItemContent>
              </a>
              <ItemActions><Button variant="outline" size="sm">Archive</Button></ItemActions>
            </Item>
          </ItemGroup>
        </section>
        <EditorInputsScenario />
        <OverlaysScenario />
        <CalendarScenario />
        <VariantsBasicsScenario />
        <VariantsMoreScenario />
        <p id="field-own-note">Visible to your team.</p>
        <Field invalid>
          <FieldLabel>Display name</FieldLabel>
          <FieldControl><input id="field-own-input" data-testid="field-own" aria-describedby="field-own-note" defaultValue="A very long display name" /></FieldControl>
          <FieldDescription>Shown on your profile.</FieldDescription>
          <FieldError>Use 20 characters or fewer.</FieldError>
        </Field>
        <label htmlFor="expansion-disabled">Expansion disabled field</label>
        <InputGroup><InputGroupInput id="expansion-disabled" disabled defaultValue="Locked value" /></InputGroup>
        <label htmlFor="expansion-message">Expansion message</label>
        <InputGroup>
          <InputGroupAddon align="block-start"><InputGroupText>Message details</InputGroupText></InputGroupAddon>
          <InputGroupTextarea id="expansion-message" name="message" rows={3} />
          <InputGroupAddon align="block-end"><InputGroupText>No attachment</InputGroupText></InputGroupAddon>
        </InputGroup>
      </section>
      <section data-expansion="navigation" className="specimen">
        <h2>Project navigation</h2>
        <Breadcrumb aria-label="Project breadcrumb">
          <BreadcrumbList>
            <BreadcrumbItem><BreadcrumbLink href="#workspace">Workspace</BreadcrumbLink></BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem><BreadcrumbEllipsis /></BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem><BreadcrumbPage>Component review</BreadcrumbPage></BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>
        <button type="button">Before pagination</button>
        <Pagination aria-label="Project pagination">
          <PaginationContent>
            <PaginationItem><PaginationPrevious disabled href="#disabled-page" onClick={() => setPages((count) => count + 1)} /></PaginationItem>
            <PaginationItem><PaginationLink aria-label="Page 1" href="#page-1">1</PaginationLink></PaginationItem>
            <PaginationItem><PaginationLink aria-label="Page 2" href="#page-2" isActive>2</PaginationLink></PaginationItem>
            <PaginationItem><PaginationEllipsis /></PaginationItem>
            <PaginationItem><PaginationNext href="#page-3" onClick={(event) => { event.preventDefault(); setPages((count) => count + 1) }} /></PaginationItem>
          </PaginationContent>
        </Pagination>
        <button type="button">After pagination</button>
        <p>Page actions: <span data-page-count>{pages}</span>.</p>
      </section>
      <section data-expansion="surfaces" className="specimen">
        <h2>Surface appearances</h2>
        {(['default', 'outlined', 'subtle'] as const).map((appearance) => (
          <Card key={appearance} appearance={appearance}>
            <CardHeader><CardTitle level={3}>{appearance} project card</CardTitle><CardDescription>Review project progress.</CardDescription></CardHeader>
            <CardContent>Three milestones remain.</CardContent>
          </Card>
        ))}
        <Table aria-label="Default density projects">
          <TableHeader><TableRow><TableHead>Project</TableHead><TableHead>Status</TableHead></TableRow></TableHeader>
          <TableBody><TableRow><TableCell>Website</TableCell><TableCell>Active</TableCell></TableRow></TableBody>
          <TableCaption>Default spacing</TableCaption>
        </Table>
        <Table aria-label="Compact projects" density="compact" striped>
          <TableHeader><TableRow><TableHead>Project</TableHead><TableHead>Status</TableHead></TableRow></TableHeader>
          <TableBody>
            <TableRow><TableCell>Website</TableCell><TableCell>Active</TableCell></TableRow>
            <TableRow><TableCell>API</TableCell><TableCell>Draft</TableCell></TableRow>
            <TableRow selected><TableCell>CLI</TableCell><TableCell>Selected</TableCell></TableRow>
            <TableRow selected><TableCell>Docs</TableCell><TableCell>Selected</TableCell></TableRow>
          </TableBody>
          <TableCaption>Compact spacing with alternating body rows</TableCaption>
        </Table>
        <div className="actions">
          <Badge><BadgeDot />Default status</Badge>
          <Badge size="sm" variant="secondary"><BadgeDot />Small status</Badge>
        </div>
      </section>
      <section data-expansion="alerts" className="specimen">
        <h2>Alert variants</h2>
        {(['default', 'success', 'warning', 'info', 'destructive'] as const).map((variant) => (
          <Alert key={variant} variant={variant}>
            <AlertTitle>{variant} project notice</AlertTitle>
            <AlertDescription>Review the project settings before continuing.</AlertDescription>
          </Alert>
        ))}
      </section>
      <section data-expansion="tabs" className="specimen">
        <h2>Underline tabs</h2>
        {(['horizontal', 'vertical'] as const).map((orientation) => (
          <Tabs key={orientation} defaultValue="summary" orientation={orientation}>
            <TabsList appearance="underline" aria-label={'Expansion ' + orientation + ' tabs'}>
              <TabsTrigger value="summary">Summary</TabsTrigger>
              <TabsTrigger value="history">History</TabsTrigger>
              <TabsTrigger value="unavailable" disabled>Unavailable</TabsTrigger>
            </TabsList>
            <TabsContent value="summary">Current project summary.</TabsContent>
            <TabsContent value="history">Previous project changes.</TabsContent>
          </Tabs>
        ))}
      </section>
      <section data-expansion="sheet" className="specimen">
        <h2>Project sheet</h2>
        <Sheet>
          <SheetTrigger type="button">Open expansion sheet</SheetTrigger>
          <SheetContent data-expansion="sheet-content" side="inline-end" size="default">
            <SheetHeader>
              <SheetTitle>Expansion project details</SheetTitle>
              <SheetDescription>Review the project and its recent changes.</SheetDescription>
            </SheetHeader>
            <label htmlFor="expansion-sheet-name">Sheet project name</label>
            <input id="expansion-sheet-name" defaultValue="Component library" />
            <div style={{ display: 'grid', gap: '1rem', flexShrink: 0 }}>
              {Array.from({ length: 40 }, (_, index) => <p key={index}>Project update {index + 1}: Review the installed source and keep the approved settings.</p>)}
            </div>
            <SheetFooter><SheetClose type="button">Done reviewing</SheetClose></SheetFooter>
          </SheetContent>
        </Sheet>
      </section>
      <section data-expansion="alert-dialog" className="specimen">
        <h2>Protected confirmation</h2>
        <AlertDialog>
          <AlertDialogTrigger type="button">Open expansion confirmation</AlertDialogTrigger>
          <AlertDialogContent data-expansion="alert-dialog-content">
            <AlertDialogHeader>
              <AlertDialogTitle>Archive expansion project?</AlertDialogTitle>
              <AlertDialogDescription>The project will leave your active workspace. You can restore it later.</AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel type="button">Keep project</AlertDialogCancel>
              <AlertDialogAction type="button" onClick={() => setArchives((count) => count + 1)}>Archive project</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
        <p>Archived: <span data-archive-count>{archives}</span>.</p>
      </section>
      <section data-expansion="toast" className="specimen">
        <h2>Project notifications</h2>
        <ExpansionToast />
      </section>
    </>
  )
}

function ExpansionToast() {
  const [open, setOpen] = React.useState(false)
  return (
    <ToastProvider duration={1200}>
      <button type="button" onClick={() => setOpen(true)}>Show expansion notification</button>
      <Toast open={open} onOpenChange={setOpen} variant="success" data-expansion="toast-content">
        <ToastTitle>Expansion saved</ToastTitle>
        <ToastDescription>Your project changes are available.</ToastDescription>
        <ToastClose />
      </Toast>
      <ToastViewport data-expansion="toast-viewport" />
    </ToastProvider>
  )
}

export default function EditionScenario() {
  const [ready, setReady] = React.useState(false)
  React.useEffect(() => {
    const dark = new URLSearchParams(window.location.search).get('mode') === 'dark'
    document.documentElement.classList.toggle('dark', dark)
    document.documentElement.style.colorScheme = dark ? 'dark' : 'light'
    setReady(true)
  }, [])
  return (
    <main data-ready={String(ready)}>
      <Parity id="button">
        <div className="actions">
          <Button>Save</Button>
          <Button variant="secondary">Secondary</Button>
          <Button variant="destructive">Delete</Button>
          <Button variant="outline">Outline</Button>
          <Button variant="ghost">Ghost</Button>
          <Button variant="link">Link</Button>
          <Button size="sm">Small</Button>
          <Button size="lg">Large</Button>
          <Button size="icon" aria-label="Add">+</Button>
          <Button disabled>Disabled</Button>
          <Button loading>Saving</Button>
        </div>
      </Parity>
      <Parity id="separator">
        <Separator />
        <Separator decorative={false} />
        <Separator>or</Separator>
        <nav aria-label="Footer" className="actions">
          <a href="#docs">Docs</a>
          <Separator orientation="vertical" />
          <a href="#changelog">Changelog</a>
        </nav>
      </Parity>
      <Parity id="progress">
        <p id="install-label">Installing components</p>
        <Progress value={64} aria-labelledby="install-label" />
        <Progress value={100} aria-label="Installed" />
        <Progress value={0} aria-label="Queued" />
        <Progress aria-label="Checking contrast" />
      </Parity>
      <Parity id="avatar">
        <Avatar size="lg" variant="primary" role="img" aria-label="Ada Lovelace, online">
          <AvatarFallback>AL</AvatarFallback>
          <AvatarStatus />
        </Avatar>
        <Avatar size="sm" role="img" aria-label="Grace Hopper, offline">
          <AvatarFallback>GH</AvatarFallback>
          <AvatarStatus status="offline" />
        </Avatar>
        <AvatarGroup aria-label="Reviewers">
          <Avatar role="img" aria-label="Grace Hopper">
            <AvatarFallback>GH</AvatarFallback>
          </Avatar>
          <Avatar variant="secondary" role="img" aria-label="3 more reviewers">
            <AvatarFallback>+3</AvatarFallback>
          </Avatar>
        </AvatarGroup>
      </Parity>
      <Parity id="switch">
        <label className="field">
          Notifications
          <Switch name="notifications" />
        </label>
        <label className="field">
          Sync
          <Switch defaultChecked name="sync" />
        </label>
        <label className="field">
          Locked off
          <Switch disabled name="locked-off" />
        </label>
        <label className="field">
          Locked on
          <Switch disabled defaultChecked name="locked-on" />
        </label>
      </Parity>
      <Parity id="checkbox">
        <label htmlFor="terms">Accept terms</label>
        <Checkbox id="terms" name="terms" value="accepted" required aria-invalid="true" aria-describedby="terms-error" />
        <p id="terms-error">Accept the terms to continue.</p>
        <label htmlFor="news">Newsletter</label>
        <Checkbox id="news" defaultChecked />
        <label htmlFor="selection">Select all items</label>
        <Checkbox id="selection" defaultChecked="indeterminate" />
        <label htmlFor="locked">Locked</label>
        <Checkbox id="locked" disabled defaultChecked />
      </Parity>
      <Parity id="radio-group">
        <p id="plan-label">Plan</p>
        <RadioGroup defaultValue="team" aria-labelledby="plan-label">
          <RadioGroupOption>
            <RadioGroupItem value="starter" />
            <span>
              <RadioGroupOptionLabel>Starter</RadioGroupOptionLabel>
              <RadioGroupOptionDescription>One project</RadioGroupOptionDescription>
            </span>
          </RadioGroupOption>
          <RadioGroupOption>
            <RadioGroupItem value="team" />
            <span>
              <RadioGroupOptionLabel>Team</RadioGroupOptionLabel>
              <RadioGroupOptionDescription>Unlimited projects</RadioGroupOptionDescription>
            </span>
          </RadioGroupOption>
          <RadioGroupOption aria-disabled="true">
            <RadioGroupItem value="enterprise" disabled />
            <span>
              <RadioGroupOptionLabel>Enterprise</RadioGroupOptionLabel>
              <RadioGroupOptionDescription>Contact sales to enable</RadioGroupOptionDescription>
            </span>
          </RadioGroupOption>
        </RadioGroup>
      </Parity>
      <Parity id="tabs">
        <Tabs defaultValue="overview">
          <TabsList aria-label="Project sections">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="activity">Activity</TabsTrigger>
            <TabsTrigger value="settings" disabled>Settings</TabsTrigger>
          </TabsList>
          <TabsContent value="overview">Project overview.</TabsContent>
          <TabsContent value="activity">Recent activity.</TabsContent>
        </Tabs>
        <Tabs defaultValue="general" orientation="vertical">
          <TabsList aria-label="Settings sections">
            <TabsTrigger value="general">General</TabsTrigger>
            <TabsTrigger value="billing">Billing</TabsTrigger>
          </TabsList>
          <TabsContent value="general">General settings.</TabsContent>
          <TabsContent value="billing">Billing settings.</TabsContent>
        </Tabs>
      </Parity>
      <Parity id="accordion">
        <Accordion type="single" collapsible defaultValue="preset">
          <AccordionItem value="preset">
            <AccordionTrigger>What does a preset change?</AccordionTrigger>
            <AccordionContent>Colors, radius, borders, shadows and type.</AccordionContent>
          </AccordionItem>
          <AccordionItem value="edit">
            <AccordionTrigger>Can I edit installed components?</AccordionTrigger>
            <AccordionContent>Yes. Installed source stays yours to edit.</AccordionContent>
          </AccordionItem>
          <AccordionItem value="locked" disabled>
            <AccordionTrigger>Locked question</AccordionTrigger>
            <AccordionContent>Unavailable.</AccordionContent>
          </AccordionItem>
        </Accordion>
      </Parity>
      <Parity id="tooltip">
        <TooltipProvider delayDuration={300}>
          <Tooltip>
            <TooltipTrigger type="button">Project details</TooltipTrigger>
            <TooltipContent>
              View the project summary.
              <TooltipArrow />
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </Parity>
      <Parity id="popover">
        <Popover>
          <PopoverTrigger>Share preset</PopoverTrigger>
          <PopoverContent aria-labelledby="share-title">
            <PopoverTitle id="share-title">Share preset</PopoverTitle>
            <PopoverDescription>Anyone with the link can install this preset.</PopoverDescription>
          </PopoverContent>
        </Popover>
      </Parity>
      <Parity id="dialog">
      <Dialog>
        <DialogTrigger asChild>
          <Button variant="outline">Open dialog</Button>
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Example dialog</DialogTitle>
            <DialogDescription>Review this example.</DialogDescription>
          </DialogHeader>
          <DialogClose asChild>
            <Button>Done</Button>
          </DialogClose>
        </DialogContent>
      </Dialog>
      </Parity>
      <Parity id="dropdown-menu">
        <DropdownMenu>
          <DropdownMenuTrigger>Project actions</DropdownMenuTrigger>
          <DropdownMenuContent>
            <DropdownMenuLabel>Project</DropdownMenuLabel>
            <DropdownMenuGroup>
              <DropdownMenuItem>
                Rename
                <DropdownMenuShortcut>F2</DropdownMenuShortcut>
              </DropdownMenuItem>
              <DropdownMenuItem disabled>Duplicate</DropdownMenuItem>
            </DropdownMenuGroup>
            <DropdownMenuSeparator />
            <DropdownMenuCheckboxItem checked>Show grid</DropdownMenuCheckboxItem>
            <DropdownMenuCheckboxItem checked={false}>Show rulers</DropdownMenuCheckboxItem>
            <DropdownMenuSeparator />
            <DropdownMenuRadioGroup value="comfortable">
              <DropdownMenuRadioItem value="compact">Compact</DropdownMenuRadioItem>
              <DropdownMenuRadioItem value="comfortable">Comfortable</DropdownMenuRadioItem>
            </DropdownMenuRadioGroup>
            <DropdownMenuSeparator />
            <DropdownMenuSub>
              <DropdownMenuSubTrigger>Share</DropdownMenuSubTrigger>
              <DropdownMenuSubContent>
                <DropdownMenuItem>Copy link</DropdownMenuItem>
                <DropdownMenuItem>Email</DropdownMenuItem>
              </DropdownMenuSubContent>
            </DropdownMenuSub>
            <DropdownMenuItem variant="destructive">Archive</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </Parity>
      <Parity id="select">
        <label id="role-label">Role</label>
        <Select defaultValue="designer">
          <SelectTrigger aria-labelledby="role-label">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectGroup>
              <SelectLabel>Team</SelectLabel>
              <SelectItem value="designer">Designer</SelectItem>
              <SelectItem value="engineer">Engineer</SelectItem>
            </SelectGroup>
            <SelectSeparator />
            <SelectItem value="researcher" disabled hint="Seat limit">Researcher</SelectItem>
          </SelectContent>
        </Select>
        <label id="region-label">Region</label>
        <Select>
          <SelectTrigger size="sm" aria-labelledby="region-label">
            <SelectValue placeholder="Choose a region" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="eu">Europe</SelectItem>
            <SelectItem value="us">United States</SelectItem>
          </SelectContent>
        </Select>
      </Parity>
      <CatalogExpansionScenario />
    </main>
  )
}
