'use client'

import { usePathname } from 'next/navigation'
import { Sidebar, SidebarContent, SidebarGroup, SidebarGroupContent, SidebarGroupLabel, SidebarMenu, SidebarMenuButton, SidebarMenuItem } from '../../generated/ui/components/ui/sidebar'
import { componentEditorLink } from '../../editor/editable-components'
import { componentGroups } from './categories'

const groups = [
  { title: 'Getting started', links: [{ href: '/components', label: 'Overview' }, { href: '/docs/getting-started', label: 'Installation' }, { href: '/docs', label: 'Documentation' }] },
  ...componentGroups().map(group => ({ title: group.title, links: group.docs.map(doc => ({ href: `/components/${doc.id}`, label: doc.name })) })),
  { title: 'Editors', links: [{ href: '/editor/preset', label: 'Preset editor' }, componentEditorLink] },
]

/** The component directory's sidebar: a sheet on phones, inline before hydration. */
export function ComponentsSidebar({ label = 'Components' }: { label?: string }) {
  const pathname = usePathname()
  return (
    <Sidebar collapsible="offcanvas" label={label} className="site-sidebar">
      <SidebarContent>
        {groups.map(group => (
          <SidebarGroup key={group.title} aria-label={group.title}>
            <SidebarGroupLabel>{group.title}</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {group.links.map(link => (
                  <SidebarMenuItem key={link.href}>
                    <SidebarMenuButton href={link.href} isActive={link.href === pathname}><span>{link.label}</span></SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        ))}
      </SidebarContent>
    </Sidebar>
  )
}
