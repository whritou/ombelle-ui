import type { CSSProperties, ReactNode } from 'react'
import { PanelLeftIcon } from 'lucide-react'
import { DocumentationSidebar } from '../../site/docs/sidebar'
import { SidebarInset, SidebarProvider, SidebarTrigger } from '../../generated/ui/components/ui/sidebar'

export default function DocumentationLayout({ children }: { children: ReactNode }) {
  return (
    <SidebarProvider className="site-shell mx-auto w-full max-w-6xl" style={{ '--sidebar-height': 'calc(100dvh - 4rem)', '--sidebar-width': '15rem' } as CSSProperties}>
      <DocumentationSidebar />
      <SidebarInset className="min-w-0 px-5 py-10 lg:px-14 lg:py-16">
        <div className="mb-6 md:hidden"><SidebarTrigger><PanelLeftIcon aria-hidden="true" />Documentation</SidebarTrigger></div>
        {children}
      </SidebarInset>
    </SidebarProvider>
  )
}
