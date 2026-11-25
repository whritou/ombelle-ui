'use client'
/**
 * dashboard-01: an overview content area with four stat cards, a usage meter, a setup
 * progress bar and a recent-activity table. Tabs switch the figures between 7 and 30 days.
 * It has no sidebar: place it inside your own app shell. The wide table scrolls inside its
 * own box, so the page never scrolls sideways.
 *
 * Example only: every figure below is example data, and the row menu items never contact a
 * server. They call showExampleNotice(), which shows a Toast. Replace exampleData and that
 * function with your own data and actions. The layout lives in dashboard-01.css; the look
 * comes from your preset's components.
 */
import * as React from 'react'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { Meter, MeterLabel, MeterValue } from '@/components/ui/meter'
import { Progress, ProgressLabel, ProgressValue } from '@/components/ui/progress'
import { Table, TableBody, TableCaption, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Toast, ToastClose, ToastDescription, ToastProvider, ToastTitle, ToastViewport, useToastManager } from '@/components/ui/toast'
import './dashboard-01.css'

type Range = '7d' | '30d'

const exampleData = {
  title: 'Overview',
  description: 'Example figures for a workspace on Ombelle. None of this data is real.',
  ranges: {
    '7d': {
      stats: [
        { label: 'Active members', value: '128', change: '+4 this week' },
        { label: 'Projects shipped', value: '12', change: '+2 this week' },
        { label: 'Components added', value: '46', change: '+9 this week' },
        { label: 'Open reviews', value: '7', change: '-3 this week' },
      ],
      usage: { used: 62, max: 100 },
    },
    '30d': {
      stats: [
        { label: 'Active members', value: '141', change: '+13 this month' },
        { label: 'Projects shipped', value: '38', change: '+11 this month' },
        { label: 'Components added', value: '183', change: '+41 this month' },
        { label: 'Open reviews', value: '9', change: '+1 this month' },
      ],
      usage: { used: 84, max: 100 },
    },
  },
  setup: { done: 3, total: 5 },
  activity: [
    { id: 'a1', person: 'Jordan Lee', initials: 'JL', action: 'Published a preset', project: 'Marketing site', status: 'Done', when: 'Today, 09:41' },
    { id: 'a2', person: 'Sam Rivera', initials: 'SR', action: 'Requested a review', project: 'Billing app', status: 'In review', when: 'Today, 08:15' },
    { id: 'a3', person: 'Priya Nair', initials: 'PN', action: 'Added 6 components', project: 'Design system', status: 'Done', when: 'Yesterday' },
    { id: 'a4', person: 'Alex Chen', initials: 'AC', action: 'Updated a theme', project: 'Docs', status: 'Failed', when: 'Yesterday' },
  ],
  menu: ['View details', 'Copy link', 'Archive'],
}

const statusVariant = { Done: 'success', 'In review': 'info', Failed: 'destructive' } as const

export function Dashboard01() {
  return (
    <ToastProvider>
      <Dashboard01Content />
    </ToastProvider>
  )
}

function Dashboard01Content() {
  const toastManager = useToastManager()
  const [range, setRange] = React.useState<Range>('7d')
  const titleId = React.useId()

  // Replace with your row actions. It is the only example-only code in this block.
  function showExampleNotice(title: string, message: string) {
    toastManager.add({ title, description: message })
  }

  const figures = (key: Range) => (
    <div data-block-part="figures">
      <div data-block-part="stats">
        {exampleData.ranges[key].stats.map((stat) => (
          <Card key={stat.label} data-block-part="stat">
            <CardHeader>
              <CardDescription>{stat.label}</CardDescription>
              <CardTitle>{stat.value}</CardTitle>
            </CardHeader>
            <CardContent>
              <p data-block-part="change">{stat.change}</p>
            </CardContent>
          </Card>
        ))}
      </div>
      <Card data-block-part="usage">
        <CardContent>
          <Meter
            value={exampleData.ranges[key].usage.used}
            max={exampleData.ranges[key].usage.max}
            aria-valuetext={`${exampleData.ranges[key].usage.used}% used`}
          >
            <MeterLabel>Storage used</MeterLabel>
            <MeterValue>{exampleData.ranges[key].usage.used}% used</MeterValue>
          </Meter>
        </CardContent>
      </Card>
    </div>
  )

  return (
    <>
      <section data-block="dashboard-01" aria-labelledby={titleId}>
        <div data-block-part="intro">
          <h2 id={titleId}>{exampleData.title}</h2>
          <p>{exampleData.description}</p>
        </div>
        <Tabs value={range} onValueChange={(value) => setRange(value as Range)} data-block-part="tabs">
          <TabsList>
            <TabsTrigger value="7d">7 days</TabsTrigger>
            <TabsTrigger value="30d">30 days</TabsTrigger>
          </TabsList>
          <TabsContent value="7d" data-block-part="panel">
            {figures('7d')}
          </TabsContent>
          <TabsContent value="30d" data-block-part="panel">
            {figures('30d')}
          </TabsContent>
        </Tabs>
        <Card data-block-part="setup">
          <CardContent>
            <Progress value={exampleData.setup.done} max={exampleData.setup.total}>
              <ProgressLabel>Workspace setup</ProgressLabel>
              <ProgressValue format={(value, max) => `${value} of ${max} steps`} />
            </Progress>
          </CardContent>
        </Card>
        <Card data-block-part="activity">
          <CardHeader>
            <CardTitle>Recent activity</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableCaption>Recent activity in this workspace (example data)</TableCaption>
              <TableHeader>
                <TableRow>
                  <TableHead>Person</TableHead>
                  <TableHead>Action</TableHead>
                  <TableHead>Project</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>When</TableHead>
                  <TableHead>
                    <span data-block-part="visually-hidden">Actions</span>
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {exampleData.activity.map((row) => (
                  <TableRow key={row.id}>
                    <TableCell>
                      <span data-block-part="person">
                        <Avatar size="sm">
                          <AvatarFallback>{row.initials}</AvatarFallback>
                        </Avatar>
                        {row.person}
                      </span>
                    </TableCell>
                    <TableCell>{row.action}</TableCell>
                    <TableCell>{row.project}</TableCell>
                    <TableCell>
                      <Badge variant={statusVariant[row.status as keyof typeof statusVariant]}>{row.status}</Badge>
                    </TableCell>
                    <TableCell>{row.when}</TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger render={<Button variant="ghost" size="icon-sm" data-block-part="row-menu" aria-label={`Actions for ${row.action}`} />}>
                            <svg aria-hidden="true" viewBox="0 0 16 16" width="16" height="16" fill="currentColor">
                              <circle cx="3" cy="8" r="1.5" />
                              <circle cx="8" cy="8" r="1.5" />
                              <circle cx="13" cy="8" r="1.5" />
                            </svg>
                          </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          {exampleData.menu.map((item) => (
                            <DropdownMenuItem
                              key={item}
                              onClick={() =>
                                showExampleNotice(`${item} did nothing`, `Example only: "${item}" did nothing`)
                              }
                            >
                              {item}
                            </DropdownMenuItem>
                          ))}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
        {/* Rendered even when empty, so the live region exists before the first toast. */}
        <ToastViewport>
          {toastManager.toasts.map((item) => (
            <Toast key={item.id} toast={item}>
              <ToastTitle>{item.title}</ToastTitle>
              <ToastDescription>{item.description}</ToastDescription>
              <ToastClose />
            </Toast>
          ))}
        </ToastViewport>
      </section>
    </>
  )
}
