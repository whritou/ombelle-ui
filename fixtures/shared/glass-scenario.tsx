'use client'
import * as React from 'react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from '@/components/ui/card'
import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import {
  TooltipProvider,
  Tooltip,
  TooltipTrigger,
  TooltipContent,
} from '@/components/ui/tooltip'

const backdrops = [
  { id: 'solid', label: 'Solid', background: 'var(--background)' },
  {
    id: 'gradient',
    label: 'Gradient',
    background: 'linear-gradient(135deg, #f97316, #0ea5e9 50%, #111827)',
  },
  {
    id: 'pattern',
    label: 'Pattern',
    background:
      'repeating-conic-gradient(#000 0% 25%, #fff 0% 50%) 50% / 12px 12px',
  },
] as const

const unavailable = [
  'checkbox',
  'input',
  'label',
  'native-select',
  'switch',
  'textarea',
] as const

export default function GlassScenario() {
  const [ready, setReady] = React.useState(false)
  const [mode, setMode] = React.useState('light')
  React.useEffect(() => {
    const selected =
      new URLSearchParams(window.location.search).get('mode') === 'dark'
        ? 'dark'
        : 'light'
    document.documentElement.classList.toggle('dark', selected === 'dark')
    document.documentElement.style.colorScheme = selected
    setMode(selected)
    setReady(true)
  }, [])
  return (
    <main data-ready={String(ready)} data-style="STYLE_FAMILY">
      <header>
        <div>
          <h1>Ombelle liquid glass</h1>
          <p>STYLE_FAMILY · experimental · {mode} mode</p>
        </div>
        <nav aria-label="Color mode">
          <a href="?mode=light">Light</a>
          <a href="?mode=dark">Dark</a>
        </nav>
      </header>
      <TooltipProvider delayDuration={100}>
        {backdrops.map(({ id, label, background }) => (
          <section
            key={id}
            data-backdrop={id}
            aria-labelledby={`${id}-heading`}
            style={{
              background,
              display: 'grid',
              gap: 16,
              padding: 24,
              marginTop: 24,
            }}
          >
            <h2 id={`${id}-heading`}>{label} backdrop</h2>
            <div className="actions">
              <Button>Save changes</Button>
              <Button variant="secondary">Secondary</Button>
              <Badge>Experimental</Badge>
            </div>
            <Card>
              <CardHeader>
                <CardTitle>{label} card</CardTitle>
                <CardDescription>Glass surface over {id}.</CardDescription>
              </CardHeader>
              <CardContent>Card content over the {id} backdrop.</CardContent>
            </Card>
            <Card data-testid="nested-glass">
              <CardHeader>
                <CardTitle level={3}>Nested button</CardTitle>
              </CardHeader>
              <CardContent>
                <Button>Nested action</Button>
              </CardContent>
            </Card>
            <Tabs defaultValue="overview">
              <TabsList aria-label={`${label} views`}>
                <TabsTrigger value="overview">Overview</TabsTrigger>
                <TabsTrigger value="activity">Activity</TabsTrigger>
              </TabsList>
              <TabsContent value="overview">Project summary.</TabsContent>
              <TabsContent value="activity">Recent changes.</TabsContent>
            </Tabs>
            <div className="actions">
              <Dialog>
                <DialogTrigger asChild>
                  <Button variant="outline">Open {id} dialog</Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogTitle>Confirm changes</DialogTitle>
                  <DialogDescription>
                    Review your project settings before continuing.
                  </DialogDescription>
                  <Button>Confirm</Button>
                </DialogContent>
              </Dialog>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="outline">About {id} help</Button>
                </TooltipTrigger>
                <TooltipContent>Glass tooltip over {id}.</TooltipContent>
              </Tooltip>
            </div>
          </section>
        ))}
      </TooltipProvider>
      <section aria-labelledby="unavailable-heading">
        <h2 id="unavailable-heading">Not yet available</h2>
        {unavailable.map((id) => (
          <p key={id} data-unavailable={id}>
            Unavailable in liquid glass
          </p>
        ))}
      </section>
      <p className="note">
        Generated components · experimental liquid glass · editable source
      </p>
    </main>
  )
}
