'use client'

import * as SwitchPrimitive from '@radix-ui/react-switch'
import { ArrowRight, Check, Sparkles } from 'lucide-react'
import { useId, useState } from 'react'
import { ToggleGroup } from '../toggle-group'

export type StyleKey = 'flat' | 'minimal' | 'brutal'
export const STYLES: { value: StyleKey; label: string }[] = [
  { value: 'flat', label: 'Flat' },
  { value: 'minimal', label: 'Minimalist' },
  { value: 'brutal', label: 'Neo-Brutalism' },
]

export function StyleSelector({ value, onChange }: { value: StyleKey; onChange: (v: StyleKey) => void }) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <ToggleGroup
        label="Component style"
        value={value}
        options={STYLES}
        onValueChange={onChange}
        className="inline-flex rounded-full border border-border bg-card p-1 shadow-soft"
        itemClassName="min-h-10 rounded-full px-3 text-sm font-semibold sm:px-4 text-muted-foreground transition-colors hover:text-foreground data-[state=on]:bg-foreground data-[state=on]:text-background"
      />
      <span className="o-glass inline-flex min-h-10 items-center gap-1.5 rounded-full px-4 text-sm font-semibold text-muted-foreground">
        <Sparkles className="size-3.5 text-primary" aria-hidden /> Liquid Glass
        <span className="font-mono text-[10px] uppercase tracking-wider">coming soon</span>
      </span>
    </div>
  )
}

const PLANS = [
  { value: 'solo', label: 'Solo' },
  { value: 'team', label: 'Team' },
  { value: 'studio', label: 'Studio' },
] as const
type Plan = (typeof PLANS)[number]['value']

/** Illustrative demo form; nothing is sent anywhere. */
export function HeroComposition({ style, compact = false }: { style: StyleKey; compact?: boolean }) {
  const id = useId()
  const [plan, setPlan] = useState<Plan>('team')
  const [notify, setNotify] = useState(true)
  const [sent, setSent] = useState(false)

  return (
    <div data-style={style} className="o-kit relative grid gap-4 sm:grid-cols-5">
      <div className={`o-card p-5 ${compact ? 'sm:col-span-5 lg:col-span-3' : 'sm:col-span-3'}`}>
        <div className="flex items-center justify-between">
          <p className="font-display text-lg font-bold">Create workspace</p>
          <span className="o-badge o-badge-dot">Step 1/2</span>
        </div>
        <form
          className="mt-4 space-y-3"
          onSubmit={e => {
            e.preventDefault()
            setSent(true)
          }}
        >
          <label htmlFor={`${id}-name`} className="block text-xs font-semibold text-muted-foreground">Workspace name</label>
          <input id={`${id}-name`} className="o-input" placeholder="acme-design" />
          <ToggleGroup
            label="Plan"
            value={plan}
            options={PLANS}
            onValueChange={setPlan}
            className="o-tabs"
            itemClassName="o-tab"
            activeState="active"
          />
          <div className="flex items-center justify-between pt-1">
            <label htmlFor={`${id}-notify`} className="text-sm">Email me updates</label>
            <SwitchPrimitive.Root id={`${id}-notify`} checked={notify} onCheckedChange={setNotify} className="o-switch">
              <SwitchPrimitive.Thumb asChild><span /></SwitchPrimitive.Thumb>
            </SwitchPrimitive.Root>
          </div>
          <div className="flex gap-2 pt-2">
            <button type="submit" className="o-btn o-btn-primary flex-1">
              {sent ? <><Check className="size-4" aria-hidden /> Created</> : <>Continue <ArrowRight className="size-4" aria-hidden /></>}
            </button>
            <button type="button" onClick={() => setSent(false)} className="o-btn o-btn-ghost">Reset</button>
          </div>
        </form>
      </div>
      <div className={`flex-col gap-4 sm:col-span-2 ${compact ? 'hidden lg:flex' : 'flex'}`}>
        <div className="o-card p-5">
          <p className="text-xs font-semibold text-muted-foreground">Accessibility</p>
          <p className="mt-1 font-display text-3xl font-extrabold">WAI-ARIA</p>
          <p className="mt-1 text-xs text-muted-foreground">Keyboard, focus and roles from Radix.</p>
        </div>
        <div className="o-card flex flex-wrap gap-2 p-5">
          <span className="o-badge">Radix</span>
          <span className="o-badge o-badge-muted o-badge-dot">shadcn</span>
          <span className="o-badge o-badge-muted o-badge-dot">Tailwind v4</span>
          <span className="o-badge o-badge-muted o-badge-dot">TypeScript</span>
        </div>
      </div>
    </div>
  )
}
