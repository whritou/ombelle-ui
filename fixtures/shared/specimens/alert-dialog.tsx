'use client'
import { Button } from '@/components/ui/button'
import { AlertDialog, AlertDialogTrigger, AlertDialogContent, AlertDialogHeader, AlertDialogFooter, AlertDialogTitle, AlertDialogDescription, AlertDialogCancel, AlertDialogAction, AlertDialogMedia, AlertDialogConfirmInput } from '@/components/ui/alert-dialog'

export function Specimen() {
  return (
    <section aria-label="Alert Dialog" data-component="alert-dialog">
      <h2>Alert Dialog</h2><AlertDialog><AlertDialogTrigger asChild><Button variant="destructive">Delete project</Button></AlertDialogTrigger><AlertDialogContent>
        <AlertDialogHeader><AlertDialogMedia tone="destructive" /><AlertDialogTitle>Delete this project?</AlertDialogTitle><AlertDialogDescription>This preview does not delete any data.</AlertDialogDescription></AlertDialogHeader>
        <AlertDialogConfirmInput expected="website-refresh" />
        <AlertDialogFooter><AlertDialogCancel>Cancel</AlertDialogCancel><AlertDialogAction>Delete project</AlertDialogAction></AlertDialogFooter>
      </AlertDialogContent></AlertDialog>
    </section>
  )
}
