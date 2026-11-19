'use client'

import type { StyleFamily } from '@ombelle/contracts'
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type CSSProperties, type MouseEvent, type ReactNode } from 'react'
import { flushSync } from 'react-dom'
import { useSiteDark } from '../theme'
import {
  designValues, exampleCode, familyMeta, glassVars, paletteVars, tweakVars,
  type LandingGlassPreset, type LandingPalette, type LandingTweaks,
} from './landing-theme'

export type LandingData = {
  /** Offered families, in site order; liquid glass comes last. */
  families: readonly StyleFamily[]
  palettes: Partial<Record<StyleFamily, readonly LandingPalette[]>>
  glassPresets: readonly LandingGlassPreset[]
  components: readonly { name: string; fresh: boolean }[]
  componentCount: number
  /** `npx @ombelle-ui/cli@x.y.z` for each package manager. */
  runners: Readonly<Record<'npm' | 'pnpm' | 'yarn' | 'bun', string>>
  cliVersion: string
}

/** One look a family can take: its default, a palette, or (liquid glass) a starting preset. */
export type LookOption = { name: string; swatch?: { background: string; mark: string } }

type Landing = LandingData & {
  family: StyleFamily
  dark: boolean
  /** Wear a family on the whole page. The event places the reveal animation. */
  wear: (family: StyleFamily, event?: MouseEvent<HTMLElement>) => void
  playing: boolean
  setPlaying: (playing: boolean) => void
  /** Chosen look per family: 0 is the style default. */
  look: Partial<Record<StyleFamily, number>>
  setLook: (family: StyleFamily, index: number) => void
  lookOptions: (family: StyleFamily) => LookOption[]
  /** Custom properties for a family element showing its chosen look. */
  lookStyle: (family: StyleFamily) => CSSProperties
  tweaks: LandingTweaks
  setTweak: (key: keyof LandingTweaks, value: number) => void
  resetDesign: () => void
  design: ReturnType<typeof designValues>
  /** An example code for the design on screen; see exampleCode. */
  code: string
  /** True while a family switch is being revealed, so nothing animates under it. */
  instant: boolean
}

const LandingContext = createContext<Landing | null>(null)

export function useLanding(): Landing {
  const value = useContext(LandingContext)
  if (!value) throw new Error('useLanding must be used inside LandingProvider.')
  return value
}

const reducedMotion = () => typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches
const cycleMs = 3400

export function LandingProvider({ data, children }: { data: LandingData; children: ReactNode }) {
  const dark = useSiteDark()
  const [family, setFamily] = useState<StyleFamily>(data.families[0]!)
  const [look, setLooks] = useState<Partial<Record<StyleFamily, number>>>({})
  const [tweaks, setTweaks] = useState<LandingTweaks>({})
  const [playing, setPlaying] = useState(false)
  const [instant, setInstant] = useState(false)
  const steps = useRef(0)

  // The hero cycles through the families once, then rests: a page that never stops changing is hard to read.
  useEffect(() => setPlaying(!reducedMotion()), [])
  useEffect(() => {
    if (!playing) return
    const timer = setInterval(() => {
      if (document.hidden) return
      const hero = document.getElementById('hero-section')?.getBoundingClientRect()
      if (hero && (hero.bottom < 120 || hero.top > innerHeight)) return
      steps.current += 1
      if (steps.current >= data.families.length) setPlaying(false)
      setTweaks({})
      setFamily((current) => data.families[(data.families.indexOf(current) + 1) % data.families.length]!)
    }, cycleMs)
    return () => clearInterval(timer)
  }, [playing, data.families])

  const wear = useCallback((next: StyleFamily, event?: MouseEvent<HTMLElement>) => {
    setPlaying(false)
    const apply = () => {
      setFamily(next)
      setTweaks({})
    }
    if (next === family || typeof document.startViewTransition !== 'function' || reducedMotion()) return apply()
    // The new family opens as a circle from the control that chose it.
    const box = event?.currentTarget.getBoundingClientRect()
    const x = event?.clientX || (box ? box.left + box.width / 2 : innerWidth / 2)
    const y = event?.clientY || (box ? box.top + box.height / 2 : innerHeight / 2)
    document.documentElement.style.setProperty('--vx', `${x}px`)
    document.documentElement.style.setProperty('--vy', `${y}px`)
    const transition = document.startViewTransition(() => flushSync(() => {
      setInstant(true)
      apply()
    }))
    const done = () => setInstant(false)
    transition.finished.then(done, done)
  }, [family])

  const value = useMemo<Landing>(() => {
    const lookOptions = (id: StyleFamily): LookOption[] => id === 'liquid-glass'
      ? [{ name: 'Liquid glass' }, ...data.glassPresets.map((preset) => ({ name: preset.name }))]
      : [{ name: 'Style default' }, ...(data.palettes[id] ?? []).map((palette) => {
          const colors = dark ? palette.dark : palette.light
          // Minimalist primaries are all near-black, so its muted text colour tells its palettes apart.
          return { name: palette.name, swatch: { background: colors[0]!, mark: colors[id === 'minimalist' ? 8 : 3]! } }
        })]
    const lookVars = (id: StyleFamily): Record<string, string> => {
      const index = look[id] ?? 0
      if (!index) return {}
      return id === 'liquid-glass' ? glassVars(data.glassPresets[index - 1], dark) : paletteVars(id, data.palettes[id]?.[index - 1], dark)
    }
    const design = designValues(familyMeta[family].design, tweaks)
    return {
      ...data, family, dark, wear, playing, look, tweaks, design, instant,
      setPlaying: (next) => {
        steps.current = 0
        setPlaying(next)
      },
      setLook: (id, index) => {
        setPlaying(false)
        setLooks((current) => ({ ...current, [id]: index }))
      },
      lookOptions,
      lookStyle: (id) => lookVars(id) as CSSProperties,
      setTweak: (key, next) => {
        setPlaying(false)
        setTweaks((current) => ({ ...current, [key]: next }))
      },
      resetDesign: () => {
        setTweaks({})
        setLooks((current) => ({ ...current, [family]: 0 }))
      },
      code: exampleCode([family, look[family] ?? 0, design.radiusPx, design.borderWidthPx, design.shadowOffsetXPx, design.shadowOffsetYPx].join('|')),
    }
  }, [data, family, dark, wear, playing, look, tweaks, instant])

  return <LandingContext.Provider value={value}>{children}</LandingContext.Provider>
}

/** The page root's custom properties: the worn family's look, then the slider values. */
export function usePageStyle(): CSSProperties {
  const { family, lookStyle, tweaks } = useLanding()
  return { ...lookStyle(family), ...(tweakVars(tweaks) as CSSProperties) }
}

/** Copies text and reports the result for two seconds; a failure is reported, not hidden. */
export function useCopyLabel(idle = 'Copy') {
  const [label, setLabel] = useState(idle)
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined)
  useEffect(() => () => clearTimeout(timer.current), [])
  const copy = (text: string) => {
    const show = (next: string) => {
      setLabel(next)
      clearTimeout(timer.current)
      timer.current = setTimeout(() => setLabel(idle), 2000)
    }
    if (!navigator.clipboard) return show('Copy failed')
    navigator.clipboard.writeText(text).then(() => show('Copied'), () => show('Copy failed'))
  }
  return { label, copy }
}
