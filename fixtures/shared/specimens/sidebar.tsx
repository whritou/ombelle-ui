'use client'
import * as React from 'react'
import { Sidebar, SidebarContent, SidebarGroup, SidebarGroupContent, SidebarGroupLabel, SidebarHeader, SidebarInset, SidebarMenu, SidebarMenuButton, SidebarMenuItem, SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar'

export function Specimen() {
  return (
    <section aria-label="Sidebar" data-component="sidebar">
      <h2>Sidebar</h2>
      <SidebarProvider style={{ '--sidebar-height': '18rem', border: '1px solid var(--border)' } as React.CSSProperties}>
        <Sidebar collapsible="icon" label="Gallery workspace">
          <SidebarHeader><strong>Ombelle</strong></SidebarHeader>
          <SidebarContent>
            <SidebarGroup aria-label="Workspace">
              <SidebarGroupLabel>Workspace</SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu>
                  {['Overview', 'Projects', 'Presets'].map((item, index) => (
                    <SidebarMenuItem key={item}>
                      <SidebarMenuButton href={`#${item.toLowerCase()}`} isActive={index === 0} tooltip={item}><span aria-hidden="true" data-sidebar-initial="">{item.slice(0, 1)}</span><span>{item}</span></SidebarMenuButton>
                    </SidebarMenuItem>
                  ))}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          </SidebarContent>
        </Sidebar>
        <SidebarInset><div style={{ padding: '0.75rem' }}><SidebarTrigger /></div></SidebarInset>
      </SidebarProvider>
    </section>
  )
}
