'use client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Popover, PopoverTrigger, PopoverContent, PopoverArrow, PopoverTitle, PopoverDescription } from '@/components/ui/popover'
import { useGate } from './shared'

export function Specimen() {
  const gate = useGate()
  return (
    <section aria-label="Sharing" data-component="popover">
      <h2>Sharing</h2>
      <Popover>
        <PopoverTrigger asChild>
          <Button>Share preset</Button>
        </PopoverTrigger>
        <PopoverContent align="start" aria-labelledby="preset-share-title">
          <PopoverArrow />
          <PopoverTitle id="preset-share-title">Share preset</PopoverTitle>
          <PopoverDescription>
            Anyone with the link can install this preset.
          </PopoverDescription>
          {gate(
            'input',
            'Input',
            <Input aria-label="Preset link" defaultValue="ombelle.dev/p/7f3a2c" readOnly />,
          )}
        </PopoverContent>
      </Popover>
    </section>
  )
}
