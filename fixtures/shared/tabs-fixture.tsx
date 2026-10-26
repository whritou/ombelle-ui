'use client'
import * as React from 'react'
import { Button } from '@/components/ui/button'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'

export function TabsFixture() {
  const [direction, setDirection] = React.useState<'ltr' | 'rtl'>('ltr')
  return (
    <section
      data-testid="tabs-fixture"
      aria-label="Tabs examples"
      dir={direction}
      style={{ display: 'grid', gap: 24, marginTop: 24, maxWidth: 600 }}
    >
      <h2>Project views</h2>
      <Tabs defaultValue="overview" dir={direction}>
        <TabsList aria-label="Project views">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="activity">Activity</TabsTrigger>
          <TabsTrigger value="history" disabled>History</TabsTrigger>
        </TabsList>
        <TabsContent value="overview">Project summary and release notes.</TabsContent>
        <TabsContent value="activity">Recent reviews and changes.</TabsContent>
        <TabsContent value="history">Archived project history.</TabsContent>
      </Tabs>
      <Tabs defaultValue="profile" orientation="vertical" dir={direction}>
        <TabsList aria-label="Account views">
          <TabsTrigger value="profile">Profile</TabsTrigger>
          <TabsTrigger value="security">Security</TabsTrigger>
          <TabsTrigger value="billing" disabled>Billing</TabsTrigger>
        </TabsList>
        <TabsContent value="profile">Your public profile.</TabsContent>
        <TabsContent value="security">Your sign-in preferences.</TabsContent>
        <TabsContent value="billing">Billing is managed by your team.</TabsContent>
      </Tabs>
      <Button variant="outline" onClick={() => setDirection(direction === 'ltr' ? 'rtl' : 'ltr')}>
        Use {direction === 'ltr' ? 'right-to-left' : 'left-to-right'} layout
      </Button>
    </section>
  )
}
