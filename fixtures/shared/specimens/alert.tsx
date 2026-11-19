'use client'
import { Button } from '@/components/ui/button'
import { Alert, AlertActions, AlertTitle, AlertDescription } from '@/components/ui/alert'

export function Specimen() {
  return (
    <section aria-label="Messages" data-component="alert">
      <h2>Messages</h2>
      <div className="preset-stack">
        <Alert>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <circle cx="12" cy="12" r="10" />
            <path d="M12 16v-4M12 8h.01" />
          </svg>
          <AlertTitle>Preset saved</AlertTitle>
          <AlertDescription>
            New components in this project now use your preset.
          </AlertDescription>
        </Alert>
        <Alert variant="destructive">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="m21.7 18-8-14a2 2 0 0 0-3.5 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.7-3Z" />
            <path d="M12 9v4M12 17h.01" />
          </svg>
          <AlertTitle>Install blocked</AlertTitle>
          <AlertDescription>
            button.tsx was edited locally. Review the change before replacing
            it.
          </AlertDescription>
        </Alert>
        <Alert variant="success"><AlertTitle>Saved</AlertTitle><AlertDescription>Your changes are ready.</AlertDescription></Alert>
        <Alert variant="warning"><AlertTitle>Review needed</AlertTitle><AlertDescription>Two items need your attention.</AlertDescription></Alert>
        <Alert variant="info"><AlertTitle>New version</AlertTitle><AlertDescription>A component update is available.</AlertDescription>
          <AlertActions><Button size="sm">Update</Button><Button size="sm" variant="outline">Release notes</Button></AlertActions></Alert>
        <Alert variant="warning" layout="compact"><AlertDescription>One seat left on the Team plan.</AlertDescription><a href="#upgrade">Upgrade</a></Alert>
      </div>
    </section>
  )
}
