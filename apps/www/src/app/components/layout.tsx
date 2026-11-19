import type { CSSProperties, ReactNode } from 'react'
import { PanelLeftIcon } from 'lucide-react'
import { ComponentsSidebar } from '../../site/components/sidebar'
import { SidebarInset, SidebarProvider, SidebarTrigger } from '../../generated/ui/components/ui/sidebar'

export default function ComponentsLayout({ children }: { children: ReactNode }) {
  // No Ctrl or Cmd + B here: from 768 px nothing on screen would bring the navigation back.
  return (
    <SidebarProvider shortcut={false} className="site-shell mx-auto w-full max-w-7xl" style={{ '--sidebar-height': 'calc(100dvh - 4rem)', '--sidebar-width': '14rem' } as CSSProperties}>
      <ComponentsSidebar />
      <SidebarInset className="min-w-0 px-5 md:px-10">
        <div className="mt-6 md:hidden"><SidebarTrigger><PanelLeftIcon aria-hidden="true" />Browse components</SidebarTrigger></div>
        {children}
      </SidebarInset>
    </SidebarProvider>
  )
}
