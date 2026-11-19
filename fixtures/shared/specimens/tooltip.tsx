'use client'
import { Button } from '@/components/ui/button'
import { TooltipProvider, Tooltip, TooltipTrigger, TooltipContent, TooltipArrow, TooltipShortcut, ariaKeyShortcuts } from '@/components/ui/tooltip'

export function Specimen() {
  return (
    <section aria-label="Help" data-component="tooltip">
      <h2>Help</h2>
      <TooltipProvider delayDuration={300}>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="outline">Preview help</Button>
          </TooltipTrigger>
          <TooltipContent>
            Inspect your components in both color modes.
            <TooltipArrow />
          </TooltipContent>
        </Tooltip>
        <div data-component="tooltip~shortcut">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="outline" aria-keyshortcuts={ariaKeyShortcuts(['Ctrl', 'Z'])}>Undo</Button>
            </TooltipTrigger>
            <TooltipContent>
              Undo the last change
              <TooltipShortcut keys={['Ctrl', 'Z']} />
              <TooltipArrow />
            </TooltipContent>
          </Tooltip>
        </div>
      </TooltipProvider>
    </section>
  )
}
