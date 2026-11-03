'use client'

import { ArrowRight, Palette } from 'lucide-react'
import { useState } from 'react'
import { CursorHalo } from './cursor-halo'
import { HeroComposition, STYLES, StyleSelector, type StyleKey } from './showcase'

export function HeroSection() {
  const [style, setStyle] = useState<StyleKey>('flat')
  return (
    <section aria-labelledby="hero" className="relative overflow-hidden border-b border-border">
      <div aria-hidden className="bg-grid absolute inset-0 [mask-image:radial-gradient(ellipse_at_top,black,transparent_75%)]" />
      <CursorHalo />
      <div className="relative mx-auto grid max-w-6xl gap-12 px-5 py-16 md:py-24 lg:grid-cols-[1fr_1.1fr] lg:items-center">
        <div>
          <p className="font-mono text-xs uppercase tracking-[0.2em] text-primary">React · shadcn · Radix UI · Tailwind v4</p>
          <h1 id="hero" className="mt-5 text-5xl font-black leading-[0.95] md:text-7xl">
            Your components.<br />
            <span className="text-primary">Your style.</span>
          </h1>
          <p className="mt-6 max-w-md text-lg text-muted-foreground">
            Ombelle installs editable, accessible React component source built on shadcn and Radix into your Vite or Next.js app — in distinct visual families you can switch, tune and own.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <a href="#get-started" className="inline-flex min-h-12 items-center gap-2 rounded-full bg-primary px-6 font-semibold text-primary-foreground shadow-soft transition-transform hover:-translate-y-0.5">
              Get started <ArrowRight className="size-4" aria-hidden />
            </a>
            <a href="/editor/preset" className="inline-flex min-h-12 items-center gap-2 rounded-full border border-border bg-card px-6 font-semibold text-foreground transition-colors hover:bg-muted">
              <Palette className="size-4" aria-hidden /> Design a preset
            </a>
          </div>
        </div>
        <div className="space-y-5">
          <StyleSelector value={style} onChange={setStyle} />
          <div aria-live="polite" className="sr-only">Showing {STYLES.find(s => s.value === style)?.label} style</div>
          <HeroComposition style={style} />
        </div>
      </div>
    </section>
  )
}
