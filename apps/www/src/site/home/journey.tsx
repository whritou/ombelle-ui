'use client'

import { Check, Copy, FileCode2, MousePointerClick, Pause, Play, SlidersHorizontal, TerminalSquare } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useCopy } from './sections'
import { STYLES, type StyleKey } from './showcase'

const RADIUS = [0, 6, 14, 28, 999]
const DENSITY = [10, 14, 18, 24]
const DENSITY_LABEL = ['compact', 'cozy', 'roomy', 'spacious']
const AUTO_MS = 6500
const RECIPE_FILE = 'components/ui/recipes/rc_primary-button/r2/button.tsx'

function useReducedMotion() {
  const [reduce, setReduce] = useState(false)
  useEffect(() => {
    const query = matchMedia('(prefers-reduced-motion: reduce)')
    setReduce(query.matches)
    const onChange = () => setReduce(query.matches)
    query.addEventListener('change', onChange)
    return () => query.removeEventListener('change', onChange)
  }, [])
  return reduce
}

/* ------------------------------------------------------------------ */
/* Station 1 — Choose                                                  */
/* ------------------------------------------------------------------ */
function StageChoose({ style, onPick }: { style: StyleKey; onPick: (s: StyleKey) => void }) {
  return (
    <div className="flex h-full flex-col">
      <div role="group" aria-label="Style family" className="grid flex-1 gap-4 sm:grid-cols-3">
        {STYLES.map(s => {
          const active = s.value === style
          return (
            <button
              key={s.value}
              type="button"
              data-style={s.value}
              aria-pressed={active}
              onClick={() => onPick(s.value)}
              className={`o-kit group relative flex flex-col items-center justify-center gap-4 rounded-2xl border p-6 text-left transition-all duration-300 ${
                active
                  ? 'border-primary bg-background shadow-soft'
                  : 'border-border bg-background/50 hover:-translate-y-1 hover:border-foreground/30'
              }`}
            >
              {active && (
                <span className="absolute right-3 top-3 inline-flex size-6 items-center justify-center rounded-full bg-primary text-primary-foreground">
                  <Check className="size-3.5" aria-hidden />
                </span>
              )}
              <span aria-hidden className="o-btn o-btn-primary pointer-events-none">Get started</span>
              <span className="font-mono text-xs uppercase tracking-wider text-muted-foreground">{s.label}</span>
            </button>
          )
        })}
      </div>
      <p className="mt-5 rounded-xl bg-muted px-4 py-2.5 font-mono text-xs text-muted-foreground">
        preset · <span className="text-foreground">styleFamily: &quot;{style === 'brutal' ? 'neo-brutalism' : style === 'minimal' ? 'minimalist' : 'flat'}&quot;</span>
      </p>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/* Station 2 — Customize                                               */
/* ------------------------------------------------------------------ */
function buttonShape(radius: number, density: number) {
  return { borderRadius: `${RADIUS[radius]!}px`, paddingInline: `${DENSITY[density]! + 8}px`, paddingBlock: `${DENSITY[density]! / 1.6}px` }
}

function StageCustomize({ style, radius, density, onRadius, onDensity }: {
  style: StyleKey
  radius: number
  density: number
  onRadius: (i: number) => void
  onDensity: (i: number) => void
}) {
  return (
    <div className="grid h-full gap-8 md:grid-cols-2 md:items-center">
      <div data-style={style} className="o-kit flex min-h-48 items-center justify-center rounded-2xl border border-dashed border-border bg-background/50 p-8">
        <span aria-hidden className="o-btn o-btn-primary pointer-events-none transition-all duration-300" style={buttonShape(radius, density)}>
          Ship it
        </span>
      </div>
      <div className="space-y-6">
        <div>
          <label htmlFor="j-radius" className="flex items-center justify-between font-mono text-xs uppercase tracking-wider text-muted-foreground">
            Radius <span className="text-primary">{RADIUS[radius] === 999 ? 'pill' : `${RADIUS[radius]}px`}</span>
          </label>
          <input id="j-radius" type="range" min={0} max={RADIUS.length - 1} value={radius}
            aria-valuetext={RADIUS[radius] === 999 ? 'pill' : `${RADIUS[radius]} pixels`}
            onChange={e => onRadius(Number(e.target.value))} className="mt-2 w-full accent-primary" />
        </div>
        <div>
          <label htmlFor="j-density" className="flex items-center justify-between font-mono text-xs uppercase tracking-wider text-muted-foreground">
            Density <span className="text-primary">{DENSITY_LABEL[density]}</span>
          </label>
          <input id="j-density" type="range" min={0} max={DENSITY.length - 1} value={density}
            aria-valuetext={DENSITY_LABEL[density]}
            onChange={e => onDensity(Number(e.target.value))} className="mt-2 w-full accent-primary" />
        </div>
        <div className="rounded-xl bg-muted px-4 py-3 font-mono text-xs leading-relaxed text-muted-foreground">
          <p className="text-foreground">button.recipe.json {'{'}</p>
          <p className="pl-4">radius: <span className="text-foreground">{RADIUS[radius] === 999 ? '999px' : `${RADIUS[radius]}px`}</span>,</p>
          <p className="pl-4">density: <span className="text-foreground">&quot;{DENSITY_LABEL[density]}&quot;</span></p>
          <p className="text-foreground">{'}'}</p>
        </div>
      </div>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/* Station 3 — Install                                                 */
/* ------------------------------------------------------------------ */
const OUT = [
  '✓ Read recipe button.recipe.json · pinned preset',
  `+ create  ${RECIPE_FILE} + button.css`,
  '+ create  ombelle-examples/recipes/rc_primary-button/r2.tsx',
  '= keep    project preset, theme and existing components',
  '✓ Source is yours to edit',
]

function StageInstall({ style, radius, density, release, reduce }: { style: StyleKey; radius: number; density: number; release: string; reduce: boolean }) {
  const cmd = `bunx ${release} add --recipe ./button.recipe.json`
  const [typed, setTyped] = useState(reduce ? cmd.length : 0)
  const { copied, copy } = useCopy()
  const done = typed >= cmd.length

  useEffect(() => {
    if (reduce) {
      setTyped(cmd.length)
      return
    }
    setTyped(0)
    const id = setInterval(() => setTyped(t => Math.min(t + 2, cmd.length)), 22)
    return () => clearInterval(id)
  }, [cmd, reduce])

  return (
    <div className="grid h-full gap-6 md:grid-cols-[1.3fr_1fr] md:items-stretch">
      <div className="overflow-hidden rounded-2xl border border-border bg-ink text-paper shadow-soft dark:bg-muted/40 dark:text-foreground">
        <div className="flex items-center gap-2 border-b border-paper/10 px-4 py-2.5 dark:border-border">
          <TerminalSquare className="size-4 text-terminal-accent" aria-hidden />
          <span className="font-mono text-xs text-paper/75 dark:text-muted-foreground">your terminal</span>
          <button
            type="button"
            aria-label="Copy command"
            onClick={() => copy(cmd)}
            className="ml-auto inline-flex size-8 items-center justify-center rounded-md text-paper/75 hover:bg-paper/10 dark:text-muted-foreground dark:hover:bg-muted"
          >
            {copied ? <Check className="size-4 text-terminal-accent" aria-hidden /> : <Copy className="size-4" aria-hidden />}
          </button>
        </div>
        <div className="p-4 font-mono text-sm">
          <p className="break-all">
            <span aria-hidden className="text-terminal-accent">$ </span>
            <span className="sr-only">{cmd}</span>
            <span aria-hidden>{cmd.slice(0, typed)}</span>
            {!done && <span aria-hidden className="animate-blink ml-0.5 inline-block h-4 w-2 translate-y-0.5 bg-terminal-accent" />}
          </p>
          {done && (
            <ul aria-label="Example output" className="mt-3 space-y-1.5 text-xs leading-relaxed">
              {OUT.map((line, i) => (
                <li key={line} className="animate-line-in break-all" style={{ animationDelay: `${i * 160}ms` }}>
                  <span className={line.startsWith('✓') ? 'text-terminal-accent' : 'text-paper/75 dark:text-muted-foreground'}>{line}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
      <div className={`flex min-w-0 flex-col rounded-2xl border border-border bg-background transition-opacity duration-500 ${done ? 'opacity-100' : 'opacity-30'}`}>
        <p className="flex min-w-0 items-center gap-2 border-b border-border px-4 py-2.5 font-mono text-xs text-muted-foreground">
          <FileCode2 className="size-4 shrink-0 text-primary" aria-hidden /> <span className="truncate">{RECIPE_FILE}</span>
        </p>
        <div data-style={style} className="o-kit flex flex-1 items-center justify-center p-8">
          <span aria-hidden className="o-btn o-btn-primary pointer-events-none" style={buttonShape(radius, density)}>
            Ship it
          </span>
        </div>
        <p className="border-t border-border px-4 py-2.5 text-center font-mono text-[11px] text-muted-foreground">the exact button you previewed</p>
      </div>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/* Journey section                                                     */
/* ------------------------------------------------------------------ */
const STEPS = [
  { n: '01', title: 'Choose', icon: MousePointerClick, body: 'Pick a style family. It becomes your project preset.' },
  { n: '02', title: 'Customize', icon: SlidersHorizontal, body: 'Tune one Button in the Button editor and download it as a recipe.' },
  { n: '03', title: 'Install', icon: TerminalSquare, body: 'One command. Editable source lands in your repo.' },
] as const

export function JourneySection({ release }: { release: string }) {
  const reduce = useReducedMotion()
  const [stage, setStage] = useState(0)
  const [paused, setPaused] = useState(false)
  const [style, setStyle] = useState<StyleKey>('flat')
  const [radius, setRadius] = useState(2)
  const [density, setDensity] = useState(1)
  const auto = !paused && !reduce

  useEffect(() => {
    if (!auto) return
    const id = setInterval(() => setStage(s => (s + 1) % STEPS.length), AUTO_MS)
    return () => clearInterval(id)
  }, [auto])

  const manual = () => setPaused(true)

  return (
    <section aria-labelledby="journey" className="border-y border-border bg-card">
      <div className="mx-auto max-w-6xl px-5 py-20 md:py-28">
        <p className="font-mono text-xs uppercase tracking-[0.2em] text-primary">How it works</p>
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h2 id="journey" className="mt-3 text-4xl font-black md:text-5xl">One button&apos;s journey.</h2>
            <p className="mt-4 max-w-lg text-muted-foreground">Follow a single Button from catalogue to your repo — pick it, bend it, ship it.</p>
          </div>
          {!reduce && (
            <button type="button" onClick={() => setPaused(p => !p)} className="inline-flex min-h-10 items-center gap-2 rounded-full border border-border px-4 text-sm font-semibold hover:bg-muted">
              {paused ? <Play className="size-4" aria-hidden /> : <Pause className="size-4" aria-hidden />}
              {paused ? 'Play tour' : 'Pause tour'}
            </button>
          )}
        </div>

        <div className="mt-12 grid min-w-0 grid-cols-1 gap-8 lg:grid-cols-[280px_minmax(0,1fr)]" onPointerDown={manual} onKeyDown={manual}>
          <ol aria-label="Steps" className="flex min-w-0 gap-2 lg:flex-col lg:gap-0">
            {STEPS.map((s, i) => {
              const active = i === stage
              const Icon = s.icon
              return (
                <li key={s.n} className="min-w-0 flex-1 lg:flex-none">
                  <button
                    type="button"
                    aria-current={active ? 'step' : undefined}
                    onClick={() => { manual(); setStage(i) }}
                    className={`relative w-full min-w-0 overflow-hidden rounded-xl border p-3 text-left transition-colors sm:p-4 lg:mb-2 ${
                      active ? 'border-primary bg-background shadow-soft' : 'border-transparent hover:bg-background/60'
                    }`}
                  >
                    {active && auto && (
                      <span key={stage} aria-hidden className="animate-grow absolute inset-x-0 top-0 h-0.5 bg-primary" style={{ animationDuration: `${AUTO_MS}ms` }} />
                    )}
                    <span className="flex min-w-0 items-center gap-2 sm:gap-3">
                      <span className={`shrink-0 font-mono text-xs ${active ? 'text-primary' : 'text-muted-foreground'}`}>{s.n}</span>
                      <Icon className={`size-4 shrink-0 ${active ? 'text-primary' : 'text-muted-foreground'}`} aria-hidden />
                      <span className="truncate font-display font-bold">{s.title}</span>
                    </span>
                    <span className="mt-1.5 hidden text-xs text-muted-foreground lg:block">{s.body}</span>
                  </button>
                </li>
              )
            })}
          </ol>

          <div className="min-w-0 overflow-hidden rounded-3xl border border-border bg-card p-6 shadow-soft md:p-8 lg:min-h-[26rem]">
            {stage === 0 && <StageChoose style={style} onPick={s => { manual(); setStyle(s) }} />}
            {stage === 1 && <StageCustomize style={style} radius={radius} density={density} onRadius={v => { manual(); setRadius(v) }} onDensity={v => { manual(); setDensity(v) }} />}
            {stage === 2 && <StageInstall style={style} radius={radius} density={density} release={release} reduce={reduce} />}
          </div>
        </div>
      </div>
    </section>
  )
}
