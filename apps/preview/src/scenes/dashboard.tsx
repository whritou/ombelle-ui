import { Alert, AlertDescription, AlertTitle } from '../generated/preset-gallery/components/ui/alert'
import {
  Avatar,
  AvatarFallback,
  AvatarGroup,
  AvatarStatus,
} from '../generated/preset-gallery/components/ui/avatar'
import { Badge, BadgeDot } from '../generated/preset-gallery/components/ui/badge'
import { Button } from '../generated/preset-gallery/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '../generated/preset-gallery/components/ui/card'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
  DropdownMenuTrigger,
} from '../generated/preset-gallery/components/ui/dropdown-menu'
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '../generated/preset-gallery/components/ui/dialog'
import { Input } from '../generated/preset-gallery/components/ui/input'
import { Label } from '../generated/preset-gallery/components/ui/label'
import {
  Popover,
  PopoverContent,
  PopoverDescription,
  PopoverTitle,
  PopoverTrigger,
} from '../generated/preset-gallery/components/ui/popover'
import { Progress } from '../generated/preset-gallery/components/ui/progress'
import { Switch } from '../generated/preset-gallery/components/ui/switch'
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
import {
  Tooltip,
  TooltipArrow,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '../generated/preset-gallery/components/ui/tooltip'
import { Stepper, StepperDescription, StepperIndicator, StepperItem, StepperSeparator, StepperTitle } from '../generated/preset-gallery/components/ui/stepper'
import { gate, type SceneProps } from './shared'

const stats = [
  { label: 'Active projects', value: '12', note: '2 added this week' },
  { label: 'Open reviews', value: '34', note: '5 waiting on you' },
  { label: 'Deploys this month', value: '128', note: 'Up 8% on last month' },
]
const projects = [
  { name: 'Website refresh', detail: 'Updated 2 hours ago', status: 'On track', alert: false, owner: 'Ada Lovelace', initials: 'AL', tone: 'primary' },
  { name: 'Mobile onboarding', detail: 'Updated yesterday', status: 'Needs attention', alert: true, owner: 'Grace Hopper', initials: 'GH', tone: 'default' },
  { name: 'Billing migration', detail: 'Updated last week', status: 'On track', alert: false, owner: 'Margaret Knight', initials: 'MK', tone: 'secondary' },
] as const

export function DashboardScene(props: SceneProps) {
  const show = gate(props)
  return (
    <main className="preset-scene" data-testid="preset-scene" data-scene="dashboard">
      <header className="scene-header">
        <h1>Overview</h1>
        <div className="scene-actions">
          {show(
            'popover',
            'Popover',
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline">Invite</Button>
              </PopoverTrigger>
              <PopoverContent align="end" aria-labelledby="scene-invite-title">
                <PopoverTitle id="scene-invite-title">Invite to Acme</PopoverTitle>
                <PopoverDescription>Anyone with the link can join this workspace.</PopoverDescription>
                {show(
                  'input',
                  'Input',
                  <Input aria-label="Invite link" defaultValue="acme.app/join/7f3a2c" readOnly />,
                )}
              </PopoverContent>
            </Popover>,
          )}
          {show(
            'dialog',
            'Dialog',
            <Dialog>
              <DialogTrigger asChild>
                <Button>New project</Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>New project</DialogTitle>
                  <DialogDescription>Projects group the work your team ships together.</DialogDescription>
                </DialogHeader>
                <form className="scene-form" aria-label="New project" onSubmit={(event) => event.preventDefault()}>
                  {show(
                    'input',
                    'Input',
                    <div className="scene-field">
                      <Label htmlFor="scene-project-name">Project name</Label>
                      <Input id="scene-project-name" placeholder="Website refresh" />
                    </div>,
                  )}
                  <div className="scene-actions scene-actions-end">
                    <DialogClose asChild>
                      <Button type="button" variant="outline">Cancel</Button>
                    </DialogClose>
                    <Button type="submit">Create project</Button>
                  </div>
                </form>
              </DialogContent>
            </Dialog>,
          )}
        </div>
      </header>
      {show(
        'stepper',
        'Stepper',
        <Stepper aria-label="Getting started">
          <StepperItem status="complete">
            <StepperIndicator>1</StepperIndicator>
            <StepperTitle>Preset</StepperTitle>
            <StepperDescription>Ombelle</StepperDescription>
            <StepperSeparator />
          </StepperItem>
          <StepperItem status="current">
            <StepperIndicator>2</StepperIndicator>
            <StepperTitle>Components</StepperTitle>
            <StepperDescription>Choose 4</StepperDescription>
            <StepperSeparator />
          </StepperItem>
          <StepperItem status="upcoming">
            <StepperIndicator>3</StepperIndicator>
            <StepperTitle>Install CLI</StepperTitle>
          </StepperItem>
        </Stepper>,
      )}
      {show(
        'alert',
        'Alert',
        <Alert variant="destructive">
          <AlertTitle>Mobile onboarding needs attention</AlertTitle>
          <AlertDescription>Two checks failed on the latest preview build.</AlertDescription>
        </Alert>,
      )}
      <div className="scene-stats">
        {stats.map((stat) => (
          <Card key={stat.label}>
            <CardHeader>
              <CardDescription>{stat.label}</CardDescription>
              <CardTitle level={2}>{stat.value}</CardTitle>
            </CardHeader>
            <CardContent>{stat.note}</CardContent>
            {stat.label === 'Deploys this month'
              ? show(
                  'progress',
                  'Progress',
                  <CardContent>
                    <Progress value={128} max={200} aria-label="Deploys used this month: 128 of 200" />
                  </CardContent>,
                )
              : null}
          </Card>
        ))}
      </div>
      <Card>
        <CardHeader>
          <CardTitle level={2}>Projects</CardTitle>
          <CardDescription>Everything your team is shipping.</CardDescription>
          {show(
            'avatar',
            'Avatar',
            <AvatarGroup aria-label="Reviewers">
              <Avatar variant="primary" role="img" aria-label="Ada Lovelace, online">
                <AvatarFallback>AL</AvatarFallback>
                <AvatarStatus />
              </Avatar>
              <Avatar role="img" aria-label="Grace Hopper">
                <AvatarFallback>GH</AvatarFallback>
              </Avatar>
              <Avatar variant="secondary" role="img" aria-label="3 more reviewers">
                <AvatarFallback>+3</AvatarFallback>
              </Avatar>
            </AvatarGroup>,
          )}
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="projects" className="scene-tabs">
            <TabsList aria-label="Dashboard sections">
              <TabsTrigger value="projects">Projects</TabsTrigger>
              <TabsTrigger value="activity">Activity</TabsTrigger>
            </TabsList>
            <TabsContent value="projects">
              <TooltipProvider delayDuration={300}>
                <ul className="scene-list" aria-label="Projects">
                  {projects.map((project) => (
                    <li key={project.name} className="scene-list-row">
                      {show(
                        'avatar',
                        'Avatar',
                        <Avatar size="sm" variant={project.tone} role="img" aria-label={`Owner: ${project.owner}`}>
                          <AvatarFallback>{project.initials}</AvatarFallback>
                        </Avatar>,
                      )}
                      <span className="scene-grow">
                        <strong>{project.name}</strong>
                        <span className="scene-muted">{project.detail}</span>
                      </span>
                      <Badge size="sm" variant={project.alert ? 'destructive' : 'default'}>
                        <BadgeDot />
                        {project.status}
                      </Badge>
                      {show(
                        'switch',
                        'Switch',
                        <Switch aria-label={`Notify me about ${project.name}`} defaultChecked={!project.alert} />,
                      )}
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button variant="outline" size="sm" aria-label={`Archive ${project.name}`}>
                            Archive
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>
                          Moves {project.name} out of the active list.
                          <TooltipArrow />
                        </TooltipContent>
                      </Tooltip>
                      {show(
                        'dropdown-menu',
                        'Dropdown Menu',
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="outline" size="icon-sm" aria-label={`More actions for ${project.name}`}>
                              <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                                <circle cx="5" cy="12" r="1.8" />
                                <circle cx="12" cy="12" r="1.8" />
                                <circle cx="19" cy="12" r="1.8" />
                              </svg>
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuLabel>{project.name}</DropdownMenuLabel>
                            <DropdownMenuItem>
                              Rename<DropdownMenuShortcut>F2</DropdownMenuShortcut>
                            </DropdownMenuItem>
                            <DropdownMenuItem>Duplicate</DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem variant="destructive">Delete project</DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>,
                      )}
                    </li>
                  ))}
                </ul>
              </TooltipProvider>
            </TabsContent>
            <TabsContent value="activity">
              {show(
                'table',
                'Table',
                <Table aria-label="Recent deploys">
                  <TableHeader>
                    <TableRow>
                      <TableHead>Project</TableHead>
                      <TableHead>Environment</TableHead>
                      <TableHead numeric>Duration</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    <TableRow>
                      <TableCell>Website refresh</TableCell>
                      <TableCell>Production</TableCell>
                      <TableCell numeric>1 m 42 s</TableCell>
                    </TableRow>
                    <TableRow selected>
                      <TableCell>Mobile onboarding</TableCell>
                      <TableCell>Preview</TableCell>
                      <TableCell numeric>58 s</TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell>Billing migration</TableCell>
                      <TableCell>Preview</TableCell>
                      <TableCell numeric>2 m 05 s</TableCell>
                    </TableRow>
                  </TableBody>
                </Table>,
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </main>
  )
}
