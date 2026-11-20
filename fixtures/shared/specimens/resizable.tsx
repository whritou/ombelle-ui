'use client'
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from '@/components/ui/resizable'

export function Specimen() {
  return (
    <section aria-label="Resizable" data-component="resizable">
      <h2>Resizable</h2>
      <div style={{ blockSize: '10rem', border: '1px solid var(--border)' }}>
        <ResizablePanelGroup direction="horizontal">
          <ResizablePanel defaultSize="60%" minSize="20%"><div style={{ padding: '1rem' }}>Preview</div></ResizablePanel>
          <ResizableHandle withHandle aria-label="Resize preview and controls" />
          <ResizablePanel defaultSize="40%" minSize="20%"><div style={{ padding: '1rem' }}>Controls</div></ResizablePanel>
        </ResizablePanelGroup>
      </div>
    </section>
  )
}
