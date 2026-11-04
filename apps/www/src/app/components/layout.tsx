import type { ReactNode } from 'react'
import { ComponentsSidebar } from '../../site/components/sidebar'

export default function ComponentsLayout({ children }: { children: ReactNode }) {
  return (
    <div className="mx-auto grid w-full max-w-7xl gap-10 px-5 md:grid-cols-[13rem_minmax(0,1fr)]">
      <div className="hidden md:block">
        <div className="sticky top-16 max-h-[calc(100dvh-4rem)] overflow-y-auto py-10 pr-2">
          <ComponentsSidebar />
        </div>
      </div>
      <div className="min-w-0">
        <details className="group mt-6 rounded-xl border border-border bg-card md:hidden">
          <summary className="cursor-pointer list-none rounded-xl px-4 py-3 text-sm font-medium transition-colors hover:bg-muted active:bg-foreground/10 group-open:rounded-b-none">Browse components</summary>
          <div className="border-t border-border px-2 py-4">
            <ComponentsSidebar label="Components (mobile)" />
          </div>
        </details>
        {children}
      </div>
    </div>
  )
}
