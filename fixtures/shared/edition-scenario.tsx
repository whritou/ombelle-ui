import * as React from 'react'
import { Button } from '@/components/ui/button'
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { RadioGroup, RadioGroupItem, RadioGroupOption, RadioGroupOptionDescription, RadioGroupOptionLabel } from '@/components/ui/radio-group'
import { Checkbox } from '@/components/ui/checkbox'
import { Switch } from '@/components/ui/switch'
import { Avatar, AvatarFallback, AvatarGroup, AvatarStatus } from '@/components/ui/avatar'
import { Progress } from '@/components/ui/progress'
import { Separator } from '@/components/ui/separator'

// Ported components rendered identically in both editions; the parity test
// compares computed styles of every [data-slot] element per section.
// Keep this file and its other-edition twin in sync, except for APIs that
// differ by edition (asChild in Radix, render in Base UI).
function Parity({ id, children }: { id: string; children: React.ReactNode }) {
  return (
    <section data-parity={id} className="specimen">
      <button type="button" data-parity-start={id}>
        Start {id}
      </button>
      {children}
    </section>
  )
}

export default function EditionScenario() {
  const [ready, setReady] = React.useState(false)
  React.useEffect(() => {
    const dark = new URLSearchParams(window.location.search).get('mode') === 'dark'
    document.documentElement.classList.toggle('dark', dark)
    document.documentElement.style.colorScheme = dark ? 'dark' : 'light'
    setReady(true)
  }, [])
  return (
    <main data-ready={String(ready)}>
      <Parity id="button">
        <div className="actions">
          <Button>Save</Button>
          <Button variant="secondary">Secondary</Button>
          <Button variant="destructive">Delete</Button>
          <Button variant="outline">Outline</Button>
          <Button variant="ghost">Ghost</Button>
          <Button variant="link">Link</Button>
          <Button size="sm">Small</Button>
          <Button size="lg">Large</Button>
          <Button size="icon" aria-label="Add">+</Button>
          <Button disabled>Disabled</Button>
          <Button loading>Saving</Button>
        </div>
      </Parity>
      <Parity id="separator">
        <Separator />
        <Separator decorative={false} />
        <Separator>or</Separator>
        <nav aria-label="Footer" className="actions">
          <a href="#docs">Docs</a>
          <Separator orientation="vertical" />
          <a href="#changelog">Changelog</a>
        </nav>
      </Parity>
      <Parity id="progress">
        <p id="install-label">Installing components</p>
        <Progress value={64} aria-labelledby="install-label" />
        <Progress value={100} aria-label="Installed" />
        <Progress value={0} aria-label="Queued" />
        <Progress aria-label="Checking contrast" />
      </Parity>
      <Parity id="avatar">
        <Avatar size="lg" variant="primary" role="img" aria-label="Ada Lovelace, online">
          <AvatarFallback>AL</AvatarFallback>
          <AvatarStatus />
        </Avatar>
        <Avatar size="sm" role="img" aria-label="Grace Hopper, offline">
          <AvatarFallback>GH</AvatarFallback>
          <AvatarStatus status="offline" />
        </Avatar>
        <AvatarGroup aria-label="Reviewers">
          <Avatar role="img" aria-label="Grace Hopper">
            <AvatarFallback>GH</AvatarFallback>
          </Avatar>
          <Avatar variant="secondary" role="img" aria-label="3 more reviewers">
            <AvatarFallback>+3</AvatarFallback>
          </Avatar>
        </AvatarGroup>
      </Parity>
      <Parity id="switch">
        <label className="field">
          Notifications
          <Switch name="notifications" />
        </label>
        <label className="field">
          Sync
          <Switch defaultChecked name="sync" />
        </label>
        <label className="field">
          Locked off
          <Switch disabled name="locked-off" />
        </label>
        <label className="field">
          Locked on
          <Switch disabled defaultChecked name="locked-on" />
        </label>
      </Parity>
      <Parity id="checkbox">
        <label htmlFor="terms">Accept terms</label>
        <Checkbox id="terms" name="terms" value="accepted" required aria-invalid="true" aria-describedby="terms-error" />
        <p id="terms-error">Accept the terms to continue.</p>
        <label htmlFor="news">Newsletter</label>
        <Checkbox id="news" defaultChecked />
        <label htmlFor="selection">Select all items</label>
        <Checkbox id="selection" defaultChecked="indeterminate" />
        <label htmlFor="locked">Locked</label>
        <Checkbox id="locked" disabled defaultChecked />
      </Parity>
      <Parity id="radio-group">
        <p id="plan-label">Plan</p>
        <RadioGroup defaultValue="team" aria-labelledby="plan-label">
          <RadioGroupOption>
            <RadioGroupItem value="starter" />
            <span>
              <RadioGroupOptionLabel>Starter</RadioGroupOptionLabel>
              <RadioGroupOptionDescription>One project</RadioGroupOptionDescription>
            </span>
          </RadioGroupOption>
          <RadioGroupOption>
            <RadioGroupItem value="team" />
            <span>
              <RadioGroupOptionLabel>Team</RadioGroupOptionLabel>
              <RadioGroupOptionDescription>Unlimited projects</RadioGroupOptionDescription>
            </span>
          </RadioGroupOption>
          <RadioGroupOption>
            <RadioGroupItem value="enterprise" disabled />
            <span>
              <RadioGroupOptionLabel>Enterprise</RadioGroupOptionLabel>
              <RadioGroupOptionDescription>Contact sales to enable</RadioGroupOptionDescription>
            </span>
          </RadioGroupOption>
        </RadioGroup>
      </Parity>
      <Parity id="tabs">
        <Tabs defaultValue="overview">
          <TabsList aria-label="Project sections">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="activity">Activity</TabsTrigger>
            <TabsTrigger value="settings" disabled>Settings</TabsTrigger>
          </TabsList>
          <TabsContent value="overview">Project overview.</TabsContent>
          <TabsContent value="activity">Recent activity.</TabsContent>
        </Tabs>
        <Tabs defaultValue="general" orientation="vertical">
          <TabsList aria-label="Settings sections">
            <TabsTrigger value="general">General</TabsTrigger>
            <TabsTrigger value="billing">Billing</TabsTrigger>
          </TabsList>
          <TabsContent value="general">General settings.</TabsContent>
          <TabsContent value="billing">Billing settings.</TabsContent>
        </Tabs>
      </Parity>
      <Parity id="accordion">
        <Accordion type="single" collapsible defaultValue="preset">
          <AccordionItem value="preset">
            <AccordionTrigger>What does a preset change?</AccordionTrigger>
            <AccordionContent>Colors, radius, borders, shadows and type.</AccordionContent>
          </AccordionItem>
          <AccordionItem value="edit">
            <AccordionTrigger>Can I edit installed components?</AccordionTrigger>
            <AccordionContent>Yes. Installed source stays yours to edit.</AccordionContent>
          </AccordionItem>
          <AccordionItem value="locked" disabled>
            <AccordionTrigger>Locked question</AccordionTrigger>
            <AccordionContent>Unavailable.</AccordionContent>
          </AccordionItem>
        </Accordion>
      </Parity>
    </main>
  )
}
