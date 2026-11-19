'use client'
import { Tabs, TabsCount, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'

export function Specimen() {
  return (
    <section aria-label="Project sections" data-component="tabs">
      <h2>Project sections</h2>
      <Tabs defaultValue="overview">
        <TabsList aria-label="Project sections">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="activity">Activity<TabsCount>3</TabsCount></TabsTrigger>
          <TabsTrigger value="settings" disabled>
            Settings
          </TabsTrigger>
        </TabsList>
        <TabsContent value="overview">
          Your project is ready to preview.
        </TabsContent>
        <TabsContent value="activity">
          Your latest changes are saved.
        </TabsContent>
      </Tabs>
      <Tabs defaultValue="overview" className="preset-variant">
        <TabsList appearance="underline" aria-label="Underline sections"><TabsTrigger value="overview">Overview</TabsTrigger><TabsTrigger value="activity">Activity</TabsTrigger></TabsList>
        <TabsContent value="overview">Project overview.</TabsContent>
        <TabsContent value="activity">Recent activity.</TabsContent>
      </Tabs>
    </section>
  )
}
