import type { ReactNode } from 'react'
import { Prose } from '../generated/ui/components/ui/prose'

/** Shell for long-form and status pages: eyebrow, one h1, lead and prose body. */
export function DocPage({ eyebrow, title, lead, children }: {
  eyebrow: string
  title: string
  lead?: ReactNode
  children: ReactNode
}) {
  return (
    <main id="main" tabIndex={-1} className="relative overflow-hidden">
      <div aria-hidden className="bg-grid absolute inset-x-0 top-0 h-80 [mask-image:radial-gradient(ellipse_at_top,black,transparent_75%)]" />
      <div className="relative mx-auto w-full max-w-3xl px-5 py-16 md:py-24">
        <p className="font-mono text-xs uppercase tracking-[0.2em] text-primary">{eyebrow}</p>
        <h1 className="mt-3 text-4xl font-black leading-[1.02] md:text-6xl">{title}</h1>
        {lead && <div className="mt-5 text-lg text-muted-foreground">{lead}</div>}
        <Prose className="mt-10">{children}</Prose>
      </div>
    </main>
  )
}
