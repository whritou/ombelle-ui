'use client'

import { useEffect, useRef, useState } from 'react'
import { defaultShowcaseStyle, HeroComposition, STYLES, type StyleKey } from './showcase'

const COPY: Record<StyleKey, { tag: string; title: string; body: string }> = {
  ombelle: {
    tag: 'Style 01',
    title: 'Ombelle',
    body: 'Pill buttons, rounded cards, fine ink outlines, and crisp offset shadows. A playful signature with pink accents and clear structure.',
  },
  flat: {
    tag: 'Style 04',
    title: 'Flat',
    body: 'Color blocks and zero noise. Soft surfaces, generous radius, no borders — everything reads at a glance.',
  },
  minimal: {
    tag: 'Style 02',
    title: 'Minimalist',
    body: 'Hairline borders, quiet type, nothing decorative. Whitespace does the work and the content does the talking.',
  },
  brutal: {
    tag: 'Style 03',
    title: 'Neo-Brutalism',
    body: 'Thick ink borders, hard shadows, uppercase type. Components with a point of view that refuse to be ignored.',
  },
}

const SECTION_TONE: Record<StyleKey, { section: string; heading: string; sub: string }> = {
  ombelle: { section: 'bg-accent/40', heading: 'text-foreground', sub: 'text-muted-foreground' },
  flat: { section: 'bg-muted', heading: 'text-foreground', sub: 'text-muted-foreground' },
  minimal: { section: 'bg-background', heading: 'text-foreground', sub: 'text-muted-foreground' },
  brutal: { section: 'bg-primary', heading: 'text-primary-foreground', sub: 'text-primary-foreground' },
}

/**
 * Full-height pinned section: the page scrolls through a tall track while the
 * visible panel stays fixed, stepping through every offered stable family.
 */
export function StyleMorphSection() {
  const trackRef = useRef<HTMLElement>(null)
  const [style, setStyle] = useState<StyleKey>(defaultShowcaseStyle)
  const [progress, setProgress] = useState(0)

  useEffect(() => {
    let raf = 0
    const update = () => {
      raf = 0
      const el = trackRef.current
      if (!el) return
      const total = el.offsetHeight - (window.innerHeight - 64)
      const p = total > 0 ? Math.min(1, Math.max(0, -el.getBoundingClientRect().top / total)) : 0
      setProgress(p)
      setStyle(STYLES[Math.min(STYLES.length - 1, Math.floor(p * STYLES.length))]?.value ?? defaultShowcaseStyle)
    }
    const onScroll = () => {
      if (!raf) raf = requestAnimationFrame(update)
    }
    update()
    window.addEventListener('scroll', onScroll, { passive: true })
    window.addEventListener('resize', onScroll)
    return () => {
      window.removeEventListener('scroll', onScroll)
      window.removeEventListener('resize', onScroll)
      if (raf) cancelAnimationFrame(raf)
    }
  }, [])

  const scrollToStyle = (i: number) => {
    const el = trackRef.current
    if (!el) return
    const total = el.offsetHeight - (window.innerHeight - 64)
    const top = el.getBoundingClientRect().top + window.scrollY
    const smooth = !matchMedia('(prefers-reduced-motion: reduce)').matches
    window.scrollTo({ top: top - 64 + (total * (i + 0.5)) / STYLES.length, behavior: smooth ? 'smooth' : 'auto' })
  }

  const tone = SECTION_TONE[style]
  const copy = COPY[style]
  const brutal = style === 'brutal'

  return (
    <section aria-labelledby="compare" ref={trackRef} className="relative" style={{ height: `${STYLES.length * 100 + 40}svh` }}>
      <div
        data-style={style}
        className={`o-kit sticky top-16 flex h-[calc(100dvh-4rem)] flex-col justify-center overflow-hidden transition-colors duration-500 ${tone.section}`}
      >
        <div className="mx-auto grid w-full max-w-6xl gap-6 px-5 sm:gap-10 lg:grid-cols-[1fr_1.15fr] lg:items-center">
          <div>
            <p className={`font-mono text-xs uppercase tracking-[0.2em] ${brutal ? tone.sub : 'text-primary'}`}>One component. {STYLES.length} style families.</p>
            <div key={style} className="animate-morph-in">
              <p className={`mt-4 font-mono text-xs uppercase tracking-[0.2em] sm:mt-6 ${tone.sub}`}>{copy.tag}</p>
              <h2 id="compare" className={`mt-2 text-4xl font-black leading-[0.95] sm:text-5xl md:text-7xl ${tone.heading}`}>
                {copy.title}
              </h2>
              <p className={`mt-3 max-w-md text-base sm:mt-5 sm:text-lg ${tone.sub}`}>{copy.body}</p>
            </div>
            <p className={`mt-6 hidden max-w-md text-sm sm:block ${tone.sub}`}>
              Same markup, same Radix behavior, same accessibility tree — only the style layer changes.
            </p>
            <div className="mt-5 flex flex-wrap items-center gap-2 sm:mt-8" role="group" aria-label="Jump to style">
              {STYLES.map((s, i) => (
                <button
                  key={s.value}
                  type="button"
                  aria-pressed={s.value === style}
                  onClick={() => scrollToStyle(i)}
                  className={`min-h-10 rounded-full border px-4 text-sm font-semibold transition-colors ${
                    s.value === style
                      ? brutal
                        ? 'border-primary-foreground bg-primary-foreground text-primary'
                        : 'border-foreground bg-foreground text-background'
                      : brutal
                        ? 'border-primary-foreground/60 text-primary-foreground hover:border-primary-foreground hover:bg-primary-foreground/10'
                        : 'border-border text-muted-foreground hover:border-foreground/40 hover:bg-foreground/5 hover:text-foreground'
                  }`}
                >
                  {s.label}
                </button>
              ))}
            </div>
          </div>
          <HeroComposition style={style} compact />
        </div>

        <div className="pointer-events-none absolute inset-x-0 bottom-3 flex sm:bottom-6 flex-col items-center gap-2">
          <div
            className={`h-1 w-40 overflow-hidden rounded-full ${brutal ? 'bg-primary-foreground/25' : 'bg-foreground/10'}`}
            role="progressbar"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={Math.round(progress * 100)}
            aria-label="Style morph progress"
          >
            <div
              className={`h-full rounded-full transition-[width] duration-150 ${brutal ? 'bg-primary-foreground' : 'bg-primary'}`}
              style={{ width: `${progress * 100}%` }}
            />
          </div>
          <p className={`font-mono text-[10px] uppercase tracking-[0.2em] ${tone.sub}`}>Scroll to morph the style</p>
        </div>
      </div>
    </section>
  )
}
