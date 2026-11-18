'use client'

import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react'
import { Box, Droplet, Layers, LayoutGrid, Palette, PanelLeftClose, PanelLeftOpen, Ruler, Shapes, Smile, Sparkles, StretchHorizontal, Type, type LucideIcon } from 'lucide-react'
import { Sidebar, SidebarMenu, SidebarMenuButton, SidebarMenuItem, SidebarProvider, SidebarTrigger } from '../generated/ui/components/ui/sidebar'
import { useViewportClass } from './breakpoints'
import styles from './editor-shell.module.css'

/** Each inspector section's icon in the folded rail, by the last word of its heading id. */
const sectionIcons: Record<string, LucideIcon> = {
  family: Palette, colors: Droplet, shape: Shapes, depth: Layers, glass: Sparkles, material: Sparkles, content: Type,
  type: Type, size: Ruler, spacing: StretchHorizontal, icon: Smile, variant: LayoutGrid, appearance: Palette,
}
const iconFor = (id: string): LucideIcon => sectionIcons[id.split('-').at(-1) ?? ''] ?? Box

type Section = { id: string; title: string }

/**
 * An editor's inspector on a left Sidebar. On the desktop it folds to a rail with one named icon per section;
 * pressing an icon unfolds it at that section and focuses its first control. The controls stay mounted while
 * folded, so nothing typed is lost. Below 1200 px it never folds.
 */
export function EditorInspector({ label, collapsed, onCollapsedChange, shortcut = true, children }: {
  label: string
  collapsed: boolean
  onCollapsedChange(collapsed: boolean): void
  /** Ctrl or Cmd + B folds and unfolds it, except while typing. Off where another panel owns the shortcut. */
  shortcut?: boolean
  children: ReactNode
}) {
  const content = useRef<HTMLDivElement>(null)
  const [sections, setSections] = useState<Section[]>([])
  const [reveal, setReveal] = useState<string | null>(null)
  // The rail lists the sections the inspector shows now, read from their own headings.
  useEffect(() => {
    if (!collapsed || !content.current) return
    setSections([...content.current.querySelectorAll<HTMLElement>('section[aria-labelledby] h2[id]')]
      .filter(heading => heading.textContent?.trim())
      .map(heading => ({ id: heading.id, title: heading.textContent!.trim() })))
  }, [collapsed])
  // After unfolding, scroll to the chosen section and focus its first control.
  useEffect(() => {
    if (collapsed || !reveal) return
    const heading = document.getElementById(reveal)
    heading?.scrollIntoView({ block: 'start' })
    heading?.closest('section')?.querySelector<HTMLElement>('input:not([type="hidden"]), select, textarea, button, [tabindex]:not([tabindex="-1"])')?.focus()
    setReveal(null)
  }, [collapsed, reveal])
  // The inspector folds only from 1200 px; below it the shortcut would fold it unseen, so it stays off there.
  const desktop = useViewportClass() === 'desktop'
  return (
    <SidebarProvider open={!collapsed} onOpenChange={open => onCollapsedChange(!open)} shortcut={shortcut && desktop} mobileBreakpoint={0}
      className={styles.inspectorProvider} style={{ '--sidebar-width': '100%', '--sidebar-width-icon': '4rem', '--sidebar-height': '100%' } as CSSProperties}>
      <Sidebar side="left" collapsible="icon" label={`${label} sections`} role="group" className={styles.inspectorSidebar}>
        <div className={styles.inspectorBar}>
          <SidebarTrigger className={styles.inspectorToggle} aria-label={collapsed ? `Unfold ${label.toLowerCase()}` : `Fold ${label.toLowerCase()}`}>
            {collapsed ? <PanelLeftOpen aria-hidden="true" size={16} /> : <PanelLeftClose aria-hidden="true" size={16} />}
          </SidebarTrigger>
        </div>
        <SidebarMenu className={styles.inspectorRail} hidden={!collapsed}>
          {sections.map(section => {
            const Icon = iconFor(section.id)
            return (
              <SidebarMenuItem key={section.id}>
                <SidebarMenuButton tooltip={section.title} aria-label={section.title} onClick={() => { setReveal(section.id); onCollapsedChange(false) }}>
                  <Icon aria-hidden="true" />
                </SidebarMenuButton>
              </SidebarMenuItem>
            )
          })}
        </SidebarMenu>
        <div ref={content} className={styles.inspectorContent} hidden={collapsed}>{children}</div>
      </Sidebar>
    </SidebarProvider>
  )
}
