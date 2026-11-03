'use client'

import * as TabsPrimitive from '@radix-ui/react-tabs'
import { Check, Copy, FlaskConical, Minus } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { styleSupport } from '@ombelle/contracts'
import { ToggleGroup } from '../toggle-group'

/** Copies text, showing a check for a moment; failures leave the text selectable. */
export function useCopy() {
  const [copied, setCopied] = useState(false)
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined)
  useEffect(() => () => clearTimeout(timer.current), [])
  const copy = (text: string) => {
    navigator.clipboard?.writeText(text).then(() => {
      setCopied(true)
      clearTimeout(timer.current)
      timer.current = setTimeout(() => setCopied(false), 1500)
    }, () => {})
  }
  return { copied, copy }
}

/* ------------------------------------------------------------------ */
/* Component × style matrix                                            */
/* ------------------------------------------------------------------ */
type Status = 'stable' | 'experimental' | 'unavailable'
// Rows follow docs/03-components-styles-accessibility.md; the glass column
// reads the contracts' compatibility table (docs/components/liquid-glass.md).
const COMPONENTS = [
  { id: 'button', name: 'Button', api: 'variant, size, loading', states: 'Default, hover, focus, pressed, disabled, loading', basis: '<button> or valid link' },
  { id: 'badge', name: 'Badge', api: 'variant, className', states: 'Default, destructive', basis: '<span>' },
  { id: 'card', name: 'Card', api: 'Root, Header, Title, Description, Content, Footer', states: 'Default, dense', basis: '<section> or <div> with headings' },
  { id: 'input', name: 'Input', api: 'Native input props, invalid, disabled', states: 'Empty, filled, focus, invalid, disabled', basis: '<input>' },
  { id: 'textarea', name: 'Textarea', api: 'Native textarea props', states: 'Empty, filled, focus, invalid, disabled', basis: '<textarea>' },
  { id: 'label', name: 'Label', api: 'Association, native label props', states: 'Default, required', basis: '<label>' },
  { id: 'checkbox', name: 'Checkbox', api: 'checked, mixed, disabled, onChange', states: 'Unchecked, checked, mixed, focus, invalid', basis: 'Primitive with form behavior' },
  { id: 'switch', name: 'Switch', api: 'checked, onCheckedChange', states: 'Off, on, focus, disabled', basis: 'Primitive with switch role' },
  { id: 'native-select', name: 'Native Select', api: 'Native select props, options', states: 'Default, selected, focus, invalid, disabled', basis: '<select>' },
  { id: 'dialog', name: 'Dialog', api: 'Trigger, Content, Title, Description, Close', states: 'Open, closed, scroll, focus return', basis: 'Reviewed dialog primitive' },
  { id: 'tabs', name: 'Tabs', api: 'Root, List, Trigger, Content, orientation', states: 'Active, inactive, focus, disabled', basis: 'Reviewed tabs primitive' },
  { id: 'tooltip', name: 'Tooltip', api: 'Provider, Trigger, Content', states: 'Keyboard, hover, dismissal', basis: 'Reviewed tooltip primitive' },
] as const
const COLS = ['Flat', 'Minimalist', 'Neo-Brutalism', 'Liquid Glass']

function StatusDot({ s }: { s: Status }) {
  if (s === 'stable') return <span className="inline-flex size-7 items-center justify-center rounded-full bg-primary text-primary-foreground"><Check className="size-3.5" aria-hidden /><span className="sr-only">Stable</span></span>
  if (s === 'experimental') return <span className="o-glass inline-flex size-7 items-center justify-center rounded-full text-primary"><FlaskConical className="size-3.5" aria-hidden /><span className="sr-only">Experimental</span></span>
  return <span className="inline-flex size-7 items-center justify-center rounded-full border border-dashed border-muted-foreground/60 text-muted-foreground"><Minus className="size-3.5" aria-hidden /><span className="sr-only">Not available</span></span>
}

export function MatrixSection() {
  const [sel, setSel] = useState(0)
  const c = COMPONENTS[sel] ?? COMPONENTS[0]
  return (
    <section aria-labelledby="matrix" className="mx-auto max-w-6xl px-5 py-20 md:py-28">
      <div className="grid gap-6 md:grid-cols-[1fr_1fr] md:items-end">
        <div>
          <p className="font-mono text-xs uppercase tracking-[0.2em] text-primary">The alpha catalogue</p>
          <h2 id="matrix" className="mt-3 text-4xl font-black md:text-5xl">12 components.<br />An honest matrix.</h2>
        </div>
        <p className="max-w-md text-muted-foreground md:justify-self-end">
          We don&apos;t claim every combination works. Each component × style pair carries a published status — and stable is earned through testing, not assumed. Liquid glass is experimental, and manual screen-reader review is still pending for every family.
        </p>
      </div>
      <div className="mt-12 grid gap-6 lg:grid-cols-[1.4fr_1fr]">
        <div className="relative min-w-0 overflow-x-auto rounded-2xl border border-border bg-card">
          <table className="w-full min-w-[520px] text-sm">
            <caption className="sr-only">Component support by style family. Select a component for its contract.</caption>
            <thead>
              <tr className="border-b border-border">
                <th scope="col" className="px-4 py-3 text-left font-mono text-[11px] uppercase tracking-wider text-muted-foreground">Component</th>
                {COLS.map(h => <th key={h} scope="col" className="px-2 py-3 text-center font-mono text-[11px] uppercase tracking-wider text-muted-foreground">{h}</th>)}
              </tr>
            </thead>
            <tbody>
              {COMPONENTS.map((row, i) => (
                <tr key={row.name} className={`border-b border-border transition-colors last:border-0 ${i === sel ? 'bg-accent' : 'hover:bg-muted'}`}>
                  <th scope="row" className="p-0 text-left">
                    <button type="button" onClick={() => setSel(i)} aria-pressed={i === sel} className="w-full px-4 py-2.5 text-left font-semibold">
                      {row.name}
                    </button>
                  </th>
                  {[0, 1, 2].map(k => <td key={k} className="text-center"><StatusDot s="stable" /></td>)}
                  <td className="text-center"><StatusDot s={styleSupport(row.id, 'liquid-glass')} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <aside aria-live="polite" aria-label="Component contract" className="flex flex-col rounded-2xl border border-border bg-background p-6 lg:sticky lg:top-24 lg:self-start">
          <p className="font-mono text-xs uppercase tracking-wider text-muted-foreground">Component contract</p>
          <h3 className="mt-2 text-3xl font-black">{c.name}</h3>
          <dl className="mt-6 space-y-4 text-sm">
            <div><dt className="font-mono text-[11px] uppercase tracking-wider text-muted-foreground">API</dt><dd className="mt-1 font-mono text-foreground">{c.api}</dd></div>
            <div><dt className="font-mono text-[11px] uppercase tracking-wider text-muted-foreground">Minimum states</dt><dd className="mt-1 flex flex-wrap gap-1.5">{c.states.split(', ').map(s => <span key={s} className="rounded-md bg-muted px-2 py-0.5 text-xs">{s}</span>)}</dd></div>
            <div><dt className="font-mono text-[11px] uppercase tracking-wider text-muted-foreground">Native basis</dt><dd className="mt-1">{c.basis}</dd></div>
          </dl>
          <div className="mt-6 flex flex-wrap gap-4 border-t border-border pt-4 text-xs text-muted-foreground">
            <span className="inline-flex items-center gap-2"><StatusDot s="stable" /> Stable target</span>
            <span className="inline-flex items-center gap-2"><StatusDot s="experimental" /> Experimental</span>
            <span className="inline-flex items-center gap-2"><StatusDot s="unavailable" /> Not available</span>
          </div>
        </aside>
      </div>
    </section>
  )
}

/* ------------------------------------------------------------------ */
/* Token cascade (docs/03, "Token layers and override order")          */
/* ------------------------------------------------------------------ */
const LAYERS = [
  { name: 'Foundation defaults', who: 'Versioned spacing & type', value: '0.5rem' },
  { name: 'Style family', who: 'Neo-Brutalism defaults', value: '0.25rem' },
  { name: 'Project preset', who: 'ui-preset.json · light & dark', value: '0.375rem' },
  { name: 'Component defaults', who: 'Button defaults in the preset', value: '0.5rem' },
  { name: 'Scoped recipe', who: 'rc_primary-button', value: '999px' },
  { name: 'Your props & source', who: 'className, local edits', value: '0' },
]

export function CascadeSection() {
  const [on, setOn] = useState([true, true, true, true, false, false])
  const winner = on.lastIndexOf(true)
  const radius = winner >= 0 ? LAYERS[winner]!.value : '0.5rem'
  return (
    <section aria-labelledby="cascade" className="relative overflow-hidden border-y border-border bg-card">
      <div className="mx-auto grid max-w-6xl gap-12 px-5 py-20 md:py-28 lg:grid-cols-2 lg:items-center">
        <div>
          <p className="font-mono text-xs uppercase tracking-[0.2em] text-primary">Token cascade</p>
          <h2 id="cascade" className="mt-3 text-4xl font-black md:text-5xl">Six layers.<br />One predictable answer.</h2>
          <p className="mt-5 max-w-md text-muted-foreground">
            Every value resolves in a fixed order. Later layers replace only allow-listed tokens — unknown keys fail validation and accessibility rules sit outside the merge entirely. Toggle layers to watch <code className="font-mono text-foreground">--radius</code> resolve.
          </p>
          <div className="mt-10 flex items-center gap-6">
            <span aria-hidden className="inline-flex min-h-12 items-center bg-primary px-6 font-semibold text-primary-foreground transition-[border-radius] duration-500" style={{ borderRadius: radius }}>
              Resolved button
            </span>
            <code aria-live="polite" className="font-mono text-sm text-muted-foreground">--radius: <span className="text-primary">{radius}</span></code>
          </div>
        </div>
        <ol aria-label="Token layers, lowest first" className="flex flex-col-reverse gap-2">
          {LAYERS.map((l, i) => {
            const active = on[i]
            const wins = i === winner
            return (
              <li key={l.name} style={{ marginLeft: `${i * 14}px` }}>
                <button
                  type="button"
                  aria-pressed={active}
                  onClick={() => setOn(p => p.map((v, k) => (k === i ? !v : v)))}
                  className={`flex w-full items-center gap-4 rounded-xl border px-4 py-3 text-left transition-all ${wins ? 'border-primary bg-background shadow-soft' : active ? 'border-border bg-background' : 'border-dashed border-muted-foreground/40 bg-transparent'}`}
                >
                  <span className="font-mono text-xs text-muted-foreground">{String(i + 1).padStart(2, '0')}</span>
                  <span className="flex-1">
                    <span className="block font-semibold">{l.name}</span>
                    <span className="block text-xs text-muted-foreground">{l.who}</span>
                  </span>
                  <code className={`font-mono text-xs ${wins ? 'text-primary' : 'text-muted-foreground'}`}>{l.value}</code>
                </button>
              </li>
            )
          })}
        </ol>
      </div>
    </section>
  )
}

/* ------------------------------------------------------------------ */
/* CLI terminal                                                        */
/* ------------------------------------------------------------------ */
type PMKey = 'npm' | 'pnpm' | 'yarn' | 'bun'
const PMS: { value: PMKey; label: string }[] = [
  { value: 'npm', label: 'npm' },
  { value: 'pnpm', label: 'pnpm' },
  { value: 'yarn', label: 'yarn' },
  { value: 'bun', label: 'bun' },
]
const RUNNER: Record<PMKey, string> = { npm: 'npx', pnpm: 'pnpm dlx', yarn: 'yarn dlx --quiet', bun: 'bunx' }

const SCENARIOS = [
  {
    id: 'init', label: 'New setup',
    blurb: 'Detect the project, resolve the preset and plan config and CSS — nothing is written until you accept the plan.',
    cmd: 'init --preset ./project-preset.json --dry-run',
    out: ['✓ Detected Vite · React · Tailwind v4', '✓ Resolved preset project-preset.json (neo-brutalism, r1)', '~ plan  ui-preset.json  (saved project defaults)', '~ plan  managed token and style CSS', '~ plan  ui-library.lock.json', '◦ dry run — nothing written'],
  },
  {
    id: 'theme', label: 'Existing shadcn',
    blurb: 'Already ran shadcn init? Merge the palette and tokens into your global stylesheet without reinstalling components.',
    cmd: 'theme add ./project-preset.json --dry-run',
    out: ['✓ Found components.json · globals.css', '~ merge  palette and tokens into globals.css', '! Existing components using these variables will change', '= keep   installed component source', '◦ dry run — nothing written'],
  },
  {
    id: 'one', label: 'One button',
    blurb: 'Scope a preset to a single Button. Project defaults and other components stay untouched.',
    cmd: 'add button --preset ./brand.preset.json --dry-run',
    out: ['✓ Read local preset brand (flat, r2)', '+ plan  components/ui/presets/brand/r2/button.tsx', '= keep   project preset, theme and existing components', '◦ dry run — nothing written'],
  },
  {
    id: 'glass', label: 'Liquid glass',
    blurb: 'In a liquid glass project, experimental components install with a notice. Form controls are refused before anything is written.',
    cmd: 'add card tabs --dry-run',
    out: ['~ would create components/ui/card.tsx + card.css', '~ would create components/ui/tabs.tsx + tabs.css', '! Notice: liquid-glass is experimental for card, tabs; see docs/components/liquid-glass.md for limitations', '◦ dry run — nothing written'],
  },
  {
    id: 'dry', label: 'Dry run',
    blurb: 'Inspect every change first. Nothing is written to source, config, cache or dependencies.',
    cmd: 'add input dialog --dry-run',
    out: ['~ would create components/ui/input.tsx', '~ would create components/ui/dialog.tsx', '~ would add    @radix-ui/react-dialog', '◦ dry run — nothing written'],
  },
]

export function TerminalSection({ release }: { release: string }) {
  const [pm, setPm] = useState<PMKey>('pnpm')
  const [tab, setTab] = useState('theme')
  const { copied, copy } = useCopy()
  return (
    <section aria-labelledby="cli" className="mx-auto max-w-6xl px-5 py-20 md:py-28">
      <div className="grid gap-12 lg:grid-cols-[1fr_1.3fr] lg:items-start">
        <div className="lg:sticky lg:top-24">
          <p className="font-mono text-xs uppercase tracking-[0.2em] text-primary">The CLI</p>
          <h2 id="cli" className="mt-3 text-4xl font-black md:text-5xl">Your repo.<br />Your lockfile.<br />Your rules.</h2>
          <p className="mt-5 max-w-md text-muted-foreground">
            Components land as editable source. The CLI keeps your package manager, never takes ownership of your code, and previews every change before it touches disk.
          </p>
          <ToggleGroup
            label="Package runner"
            value={pm}
            options={PMS}
            onValueChange={setPm}
            className="mt-8 inline-flex rounded-full border border-border bg-card p-1"
            itemClassName="min-h-10 rounded-full px-4 font-mono text-xs text-muted-foreground data-[state=on]:bg-foreground data-[state=on]:text-background"
          />
        </div>
        <TabsPrimitive.Root value={tab} onValueChange={setTab} className="overflow-hidden rounded-2xl border border-border bg-ink text-paper shadow-soft dark:bg-card dark:text-card-foreground">
          <div className="flex items-center gap-2 border-b border-paper/10 px-4 py-3 dark:border-border">
            <span aria-hidden className="size-3 rounded-full bg-terminal-accent" /><span aria-hidden className="size-3 rounded-full bg-paper/20 dark:bg-muted" /><span aria-hidden className="size-3 rounded-full bg-paper/20 dark:bg-muted" />
            <TabsPrimitive.List aria-label="CLI scenarios" className="ml-3 flex flex-wrap gap-1">
              {SCENARIOS.map(x => (
                <TabsPrimitive.Trigger key={x.id} value={x.id} className="min-h-9 rounded-md px-3 font-mono text-xs text-paper/75 data-[state=active]:bg-paper/10 data-[state=active]:text-paper dark:text-muted-foreground dark:data-[state=active]:bg-muted dark:data-[state=active]:text-foreground">
                  {x.label}
                </TabsPrimitive.Trigger>
              ))}
            </TabsPrimitive.List>
          </div>
          {SCENARIOS.map(x => {
            const full = `${RUNNER[pm]} ${release} ${x.cmd}`
            return (
              <TabsPrimitive.Content key={x.id} value={x.id} className="p-5 font-mono text-sm">
                <p className="mb-4 font-sans text-sm text-paper/75 dark:text-muted-foreground">{x.blurb}</p>
                <div className="flex items-start gap-3">
                  <span aria-hidden className="text-terminal-accent">$</span>
                  <code className="flex-1 break-all">{full}<span aria-hidden className="animate-blink ml-0.5 inline-block h-4 w-2 translate-y-0.5 bg-terminal-accent" /></code>
                  <button
                    type="button"
                    aria-label="Copy command"
                    onClick={() => copy(full)}
                    className="inline-flex size-9 shrink-0 items-center justify-center rounded-md text-paper/75 hover:bg-paper/10 dark:text-muted-foreground dark:hover:bg-muted"
                  >
                    {copied ? <Check className="size-4" aria-hidden /> : <Copy className="size-4" aria-hidden />}
                  </button>
                </div>
                <ul aria-label="Example output" className="mt-4 space-y-1.5 text-xs leading-relaxed">
                  {x.out.map((line, i) => (
                    <li key={line} className="animate-line-in" style={{ animationDelay: `${i * 110}ms` }}>
                      <span className={line.startsWith('✓') || line.startsWith('!') ? 'text-terminal-accent' : 'text-paper/75 dark:text-muted-foreground'}>{line}</span>
                    </li>
                  ))}
                </ul>
                <p className="mt-5 font-sans text-xs text-paper/75 dark:text-muted-foreground">Summarised output. Add <code className="font-mono">--json</code> for the machine-readable plan, then run again with <code className="font-mono">--yes</code> to apply it.</p>
              </TabsPrimitive.Content>
            )
          })}
        </TabsPrimitive.Root>
      </div>
    </section>
  )
}

/* ------------------------------------------------------------------ */
/* Preset anatomy (schemas/preset.schema.json)                         */
/* ------------------------------------------------------------------ */
const FIELDS = [
  { k: 'schemaVersion', v: '"1.0"', d: 'Version of the JSON shape itself.' },
  { k: 'id', v: '"brand"', d: 'Readable identity. Never enough alone to reproduce a build.' },
  { k: 'revision', v: '2', d: 'Positive integer revision. A published code such as ps_…@1 always pins the same content.' },
  { k: 'catalogRelease', v: '"0.1.0"', d: 'Pins the exact component and style catalogue. No mutable remote defaults.' },
  { k: 'styleFamily', v: '"neo-brutalism"', d: 'Flat, minimalist, neo-brutalism, or the experimental liquid-glass.' },
  { k: 'modes', v: '{ light, dark }', d: 'Semantic token overrides per colour mode. Hex or numeric OKLCH only.' },
  { k: 'design', v: '{ radius, density, … }', d: 'Bounded radius, border, density, font and motion choices. Glass presets add transparency, blur and opacity.' },
  { k: 'componentDefaults', v: '{ button }', d: 'Reviewed per-component defaults. Button is the first schema entry.' },
]

export function PresetSection() {
  const [i, setI] = useState(4)
  return (
    <section aria-labelledby="preset" className="border-t border-border">
      <div className="mx-auto grid max-w-6xl gap-12 px-5 py-20 md:py-28 lg:grid-cols-[1.2fr_1fr] lg:items-center">
        <div className="min-w-0 overflow-x-auto rounded-2xl border border-border bg-card p-5 font-mono text-sm shadow-soft">
          <div className="mb-3 flex items-center justify-between text-xs text-muted-foreground"><span>brand.preset.json</span><span>portable · no account</span></div>
          <p aria-hidden className="text-muted-foreground">{'{'}</p>
          <ul aria-label="Preset fields">
            {FIELDS.map((f, k) => (
              <li key={f.k}>
                <button
                  type="button"
                  onMouseEnter={() => setI(k)}
                  onFocus={() => setI(k)}
                  onClick={() => setI(k)}
                  aria-pressed={k === i}
                  className={`flex w-full gap-2 rounded-md px-4 py-1 text-left transition-colors ${k === i ? 'bg-accent' : 'hover:bg-muted'}`}
                >
                  <span className={k === i ? 'text-accent-foreground' : 'text-foreground'}>&quot;{f.k}&quot;</span>
                  <span className="text-muted-foreground">:</span>
                  <span className="text-muted-foreground">{f.v},</span>
                </button>
              </li>
            ))}
          </ul>
          <p aria-hidden className="text-muted-foreground">{'}'}</p>
        </div>
        <div>
          <p className="font-mono text-xs uppercase tracking-[0.2em] text-primary">Anatomy of a preset</p>
          <h2 id="preset" className="mt-3 text-4xl font-black md:text-5xl">Design data you can diff.</h2>
          <div aria-live="polite" className="mt-8 border-l-2 border-primary pl-5">
            <p className="font-mono text-sm text-primary">{FIELDS[i]!.k}</p>
            <p className="mt-2 text-lg">{FIELDS[i]!.d}</p>
          </div>
          <p className="mt-8 text-sm text-muted-foreground">Download preset JSON and work fully offline. Publishing a shareable code is always an explicit action.</p>
        </div>
      </div>
    </section>
  )
}
