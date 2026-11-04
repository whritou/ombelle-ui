import { ArrowRight } from 'lucide-react'
import { styleSupport } from '@ombelle/contracts'
import { componentDocs } from '../../site/components/catalog'
import { familyList } from '../../site/families'

export const metadata = {
  title: 'Components · Ombelle UI',
  description: `The twelve Ombelle components in ${familyList()}, with live previews, source and install commands.`,
}

export default function ComponentsPage() {
  return (
    <main className="min-w-0 py-10">
      <p className="font-mono text-xs uppercase tracking-[0.2em] text-primary">Components</p>
      <h1 className="mt-3 text-4xl font-black md:text-5xl">Components</h1>
      <p className="mt-4 max-w-2xl text-lg text-muted-foreground">
        Twelve accessible components built on shadcn and Radix UI. Each ships in {familyList()} with light and dark modes, and installs as editable source. Six are also available in the experimental liquid glass style.
      </p>
      <ul className="mt-10 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {componentDocs.map(doc => (
          <li key={doc.id}>
            <a href={`/components/${doc.id}`} className="group flex h-full flex-col rounded-xl border border-border bg-card p-5 transition-colors hover:border-primary">
              <span className="flex items-center justify-between font-display text-lg font-bold">
                {doc.name}
                <ArrowRight className="size-4 text-muted-foreground transition-transform group-hover:translate-x-0.5" aria-hidden />
              </span>
              <span className="mt-1 text-sm text-muted-foreground">{doc.description}</span>
              {styleSupport(doc.id, 'liquid-glass') === 'experimental' && (
                <span className="o-glass mt-3 self-start rounded-full px-2.5 py-0.5 font-mono text-[10px] uppercase tracking-wider text-muted-foreground">Glass · experimental</span>
              )}
            </a>
          </li>
        ))}
      </ul>
    </main>
  )
}
