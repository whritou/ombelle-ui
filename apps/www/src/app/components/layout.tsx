import type { ReactNode } from 'react'
import { ComponentsSidebar } from '../../site/components/sidebar'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '../../generated/ui/components/ui/collapsible'

export default function ComponentsLayout({ children }: { children: ReactNode }) {
  return (
    <div className="mx-auto grid w-full max-w-7xl gap-10 px-5 md:grid-cols-[13rem_minmax(0,1fr)]">
      <div className="hidden md:block">
        <div className="sticky top-16 max-h-[calc(100dvh-4rem)] overflow-y-auto py-10 pr-2">
          <ComponentsSidebar />
        </div>
      </div>
      <div className="min-w-0">
        <Collapsible className="mt-6 md:hidden">
          <CollapsibleTrigger>Browse components</CollapsibleTrigger>
          <CollapsibleContent className="border-t border-border px-2 py-4">
            <ComponentsSidebar label="Components (mobile)" />
          </CollapsibleContent>
        </Collapsible>
        {children}
      </div>
    </div>
  )
}
