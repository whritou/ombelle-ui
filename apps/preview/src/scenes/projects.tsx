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
import { Avatar, AvatarFallback, AvatarGroup, AvatarOverflow } from '../generated/preset-gallery/components/ui/avatar'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardLink, CardTitle } from '../generated/preset-gallery/components/ui/card'
import { Chip, ChipGroup } from '../generated/preset-gallery/components/ui/chip'
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
          <Breadcrumb aria-label="Project path">
            <BreadcrumbList>
              <BreadcrumbItem>
                <BreadcrumbLink href="#overview">Overview</BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator />
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
            {show('toggle', 'Toggle', <Toggle variant="outline">Show grid</Toggle>)}
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
          </div>
        </header>
      </div>
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
            </CardContent>
          </Card>,
        )}
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
