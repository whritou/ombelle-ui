import { Alert, AlertDescription, AlertTitle } from '../generated/preset-gallery/components/ui/alert'
import { Badge } from '../generated/preset-gallery/components/ui/badge'
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
import { Switch } from '../generated/preset-gallery/components/ui/switch'
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
import { gate, type SceneProps } from './shared'

const stats = [
  { label: 'Active projects', value: '12', note: '2 added this week' },
  { label: 'Open reviews', value: '34', note: '5 waiting on you' },
  { label: 'Deploys this month', value: '128', note: 'Up 8% on last month' },
]
const projects = [
  { name: 'Website refresh', detail: 'Updated 2 hours ago', status: 'On track', alert: false },
  { name: 'Mobile onboarding', detail: 'Updated yesterday', status: 'Needs attention', alert: true },
  { name: 'Billing migration', detail: 'Updated last week', status: 'On track', alert: false },
]

export function DashboardScene(props: SceneProps) {
  const show = gate(props)
  return (
    <main className="preset-scene" data-testid="preset-scene" data-scene="dashboard">
      <header className="scene-header">
        <h1>Overview</h1>
        <div className="scene-actions">
          <Button variant="outline">Invite</Button>
          <Button>New project</Button>
        </div>
      </header>
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
          </Card>
        ))}
      </div>
      <Card>
        <CardHeader>
          <CardTitle level={2}>Projects</CardTitle>
          <CardDescription>Everything your team is shipping.</CardDescription>
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
                      <span className="scene-grow">
                        <strong>{project.name}</strong>
                        <span className="scene-muted">{project.detail}</span>
                      </span>
                      <Badge variant={project.alert ? 'destructive' : 'default'}>
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
            <TabsContent value="activity">Your latest changes are saved.</TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </main>
  )
}
