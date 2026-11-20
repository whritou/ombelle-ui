'use client'
import { Button } from '@/components/ui/button'
import { Dialog, DialogTrigger, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'

export function Specimen() {
  return (
    <section aria-label="Dialog" data-component="dialog">
      <h2>Dialog</h2>
      <Dialog>
        <DialogTrigger asChild>
          <Button variant="outline">Open dialog</Button>
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Ready to publish?</DialogTitle>
            <DialogDescription>
              This is a preview. Your preset stays on this device until you
              download it.
            </DialogDescription>
          </DialogHeader>
          <p className="preset-dialog-copy">
            Review your choices and close this dialog to continue editing.
          </p>
        </DialogContent>
      </Dialog>
    </section>
  )
}
