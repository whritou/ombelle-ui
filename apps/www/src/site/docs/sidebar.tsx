'use client'

import { usePathname } from 'next/navigation'
import { Sidebar, SidebarContent, SidebarFooter, SidebarGroup, SidebarGroupContent, SidebarMenu, SidebarMenuButton, SidebarMenuItem } from '../../generated/ui/components/ui/sidebar'
import { documentationGuides } from './navigation'

/** The documentation sidebar: a sheet on phones, inline before hydration, and the guides as links. */
export function DocumentationSidebar() {
  const pathname = usePathname()
  return (
    <Sidebar collapsible="offcanvas" label="Documentation" className="site-sidebar">
      <SidebarContent>
        <SidebarGroup aria-label="Documentation">
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem><SidebarMenuButton href="/docs" isActive={pathname === '/docs'}><span>Documentation</span></SidebarMenuButton></SidebarMenuItem>
              {documentationGuides.map(guide => {
                const href = `/docs/${guide.slug}`
                return <SidebarMenuItem key={guide.slug}><SidebarMenuButton href={href} isActive={pathname === href}><span>{guide.title}</span></SidebarMenuButton></SidebarMenuItem>
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter>
        <SidebarMenu><SidebarMenuItem><SidebarMenuButton href="/components"><span>Component API reference →</span></SidebarMenuButton></SidebarMenuItem></SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  )
}
