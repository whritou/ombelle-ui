'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useEffect, useRef } from 'react'
import { Sidebar, SidebarContent, useSidebar, SidebarGroup, SidebarGroupContent, SidebarGroupLabel, SidebarMenu, SidebarMenuButton, SidebarMenuItem } from '../../generated/ui/components/ui/sidebar'
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
  const content = useRef<HTMLDivElement>(null)
  // Links navigate on the client, so the layout and the sidebar's scroll stay put between components.
  // The current link is brought into view only when it is out of it: on a page opened directly, or after
  // the page's previous and next links; a link clicked in the sidebar is already in view, so nothing moves.
  useEffect(() => {
    content.current?.querySelector('[aria-current="page"]')?.scrollIntoView({ block: 'nearest' })
  }, [pathname])
  // On phones the sidebar is a sheet: a full page load used to close it, a client navigation does not.
  const { setOpenMobile } = useSidebar()
  useEffect(() => setOpenMobile(false), [pathname, setOpenMobile])
  return (
    <Sidebar collapsible="offcanvas" label={label} className="site-sidebar">
      <SidebarContent ref={content}>
        {groups.map(group => (
          <SidebarGroup key={group.title} aria-label={group.title}>
            <SidebarGroupLabel>{group.title}</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {group.links.map(link => (
                  <SidebarMenuItem key={link.href}>
                    <SidebarMenuButton asChild isActive={link.href === pathname}><Link href={link.href}><span>{link.label}</span></Link></SidebarMenuButton>
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
