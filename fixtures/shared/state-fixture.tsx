import * as React from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Dialog, DialogTrigger, DialogContent, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import './state-fixture.css'
export function StateFixture() {
 const [activations,setActivations]=React.useState(0)
 return <section className="state-fixture" data-testid="state-fixture" aria-label="Component states">
  <h2>Component states</h2>
  <div className="state-actions">{(['default','secondary','outline','ghost','link','destructive'] as const).map(variant=><Button key={variant} variant={variant} data-testid={'variant-'+variant}>{variant} action</Button>)}</div>
  <div className="state-actions">{(['sm','default','lg','icon'] as const).map(size=><Button key={size} size={size} data-testid={'size-'+size} aria-label={size+' action'}>{size==='icon'?'＋':size+' size'}</Button>)}</div>
  <Button disabled data-testid="disabled-button" onClick={()=>setActivations(v=>v+1)}>Unavailable action</Button><output data-testid="activation-count">Activations: {activations}</output>
  <label htmlFor="empty-input">Empty field</label><Input id="empty-input" data-testid="empty-input" placeholder="Enter a value" />
  <label htmlFor="filled-input">Filled field</label><Input id="filled-input" data-testid="filled-input" defaultValue="A saved value" />
  <label htmlFor="invalid-input">Invalid field</label><Input id="invalid-input" data-testid="invalid-input" aria-invalid="true" aria-describedby="invalid-input-error" defaultValue="Not an email" />
  <p id="invalid-input-error" className="state-error">Enter a valid email address.</p>
  <label htmlFor="disabled-input">Disabled field</label><Input id="disabled-input" data-testid="disabled-input" disabled defaultValue="Unavailable" />
  <Dialog><DialogTrigger asChild><Button variant="outline" data-testid="state-dialog-trigger">Open state dialog</Button></DialogTrigger><DialogContent className="state-dialog"><DialogTitle>Review component states</DialogTitle><DialogDescription>Read the details and confirm your choice.</DialogDescription><Button data-testid="state-dialog-accept">Accept state dialog</Button>{Array.from({length:12},(_,i)=><p key={i}>Detail {i+1}: This deliberately long description checks that enlarged text and dialog controls remain reachable without hiding essential content.</p>)}</DialogContent></Dialog>
 </section>
}
