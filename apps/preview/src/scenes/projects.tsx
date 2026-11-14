import * as React from 'react'
import { Alert, AlertDescription, AlertTitle } from '../generated/preset-gallery/components/ui/alert'
import { DatePicker, fromIsoDate } from '../generated/preset-gallery/components/ui/calendar'
import { Combobox, ComboboxContent, ComboboxEmpty, ComboboxInput, ComboboxItem, ComboboxList } from '../generated/preset-gallery/components/ui/combobox'
import { ContextMenu, ContextMenuContent, ContextMenuItem, ContextMenuSeparator, ContextMenuShortcut, ContextMenuTrigger } from '../generated/preset-gallery/components/ui/context-menu'
import { HoverCard, HoverCardArrow, HoverCardContent, HoverCardTrigger } from '../generated/preset-gallery/components/ui/hover-card'
import { Badge, BadgeDot } from '../generated/preset-gallery/components/ui/badge'
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '../generated/preset-gallery/components/ui/breadcrumb'
import { Button } from '../generated/preset-gallery/components/ui/button'
import { Dialog, DialogBody, DialogClose, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '../generated/preset-gallery/components/ui/dialog'
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogConfirmInput, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogMedia, AlertDialogTitle, AlertDialogTrigger } from '../generated/preset-gallery/components/ui/alert-dialog'
import { Popover, PopoverArrow, PopoverContent, PopoverDescription, PopoverTitle, PopoverTrigger } from '../generated/preset-gallery/components/ui/popover'
import { Progress, ProgressLabel, ProgressValue } from '../generated/preset-gallery/components/ui/progress'
import { Avatar, AvatarFallback, AvatarGroup, AvatarOverflow } from '../generated/preset-gallery/components/ui/avatar'
import { Card, CardAction, CardContent, CardDescription, CardFooter, CardHeader, CardLink, CardTitle } from '../generated/preset-gallery/components/ui/card'
import { Chip, ChipGroup } from '../generated/preset-gallery/components/ui/chip'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '../generated/preset-gallery/components/ui/dropdown-menu'
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
  InputGroupText,
} from '../generated/preset-gallery/components/ui/input-group'
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPageSize,
  PaginationPrevious,
} from '../generated/preset-gallery/components/ui/pagination'
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHandle,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '../generated/preset-gallery/components/ui/sheet'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '../generated/preset-gallery/components/ui/table'
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsCount,
  TabsTrigger,
} from '../generated/preset-gallery/components/ui/tabs'
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from '../generated/preset-gallery/components/ui/empty'
import { Meter, MeterLabel, MeterValue } from '../generated/preset-gallery/components/ui/meter'
import { Toggle } from '../generated/preset-gallery/components/ui/toggle'
import { ScrollArea } from '../generated/preset-gallery/components/ui/scroll-area'
import { Item, ItemActions, ItemContent, ItemDescription, ItemGroup, ItemTitle } from '../generated/preset-gallery/components/ui/item'
import { CodeBlock, CodeBlockCommand } from '../generated/preset-gallery/components/ui/code-block'
import { Carousel, CarouselContent, CarouselCounter, CarouselDots, CarouselImage, CarouselItem, CarouselNext, CarouselPrevious, CarouselThumbnails } from '../generated/preset-gallery/components/ui/carousel'
import { AspectRatio } from '../generated/preset-gallery/components/ui/aspect-ratio'
import { Toolbar, ToolbarOverflow, ToolbarToggleGroup, ToolbarToggleItem } from '../generated/preset-gallery/components/ui/toolbar'
import { ariaKeyShortcuts, Tooltip, TooltipArrow, TooltipContent, TooltipProvider, TooltipShortcut, TooltipTrigger } from '../generated/preset-gallery/components/ui/tooltip'
import { gate, type SceneProps } from './shared'

const rows = [
  { name: 'Website refresh', owner: 'Ada Lovelace', status: 'On track', alert: false, updated: '2 h ago', due: '2026-11-14' },
  { name: 'Mobile onboarding', owner: 'Grace Hopper', status: 'Needs attention', alert: true, updated: 'Yesterday', due: '2026-11-12' },
  { name: 'Billing migration', owner: 'Margaret Knight', status: 'Shipped', alert: false, updated: '10 min ago', due: '2026-11-11' },
  { name: 'Design tokens', owner: 'Hedy Lamarr', status: 'On track', alert: false, updated: '3 days ago', due: '2026-11-20' },
  { name: 'Help center', owner: 'Katherine Johnson', status: 'On track', alert: false, updated: 'Last week', due: '2026-11-27' },
  { name: 'Status page', owner: 'Radia Perlman', status: 'Needs attention', alert: true, updated: 'Last week', due: '2026-11-30' },
] as const

const filters = ['On track', 'Needs attention', 'Shipped'] as const
const slug = (name: string) => name.toLowerCase().replace(/[^a-z0-9]+/g, '-')

const cards = [
  { name: 'Studio warm', detail: 'Your preset, edited 2 h ago' },
  { name: 'Night shift', detail: 'Shared by Grace Hopper' },
] as const

const uploads = [
  { name: 'brand-kit.zip', value: 64 },
  { name: 'tokens.json', value: 40 },
] as const

const toolbar = [
  { label: 'Undo', keys: ['Ctrl', 'Z'], icon: <><path d="M9 14 4 9l5-5" /><path d="M4 9h10a6 6 0 0 1 0 12h-3" /></> },
  { label: 'Redo', keys: ['Ctrl', 'Shift', 'Z'], icon: <><path d="m15 14 5-5-5-5" /><path d="M20 9H10a6 6 0 0 0 0 12h3" /></> },
] as const

// Project covers for the gallery: small 16:9 SVGs, one hue each, so the scene ships no image files.
const covers = [
  ['The Website refresh home page', 210], ['The Mobile onboarding welcome screen', 160], ['The Billing migration invoice table', 30],
  ['The Design tokens colour scale', 290], ['The Help center search page', 95],
].map(([alt, hue]) => ({ alt: alt as string, src: 'data:image/svg+xml,' + encodeURIComponent(`<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 16 9'>`
  + `<rect width='16' height='9' fill='hsl(${hue} 70% 82%)'/><rect x='2' y='2' width='12' height='5' rx='.6' fill='hsl(${hue} 45% 38%)'/></svg>`) }))

// The install preview: what `add` changes in the theme file.
const installDiff = ` :root {
-  --radius: 0.5rem;
+  --radius: 0.75rem;
+  --shadow-offset: 3px;
 }
`

const componentsJson = `{
  "style": "new-york",
  "tsx": true,
  "tailwind": { "css": "src/app/globals.css" },
  "aliases": { "components": "@/components", "ui": "@/components/ui" }
}
`

export function ProjectsScene(props: SceneProps) {
  const show = gate(props)
  const [owners, setOwners] = React.useState<string[]>([])
  const [dueBy, setDueBy] = React.useState<Date>()
  const [sort, setSort] = React.useState<'descending' | 'ascending'>('descending')
  const [pageSize, setPageSize] = React.useState(25)
  const filtered = rows
    .filter((row) => !owners.length || owners.includes(slug(row.owner)))
    .filter((row) => !dueBy || fromIsoDate(row.due)! <= dueBy)
  // Rows are listed newest first; ascending shows the oldest first.
  const shown = sort === 'descending' ? filtered : [...filtered].reverse()
  return (
    <main className="preset-scene" data-testid="preset-scene" data-scene="projects">
      <div className="scene-heading">
        {show(
          'breadcrumb',
          'Breadcrumb',
          <Breadcrumb aria-label="Project path" collapse="auto">
            <BreadcrumbList>
              {[['Overview', '#overview'], ['Acme workspace', '#workspace'], ['Design team', '#team'], ['Q4 roadmap', '#roadmap']].map(([label, href]) => (
                <React.Fragment key={href}>
                  <BreadcrumbItem>
                    <BreadcrumbLink href={href}>{label}</BreadcrumbLink>
                  </BreadcrumbItem>
                  <BreadcrumbSeparator />
                </React.Fragment>
              ))}
              <BreadcrumbItem>
                <BreadcrumbPage>Projects</BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>,
        )}
        <header className="scene-header">
          <div>
            <h1>Projects</h1>
            <p className="scene-muted">12 projects across 3 teams.</p>
          </div>
          <div className="scene-actions">
            {show(
              'toolbar',
              'Toolbar',
              <Toolbar aria-label="View options">
                <ToolbarToggleGroup type="single" defaultValue="list" aria-label="Layout">
                  <ToolbarToggleItem value="list">List</ToolbarToggleItem>
                  <ToolbarToggleItem value="board">Board</ToolbarToggleItem>
                </ToolbarToggleGroup>
                <ToolbarOverflow />
              </Toolbar>,
            )}
            {show(
              'tooltip',
              'Tooltip',
              <TooltipProvider delayDuration={300}>
                {toolbar.map(({ label, keys, icon }) => (
                  <Tooltip key={label}>
                    <TooltipTrigger asChild>
                      <Button variant="outline" size="icon" aria-label={label} aria-keyshortcuts={ariaKeyShortcuts(keys)}>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{icon}</svg>
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      {label}
                      <TooltipShortcut keys={[...keys]} />
                      <TooltipArrow />
                    </TooltipContent>
                  </Tooltip>
                ))}
              </TooltipProvider>,
            )}
            {show('toggle', 'Toggle', <Toggle variant="outline">Show grid</Toggle>)}
            {show(
              'dialog',
              'Dialog',
              <Dialog>
                <DialogTrigger asChild><Button variant="outline">Export</Button></DialogTrigger>
                <DialogContent size="lg">
                  <DialogHeader>
                    <DialogTitle>Export projects</DialogTitle>
                    <DialogDescription>Choose what the CSV file includes.</DialogDescription>
                  </DialogHeader>
                  <DialogBody>
                    {rows.map((row) => <p key={row.name}>{row.name}: {row.owner}, {row.status}, updated {row.updated}.</p>)}
                  </DialogBody>
                  <DialogFooter>
                    <DialogClose asChild><Button variant="outline">Cancel</Button></DialogClose>
                    <Button>Export CSV</Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>,
            )}
            {show(
              'alert-dialog',
              'Alert Dialog',
              <AlertDialog>
                <AlertDialogTrigger asChild><Button variant="destructive">Delete project</Button></AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogMedia tone="destructive" />
                    <AlertDialogTitle>Delete Website refresh?</AlertDialogTitle>
                    <AlertDialogDescription>Its history and install codes are removed for everyone.</AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogConfirmInput expected="website-refresh" />
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction>Delete project</AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>,
            )}
            {show(
              'popover',
              'Popover',
              <Popover>
                <PopoverTrigger asChild><Button variant="ghost">Help</Button></PopoverTrigger>
                <PopoverContent align="end" aria-labelledby="scene-help-title">
                  <PopoverArrow />
                  <PopoverTitle id="scene-help-title">Project lists</PopoverTitle>
                  <PopoverDescription>Pin a project to keep it at the top of every list.</PopoverDescription>
                </PopoverContent>
              </Popover>,
            )}
            {show(
              'input-group',
              'Input Group',
              <InputGroup className="scene-search">
                <InputGroupAddon>
                  <InputGroupText>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
                      <circle cx="11" cy="11" r="7" />
                      <path d="m20 20-3.5-3.5" />
                    </svg>
                  </InputGroupText>
                </InputGroupAddon>
                <InputGroupInput type="search" aria-label="Search projects" placeholder="Search projects" />
              </InputGroup>,
            )}
            {show(
              'sheet',
              'Sheet',
              <Sheet>
                <SheetTrigger asChild>
                  <Button variant="outline">Filters</Button>
                </SheetTrigger>
                <SheetContent>
                  <SheetHeader>
                    <SheetTitle>Filter projects</SheetTitle>
                    <SheetDescription>Show only the projects you need.</SheetDescription>
                  </SheetHeader>
                  {show(
                    'chip',
                    'Chip',
                    <ChipGroup aria-label="Status filter" className="scene-fields">
                      {filters.map((filter, index) => (
                        <Chip key={filter} defaultPressed={index < 2}>
                          {filter}
                        </Chip>
                      ))}
                    </ChipGroup>,
                  )}
                  {show(
                    'combobox',
                    'Combobox',
                    <div className="scene-field">
                      <p id="scene-owner-label">Owner</p>
                      <Combobox multiple value={owners} onValueChange={setOwners}>
                        <ComboboxInput aria-labelledby="scene-owner-label" placeholder="Search people" />
                        <ComboboxContent>
                          <ComboboxList>
                            {rows.map((row) => <ComboboxItem key={row.owner} value={slug(row.owner)}>{row.owner}</ComboboxItem>)}
                          </ComboboxList>
                          <ComboboxEmpty>No one matches.</ComboboxEmpty>
                        </ComboboxContent>
                      </Combobox>
                    </div>,
                  )}
                  {show(
                    'calendar',
                    'Calendar',
                    <div className="scene-field">
                      <p id="scene-due-label">Due by</p>
                      <DatePicker aria-labelledby="scene-due-label" value={dueBy ?? null} onValueChange={setDueBy}
                        calendar={{ today: '2026-11-10', defaultMonth: '2026-11-01' }} />
                    </div>,
                  )}
                  <SheetFooter>
                    <SheetClose asChild>
                      <Button>Apply filters</Button>
                    </SheetClose>
                  </SheetFooter>
                </SheetContent>
              </Sheet>,
            )}
            {show(
              'sheet',
              'Sheet',
              <Sheet>
                <SheetTrigger asChild>
                  <Button variant="outline">Quick filters</Button>
                </SheetTrigger>
                <SheetContent side="bottom" snapPoints={[0.5, 0.9]}>
                  <SheetHandle label="Resize Quick filters" />
                  <SheetHeader>
                    <SheetTitle>Quick filters</SheetTitle>
                    <SheetDescription>Settles at half or full height when released.</SheetDescription>
                  </SheetHeader>
                  <div className="scene-actions">
                    {filters.map((filter) => (
                      <SheetClose key={filter} asChild>
                        <Button variant="outline" size="sm">{filter}</Button>
                      </SheetClose>
                    ))}
                  </div>
                </SheetContent>
              </Sheet>,
            )}
          </div>
        </header>
      </div>
      {show(
        'progress',
        'Progress',
        <Progress value={64} tone="success">
          <ProgressLabel>Publishing Website refresh, on track</ProgressLabel>
          <ProgressValue />
        </Progress>,
      )}
      {show(
        'progress',
        'Progress',
        <Card appearance="outlined">
          <CardHeader>
            <CardTitle level={2}>Uploads</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="scene-list" aria-label="Uploads">
              {uploads.map((upload) => (
                <li key={upload.name} className="scene-list-row">
                  <Progress shape="circle" size="lg" value={upload.value} aria-label={`Uploading ${upload.name}`}>
                    <ProgressValue />
                  </Progress>
                  <span className="scene-grow">
                    <strong>{upload.name}</strong>
                    <span className="scene-muted">{upload.value}% uploaded</span>
                  </span>
                  <Button variant="outline" size="sm" aria-disabled="true" aria-busy="true">
                    <Progress shape="circle" size="sm" value={upload.value} aria-label={`Saving ${upload.name}`} />
                    Saving
                  </Button>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>,
      )}
      {show(
        'alert',
        'Alert',
        <Alert variant="success">
          <AlertTitle>Billing migration shipped</AlertTitle>
          <AlertDescription>Deployed to production 10 minutes ago.</AlertDescription>
        </Alert>,
      )}
      <Card appearance="outlined">
        <CardContent>
          <Tabs defaultValue="all" className="scene-tabs">
            <TabsList appearance="pills" aria-label="Project lists">
              <TabsTrigger value="all">All<TabsCount>12</TabsCount></TabsTrigger>
              <TabsTrigger value="mine">Mine<TabsCount>2</TabsCount></TabsTrigger>
              <TabsTrigger value="archived">Archived<TabsCount>4</TabsCount></TabsTrigger>
            </TabsList>
            <TabsContent value="all">
              {show(
                'table',
                'Table',
                <Table density="compact" striped stickyHeader maxBlockSize="20rem" aria-label="Projects">
                  <TableHeader>
                    <TableRow>
                      <TableHead>Project</TableHead>
                      <TableHead>Owner</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead numeric sort={sort} onSort={() => setSort(sort === 'descending' ? 'ascending' : 'descending')}>Updated</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {shown.map((row) => (
                      <ContextMenu key={row.name}>
                      <ContextMenuTrigger asChild>
                      <TableRow tabIndex={0}>
                        <TableCell>{row.name}</TableCell>
                        <TableCell>
                          <HoverCard>
                            <HoverCardTrigger href={`#people-${slug(row.owner)}`}>{row.owner}</HoverCardTrigger>
                            <HoverCardContent>
                              <strong>{row.owner}</strong>
                              <p className="scene-muted">Owns {row.name}. Updated {row.updated}.</p>
                              <HoverCardArrow />
                            </HoverCardContent>
                          </HoverCard>
                        </TableCell>
                        <TableCell>
                          <Badge size="sm" appearance="soft" variant={row.alert ? 'destructive' : 'success'}>
                            <BadgeDot />
                            {row.status}
                          </Badge>
                        </TableCell>
                        <TableCell numeric>{row.updated}</TableCell>
                      </TableRow>
                      </ContextMenuTrigger>
                      <ContextMenuContent>
                        <ContextMenuItem>Open</ContextMenuItem>
                        <ContextMenuItem>Duplicate<ContextMenuShortcut>Ctrl+D</ContextMenuShortcut></ContextMenuItem>
                        <ContextMenuItem>Archive</ContextMenuItem>
                        <ContextMenuSeparator />
                        <ContextMenuItem variant="destructive">Delete<ContextMenuShortcut>Del</ContextMenuShortcut></ContextMenuItem>
                      </ContextMenuContent>
                      </ContextMenu>
                    ))}
                  </TableBody>
                </Table>,
              )}
            </TabsContent>
            <TabsContent value="mine">You own 2 of these projects.</TabsContent>
            <TabsContent value="archived">Archived projects stay readable for 90 days.</TabsContent>
          </Tabs>
        </CardContent>
        <CardFooter className="scene-footer">
          <PaginationPageSize value={pageSize} onValueChange={setPageSize} range={`Showing 1–6 of 12`} />
          {show(
            'pagination',
            'Pagination',
            <Pagination aria-label="Project pages">
              <PaginationContent>
                <PaginationItem>
                  <PaginationPrevious disabled />
                </PaginationItem>
                <PaginationItem>
                  <PaginationLink href="#page-1" isActive aria-label="Page 1">1</PaginationLink>
                </PaginationItem>
                <PaginationItem>
                  <PaginationLink href="#page-2" aria-label="Page 2">2</PaginationLink>
                </PaginationItem>
                <PaginationItem>
                  <PaginationEllipsis />
                </PaginationItem>
                <PaginationItem>
                  <PaginationNext href="#page-2" />
                </PaginationItem>
              </PaginationContent>
            </Pagination>,
          )}
        </CardFooter>
      </Card>
      {show(
        'carousel',
        'Carousel',
        <Card appearance="outlined">
          <CardContent>
            <Carousel aria-label="Recent projects" slidesPerView={2}>
              <CarouselContent>
                {rows.slice(0, 5).map((row) => (
                  <CarouselItem key={row.name}>
                    {show('aspect-ratio', 'Aspect Ratio', <AspectRatio ratio={16 / 9}><span>{row.name}</span></AspectRatio>)}
                    <p className="scene-muted">{row.owner}, updated {row.updated}</p>
                  </CarouselItem>
                ))}
              </CarouselContent>
              <CarouselPrevious />
              <CarouselNext />
              <CarouselDots />
              <CarouselCounter />
            </Carousel>
          </CardContent>
        </Card>,
      )}
      {/* One gate, so a family without Carousel shows one note, not two. */}
      {props.unavailable.includes('carousel') ? null : (
        <Card appearance="outlined">
          <CardHeader>
            <CardTitle level={2}>Project gallery</CardTitle>
            <CardDescription>Covers from the five newest projects.</CardDescription>
          </CardHeader>
          <CardContent>
            <Carousel aria-label="Project gallery" variant="image" ratio="16 / 9">
              <CarouselContent>
                {covers.map((cover) => (
                  <CarouselItem key={cover.alt}>
                    <CarouselImage src={cover.src} alt={cover.alt} />
                  </CarouselItem>
                ))}
              </CarouselContent>
              <CarouselPrevious />
              <CarouselNext />
              <CarouselCounter />
              <CarouselThumbnails />
            </Carousel>
          </CardContent>
        </Card>
      )}
      {show(
        'item',
        'Item',
        <Card appearance="outlined">
          <CardContent>
            {show(
              'scroll-area',
              'Scroll Area',
              <ScrollArea aria-label="Project list" style={{ blockSize: '14rem' }}>
                <ItemGroup>
                  {rows.map((row) => (
                    <Item key={row.name} variant="outline" size="sm" asChild>
                      <a href={`#project-${slug(row.name)}`}>
                        <ItemContent>
                          <ItemTitle>{row.name}</ItemTitle>
                          <ItemDescription>{row.owner}, updated {row.updated}</ItemDescription>
                        </ItemContent>
                      </a>
                      <ItemActions>
                        <Badge size="sm" appearance="soft" variant={row.alert ? 'destructive' : 'success'}>{row.status}</Badge>
                      </ItemActions>
                    </Item>
                  ))}
                </ItemGroup>
              </ScrollArea>,
            )}
          </CardContent>
        </Card>,
      )}
      {show(
        'code-block',
        'Code Block',
        <Card>
          <CardHeader>
            <CardTitle>Add a component</CardTitle>
            <CardDescription>Run from the project root. The CLI reads the CSS file and aliases from components.json.</CardDescription>
          </CardHeader>
          <CardContent className="scene-fields">
            <CodeBlockCommand args="@ombelle-ui/cli add button" />
            <CodeBlock title="components.json" language="json" code={componentsJson} />
            <CodeBlock title="ui-style.css" language="css" diff code={installDiff} />
          </CardContent>
        </Card>,
      )}
      <div className="scene-columns">
        {show(
          'card',
          'Card',
          <Card>
            <CardHeader>
              <CardTitle><CardLink href="#featured">Website refresh</CardLink></CardTitle>
              <CardDescription>The featured project. Reviews close on Friday.</CardDescription>
            </CardHeader>
            <CardContent>
              {show(
                'avatar',
                'Avatar',
                <AvatarGroup aria-label="Reviewers: 7">
                  <Avatar role="img" aria-label="Ada Lovelace"><AvatarFallback>AL</AvatarFallback></Avatar>
                  <Avatar role="img" aria-label="Grace Hopper" variant="secondary"><AvatarFallback>GH</AvatarFallback></Avatar>
                  <Avatar role="img" aria-label="Hedy Lamarr"><AvatarFallback>HL</AvatarFallback></Avatar>
                  <AvatarOverflow count={4} label="4 more reviewers" />
                </AvatarGroup>,
              )}
            </CardContent>
          </Card>,
        )}
        {show(
          'meter',
          'Meter',
          <Card>
            <CardContent className="scene-fields">
              <Meter value={128} max={200} segments={10} warningAt={0.6}>
                <MeterLabel>Deploys this month</MeterLabel>
                <MeterValue />
              </Meter>
              <p className="scene-muted">Steps past 60% switch to the warning colour.</p>
              <div className="scene-inline">
                <Meter value={72} max={100} shape="circle" aria-labelledby="scene-storage-label" aria-valuetext="72 of 100 GB" />
                <span id="scene-storage-label">Storage used</span>
              </div>
            </CardContent>
          </Card>,
        )}
        {cards.map((card) => (
          <React.Fragment key={card.name}>
            {show(
              'card',
              'Card',
              <Card density="dense">
                <CardHeader>
                  <CardTitle>{card.name}</CardTitle>
                  <CardDescription>{card.detail}</CardDescription>
                  <CardAction>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="outline" size="icon-sm" aria-label={`More actions for ${card.name}`}>
                          <span aria-hidden="true">⋯</span>
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem>Duplicate</DropdownMenuItem>
                        <DropdownMenuItem>Share</DropdownMenuItem>
                        <DropdownMenuItem variant="destructive">Delete</DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </CardAction>
                </CardHeader>
                <CardContent>Warm neutrals with a clay accent.</CardContent>
              </Card>,
            )}
          </React.Fragment>
        ))}
        {show(
          'empty',
          'Empty State',
          <Empty>
            <EmptyHeader>
              <EmptyMedia variant="icon" aria-hidden="true">+</EmptyMedia>
              <EmptyTitle asChild>
                <h2>No archived projects</h2>
              </EmptyTitle>
              <EmptyDescription>Archived projects appear here, ready to restore.</EmptyDescription>
            </EmptyHeader>
            <EmptyContent>
              <Button variant="outline">Archive a project</Button>
            </EmptyContent>
          </Empty>,
        )}
      </div>
    </main>
  )
}
