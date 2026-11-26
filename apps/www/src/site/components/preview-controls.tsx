'use client'

import * as Tooltip from '@radix-ui/react-tooltip'
import { Moon, Sun } from 'lucide-react'
import type { StyleFamily } from '@ombelle/contracts'
import { offeredStyleFamilies } from '../../snapshots/install-command'
import { Toggle } from '../../generated/ui/components/ui/toggle'
import sampleStyles from './playground.module.css'

// The controls the component and block previews share: family tiles, segmented pills and the light or dark toggle.

// Exhaustive by type: adding a style family fails the typecheck until it has a label.
export const familyLabels: Record<StyleFamily, string> = {
  flat: 'Flat',
  minimalist: 'Minimalist',
  'neo-brutalism': 'Neo-Brutalism',
  ombelle: 'Ombelle',
  papier: 'Papier',
  organic: 'Organic',
  'retro-futurism': 'Retro futurism',
  'liquid-glass': 'Liquid Glass',
}
// Same gate as the editors: only families the published installer can install.
export const familyOptions: { value: StyleFamily; label: string }[] = offeredStyleFamilies().map((value) => ({
  value,
  label: familyLabels[value],
}))
export const glassDocs = '/docs/style-families#liquid-glass'

// Segmented pills, like the rest of the site: a quiet track and a filled primary pill for the choice.
export const pillTrack = 'inline-flex items-center gap-1 rounded-full border border-border bg-background p-1'
export const pillItem = 'inline-flex min-h-9 shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full px-3.5 text-sm font-semibold text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring disabled:cursor-not-allowed disabled:hover:bg-transparent disabled:line-through disabled:hover:text-muted-foreground'
// Each style family is a tile with a sample of its look, as in the editors; four to a row, or one row that scrolls on a phone.
export const familyTrack = 'flex gap-2 overflow-x-auto p-0.5 sm:grid sm:grid-cols-4 sm:overflow-visible'
export const familyTile = 'flex min-w-[7.5rem] shrink-0 flex-col items-start gap-2 rounded-xl border border-border bg-background px-3 py-2.5 text-left text-sm font-semibold text-foreground transition-colors hover:border-foreground/40 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring disabled:cursor-not-allowed disabled:opacity-60 disabled:line-through data-[state=on]:border-primary data-[state=on]:bg-accent data-[state=on]:ring-1 data-[state=on]:ring-primary sm:min-w-0 sm:shrink'
export const toggleItem = pillItem + ' data-[state=on]:bg-primary data-[state=on]:text-primary-foreground data-[state=on]:hover:bg-primary data-[state=on]:hover:text-primary-foreground'
export const tabClass = pillItem + ' data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:hover:bg-primary data-[state=active]:hover:text-primary-foreground'

/** A family tile's decorative sample of its look: two mini buttons. */
export function FamilySample({ family }: { family: StyleFamily }) {
  return <span className={sampleStyles.sample} data-family={family} aria-hidden="true"><i /><i /></span>
}

/** One button for the preview's light or dark mode: its icon is the mode it switches to, as in the header. */
export function ModeToggle({ mode, onChange }: { mode: 'light' | 'dark'; onChange: (mode: 'light' | 'dark') => void }) {
  const dark = mode === 'dark'
  return (
    <Tooltip.Provider delayDuration={150}>
      <Tooltip.Root>
        <Tooltip.Trigger asChild>
          <Toggle variant="outline" size="sm" aria-label="Dark preview" pressed={dark} onPressedChange={next => onChange(next ? 'dark' : 'light')}>
            {dark ? <Sun className="size-4" aria-hidden="true" /> : <Moon className="size-4" aria-hidden="true" />}
          </Toggle>
        </Tooltip.Trigger>
        <Tooltip.Portal>
          <Tooltip.Content sideOffset={8} className="z-50 rounded-md bg-foreground px-2.5 py-1.5 text-xs font-semibold text-background shadow-md">
            {dark ? 'Switch to the light preview' : 'Switch to the dark preview'}
            <Tooltip.Arrow className="fill-foreground" />
          </Tooltip.Content>
        </Tooltip.Portal>
      </Tooltip.Root>
    </Tooltip.Provider>
  )
}
