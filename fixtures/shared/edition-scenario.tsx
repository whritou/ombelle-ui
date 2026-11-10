import * as React from 'react'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectSeparator, SelectTrigger, SelectValue } from '@/components/ui/select'
import { DropdownMenu, DropdownMenuCheckboxItem, DropdownMenuContent, DropdownMenuGroup, DropdownMenuItem, DropdownMenuLabel, DropdownMenuRadioGroup, DropdownMenuRadioItem, DropdownMenuSeparator, DropdownMenuShortcut, DropdownMenuSub, DropdownMenuSubContent, DropdownMenuSubTrigger, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Popover, PopoverContent, PopoverDescription, PopoverTitle, PopoverTrigger } from '@/components/ui/popover'
import { Tooltip, TooltipArrow, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { RadioGroup, RadioGroupItem, RadioGroupOption, RadioGroupOptionDescription, RadioGroupOptionLabel } from '@/components/ui/radio-group'
import { Checkbox } from '@/components/ui/checkbox'
import { Switch } from '@/components/ui/switch'
import { Avatar, AvatarFallback, AvatarGroup, AvatarStatus } from '@/components/ui/avatar'
import { Progress } from '@/components/ui/progress'
import { Separator } from '@/components/ui/separator'
import { InputGroup, InputGroupAddon, InputGroupButton, InputGroupInput, InputGroupText, InputGroupTextarea } from '@/components/ui/input-group'
import { Breadcrumb, BreadcrumbEllipsis, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from '@/components/ui/breadcrumb'
import { Pagination, PaginationContent, PaginationEllipsis, PaginationItem, PaginationLink, PaginationNext, PaginationPrevious } from '@/components/ui/pagination'
import { Sheet, SheetClose, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet'
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCaption, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge, BadgeDot } from '@/components/ui/badge'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Field, FieldControl, FieldDescription, FieldError, FieldLabel } from '@/components/ui/field'
import { Slider } from '@/components/ui/slider'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
import { TagInput, TagInputInput, TagInputList } from '@/components/ui/tag-input'
import { InputOTP, InputOTPGroup, InputOTPSeparator, InputOTPSlot } from '@/components/ui/input-otp'
import { Toast, ToastClose, ToastDescription, ToastProvider, ToastTitle, ToastViewport } from '@/components/ui/toast'

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

// Browser coverage for newly added catalog contracts lives outside the parity
// sections, so the existing edition comparisons keep their original contents.
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
