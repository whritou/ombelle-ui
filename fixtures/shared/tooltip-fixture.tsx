'use client'
import * as React from 'react'
import { Button } from '@/components/ui/button'
import {
  TooltipProvider,
  Tooltip,
  TooltipTrigger,
  TooltipContent,
  TooltipArrow,
} from '@/components/ui/tooltip'

// Tooltip's slot owns focus styling; the composing caller supplies target size.
const helpTarget = {
  minHeight: 44,
  padding: '8px 12px',
  border: '1px solid var(--border)',
  borderRadius: 'var(--radius)',
}

export function TooltipFixture() {
  const [forcedOpen, setForcedOpen] = React.useState(false)
  const [direction, setDirection] = React.useState<'ltr' | 'rtl'>('ltr')
  return (
    <section
      data-testid="tooltip-fixture"
      aria-label="Tooltip examples"
      dir={direction}
      style={{ display: 'grid', gap: 24, marginTop: 24, maxWidth: 600 }}
    >
      <h2>Descriptive help</h2>
      <TooltipProvider delayDuration={100}>
        <div className="actions">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="outline" style={helpTarget}>About review windows</Button>
            </TooltipTrigger>
            <TooltipContent data-testid="tooltip-content">
              Reviews close after two working days.
              <TooltipArrow />
            </TooltipContent>
          </Tooltip>
          <Tooltip open={forcedOpen} onOpenChange={setForcedOpen}>
            <TooltipTrigger asChild>
              <Button variant="outline" style={helpTarget}>About saved views</Button>
            </TooltipTrigger>
            <TooltipContent forceMount data-testid="tooltip-forced-content" style={{ display: forcedOpen ? undefined : 'none' }}>
              Saved views stay on this device.
            </TooltipContent>
          </Tooltip>
        </div>
      </TooltipProvider>
      <Button variant="outline" onClick={() => setDirection(direction === 'ltr' ? 'rtl' : 'ltr')}>
        Use {direction === 'ltr' ? 'right-to-left' : 'left-to-right'} layout
      </Button>
    </section>
  )
}
