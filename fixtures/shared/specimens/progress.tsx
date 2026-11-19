'use client'
import { Button } from '@/components/ui/button'
import { Progress, ProgressLabel, ProgressValue } from '@/components/ui/progress'

export function Specimen() {
  return (
    <section aria-label="Progress" data-component="progress">
      <h2>Progress</h2>
      <div className="preset-stack">
        <div className="preset-progress-label">
          <span id="preset-progress-install">Installing components</span>
          <span>64%</span>
        </div>
        <Progress value={64} aria-labelledby="preset-progress-install" />
        <div data-component="progress~labelled">
          <Progress value={40} size="sm" tone="warning">
            <ProgressLabel>Consumer matrix, 16 of 40</ProgressLabel>
            <ProgressValue />
          </Progress>
        </div>
        <div className="preset-row">
          <div data-component="progress~circle">
            <Progress shape="circle" size="lg" value={64} aria-label="Uploading preset"><ProgressValue /></Progress>
          </div>
          <div data-component="progress~circle-sm">
            <Button variant="outline" size="sm" aria-disabled="true" aria-busy="true"><Progress shape="circle" size="sm" value={40} aria-label="Saving" />Saving</Button>
          </div>
        </div>
        <div className="preset-progress-label">
          <span id="preset-progress-contrast">Contrast checks</span>
          <span>8 / 8</span>
        </div>
        <Progress value={8} max={8} aria-labelledby="preset-progress-contrast" />
        <div className="preset-progress-label">
          <span id="preset-progress-sync">Syncing presets</span>
        </div>
        <Progress aria-labelledby="preset-progress-sync" />
      </div>
    </section>
  )
}
