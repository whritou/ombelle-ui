'use client'

import { ArrowRight } from 'lucide-react'
import { useState } from 'react'
import type { StartingPresetId } from '@ombelle/catalog'
import { styleSupport } from '@ombelle/contracts'
import { GlassPresetSelect } from '../glass-preset-select'
import { componentDocs, componentInstallable } from './catalog'

export function ComponentDirectory() {
  const [glass, setGlass] = useState<StartingPresetId>()
  return (
    <>
      <div className="mt-6">
        <GlassPresetSelect value={glass} onChange={setGlass} allowNone />
      </div>
      <ul className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {componentDocs.map(doc => {
          const hasGlass = styleSupport(doc.id, 'liquid-glass') === 'experimental'
          const href = `/components/${doc.id}${glass && hasGlass ? '?glass=' + glass : ''}`
          return (
            <li key={doc.id}>
              <a href={href} className="group flex h-full flex-col rounded-xl border border-border bg-card p-5 transition-colors hover:border-primary hover:bg-muted/50 active:bg-muted">
                <span className="flex items-center justify-between font-display text-lg font-bold">
                  {doc.name}
                  <ArrowRight className="size-4 text-muted-foreground transition-transform group-hover:translate-x-0.5" aria-hidden />
                </span>
                <span className="mt-1 text-sm text-muted-foreground">{doc.description}</span>
                <span className="mt-3 flex flex-wrap gap-1.5">
                  {hasGlass && <span className="o-glass rounded-full px-2.5 py-0.5 font-mono text-[10px] uppercase tracking-wider text-muted-foreground">Glass · experimental</span>}
                  {!componentInstallable(doc) && <span className="rounded-full bg-muted px-2.5 py-0.5 text-xs text-muted-foreground">Requires CLI {doc.minimumCli}</span>}
                </span>
              </a>
            </li>
          )
        })}
      </ul>
    </>
  )
}
