import { Badge } from '../generated/preset-gallery/components/ui/badge'
import { Button } from '../generated/preset-gallery/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '../generated/preset-gallery/components/ui/card'
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
