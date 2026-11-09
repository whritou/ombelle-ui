import { Alert, AlertDescription, AlertTitle } from '../generated/preset-gallery/components/ui/alert'
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
import { Card, CardContent, CardFooter } from '../generated/preset-gallery/components/ui/card'
import { Checkbox } from '../generated/preset-gallery/components/ui/checkbox'
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
  InputGroupText,
} from '../generated/preset-gallery/components/ui/input-group'
import { Label } from '../generated/preset-gallery/components/ui/label'
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
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
  TabsTrigger,
} from '../generated/preset-gallery/components/ui/tabs'
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from '../generated/preset-gallery/components/ui/empty'
import { Meter, MeterLabel } from '../generated/preset-gallery/components/ui/meter'
import { gate, type SceneProps } from './shared'

const rows = [
  { name: 'Website refresh', owner: 'Ada Lovelace', status: 'On track', alert: false, updated: '2 h ago' },
  { name: 'Mobile onboarding', owner: 'Grace Hopper', status: 'Needs attention', alert: true, updated: 'Yesterday' },
  { name: 'Billing migration', owner: 'Margaret Knight', status: 'Shipped', alert: false, updated: '10 min ago' },
  { name: 'Design tokens', owner: 'Hedy Lamarr', status: 'On track', alert: false, updated: '3 days ago' },
  { name: 'Help center', owner: 'Katherine Johnson', status: 'On track', alert: false, updated: 'Last week' },
  { name: 'Status page', owner: 'Radia Perlman', status: 'Needs attention', alert: true, updated: 'Last week' },
] as const

const filters = ['On track', 'Needs attention', 'Shipped'] as const

export function ProjectsScene(props: SceneProps) {
  const show = gate(props)
  return (
    <main className="preset-scene" data-testid="preset-scene" data-scene="projects">
      <div className="scene-heading">
        {show(
          'breadcrumb',
          'Breadcrumb',
          <Breadcrumb>
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
                  <fieldset className="scene-fields scene-fieldset">
                    <legend className="scene-muted">Status</legend>
                    {filters.map((filter, index) =>
                      show(
                        'checkbox',
                        'Checkbox',
                        <div key={filter} className="scene-inline">
                          <Checkbox id={`scene-filter-${index}`} defaultChecked={index < 2} />
                          <Label htmlFor={`scene-filter-${index}`}>{filter}</Label>
                        </div>,
                      ),
                    )}
                  </fieldset>
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
            <TabsList appearance="underline" aria-label="Project lists">
              <TabsTrigger value="all">All</TabsTrigger>
              <TabsTrigger value="mine">Mine</TabsTrigger>
              <TabsTrigger value="archived">Archived</TabsTrigger>
            </TabsList>
            <TabsContent value="all">
              {show(
                'table',
                'Table',
                <Table density="compact" striped aria-label="Projects">
                  <TableHeader>
                    <TableRow>
                      <TableHead>Project</TableHead>
                      <TableHead>Owner</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead numeric>Updated</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {rows.map((row) => (
                      <TableRow key={row.name}>
                        <TableCell>{row.name}</TableCell>
                        <TableCell>{row.owner}</TableCell>
                        <TableCell>
                          <Badge size="sm" variant={row.alert ? 'destructive' : 'default'}>
                            <BadgeDot />
                            {row.status}
                          </Badge>
                        </TableCell>
                        <TableCell numeric>{row.updated}</TableCell>
                      </TableRow>
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
          <span className="scene-muted">Showing 1–6 of 12</span>
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
      <div className="scene-columns">
        {show(
          'meter',
          'Meter',
          <Card>
            <CardContent className="scene-fields">
              <Meter value={128} max={200} segments={10} warningAt={0.6}>
                <MeterLabel>Deploys this month</MeterLabel>
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
