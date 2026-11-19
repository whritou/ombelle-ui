'use client'
import { Button } from '@/components/ui/button'
import { Sheet, SheetTrigger, SheetContent, SheetHandle, SheetHeader, SheetTitle, SheetDescription, SheetFooter, SheetClose } from '@/components/ui/sheet'

export function Specimen() {
  return (
    <section aria-label="Sheet" data-component="sheet">
      <h2>Sheet</h2><Sheet><SheetTrigger asChild><Button variant="outline">Open details</Button></SheetTrigger><SheetContent>
        <SheetHeader><SheetTitle>Project details</SheetTitle><SheetDescription>Review the current project.</SheetDescription></SheetHeader>
        <p>Your project is ready to review.</p><SheetFooter><SheetClose asChild><Button>Done</Button></SheetClose></SheetFooter>
      </SheetContent></Sheet>
      <div data-component="sheet~snap"><Sheet><SheetTrigger asChild><Button variant="outline">Open filters</Button></SheetTrigger>
        <SheetContent side="bottom" snapPoints={[0.5, 0.9]}><SheetHandle label="Resize Filters" />
          <SheetHeader><SheetTitle>Filters</SheetTitle><SheetDescription>Settles on 0.5 or 0.9 when released.</SheetDescription></SheetHeader>
          <SheetFooter><SheetClose asChild><Button variant="outline" size="sm">Forms</Button></SheetClose><SheetClose asChild><Button variant="outline" size="sm">Overlays</Button></SheetClose></SheetFooter>
        </SheetContent></Sheet></div>
    </section>
  )
}
