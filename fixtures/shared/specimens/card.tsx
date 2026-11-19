'use client'
import { Button } from '@/components/ui/button'
import { Card, CardAction, CardHeader, CardTitle, CardDescription, CardContent, CardFooter, CardGroup, CardOption } from '@/components/ui/card'

export function Specimen() {
  return (
    <section aria-label="Project card" data-component="card">
      <h2>Project card</h2>
      <Card>
        <CardHeader>
          <CardTitle level={3}>Website refresh</CardTitle>
          <CardDescription>
            A shared workspace for your next release.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p>All components use your project preset.</p>
        </CardContent>
        <CardFooter>Updated today</CardFooter>
      </Card>
      <div className="preset-variants">
        <Card appearance="outlined"><CardHeader><CardTitle level={3}>Outlined card</CardTitle></CardHeader><CardContent>Project summary.</CardContent></Card>
        <Card appearance="subtle" density="dense"><CardHeader><CardTitle level={3}>Subtle card</CardTitle></CardHeader><CardContent>Recent activity.</CardContent></Card>
      </div>
      <div data-component="card~action"><Card><CardHeader><CardTitle level={3}>Studio warm</CardTitle><CardDescription>Your preset, edited 2 h ago</CardDescription>
        <CardAction><Button variant="outline" size="icon-sm" aria-label="More actions for Studio warm"><span aria-hidden="true">⋯</span></Button></CardAction></CardHeader>
        <CardContent>Warm neutrals with a clay accent, for the studio app.</CardContent></Card></div>
      <div data-component="card~action-dense"><Card density="dense"><CardHeader><CardTitle level={3}>Night shift</CardTitle><CardDescription>Shared with you</CardDescription>
        <CardAction><Button variant="outline" size="icon-sm" aria-label="More actions for Night shift"><span aria-hidden="true">⋯</span></Button></CardAction></CardHeader>
        <CardContent>Deep blues for late reviews.</CardContent></Card></div>
      <p id="gallery-plan">Plan</p>
      <CardGroup name="gallery-plan" aria-labelledby="gallery-plan" defaultValue="team">
        <CardOption value="starter" title="Starter" description="One project." />
        <CardOption value="team" title="Team" description="Ten seats." />
      </CardGroup>
    </section>
  )
}
