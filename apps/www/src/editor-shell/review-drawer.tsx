'use client'

import { PanelRightClose } from 'lucide-react'
import { useEffect, useRef, type KeyboardEvent, type ReactNode } from 'react'
import styles from './editor-shell.module.css'

export type DrawerTab = {
  id: string
  label: string
  icon: ReactNode
  badge?: number
  content: ReactNode
}

function railLabel(tab: DrawerTab) {
  const base = `Open ${tab.label.toLowerCase()}`
  if (!tab.badge) return base
  return `${base}: ${tab.badge} ${tab.badge === 1 ? 'warning' : 'warnings'}`
}

// The closed rail and the open drawer are different trees, so the element that
// had focus is unmounted by a toggle. This names the element to focus after it.
export function drawerFocusId(open: boolean, activeTab: string): string {
  return open ? `${activeTab}-tab` : `${activeTab}-rail`
}

export function ReviewDrawer({
  label,
  open,
  onOpenChange,
  tabs,
  activeTab,
  onTabChange,
}: {
  label: string
  open: boolean
  onOpenChange(open: boolean): void
  tabs: readonly DrawerTab[]
  activeTab: string
  onTabChange(id: string): void
}) {
  // Only set by toggles made inside the drawer, so a parent that opens it
  // programmatically never has focus pulled onto it.
  const restoreFocus = useRef(false)
  const toggle = (next: boolean) => {
    restoreFocus.current = true
    onOpenChange(next)
  }
  useEffect(() => {
    if (!restoreFocus.current) return
    restoreFocus.current = false
    document.getElementById(drawerFocusId(open, activeTab))?.focus()
  }, [open, activeTab])
  if (!open) {
    return (
      <aside aria-label={label} className={styles.rail}>
        {tabs.map((tab) => (
          <button
            key={tab.id}
            id={`${tab.id}-rail`}
            type="button"
            className={styles.railButton}
            aria-label={railLabel(tab)}
            aria-expanded="false"
            onClick={() => {
              onTabChange(tab.id)
              toggle(true)
            }}
          >
            {tab.icon}
            <span>{tab.label}</span>
            {tab.badge ? (
              <span className={styles.badge} aria-hidden="true">
                {tab.badge}
              </span>
            ) : null}
          </button>
        ))}
      </aside>
    )
  }
  const active = tabs.find((tab) => tab.id === activeTab) ?? tabs[0]
  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    const index = tabs.findIndex((tab) => tab.id === active?.id)
    const step = event.key === 'ArrowRight' ? 1 : event.key === 'ArrowLeft' ? -1 : 0
    if (!step) return
    event.preventDefault()
    const next = tabs[(index + step + tabs.length) % tabs.length]
    if (!next) return
    onTabChange(next.id)
    document.getElementById(`${next.id}-tab`)?.focus()
  }
  return (
    <aside aria-label={label} className={styles.drawer}>
      <div className={styles.drawerHead}>
        <div role="tablist" aria-label={`${label} sections`} onKeyDown={onKeyDown} className={styles.tabs}>
          {tabs.map((tab) => (
            <button
              key={tab.id}
              id={`${tab.id}-tab`}
              type="button"
              role="tab"
              aria-selected={tab.id === active?.id}
              aria-controls={`${tab.id}-panel`}
              tabIndex={tab.id === active?.id ? 0 : -1}
              onClick={() => onTabChange(tab.id)}
            >
              {tab.icon}
              {tab.label}
              {/* The count is decoration here; the panel lists the warnings themselves. */}
              {tab.badge ? (
                <span className={styles.badge} aria-hidden="true">
                  {tab.badge}
                </span>
              ) : null}
            </button>
          ))}
        </div>
        <button
          type="button"
          className={styles.iconButton}
          aria-label={`Close ${label.toLowerCase()}`}
          aria-expanded="true"
          onClick={() => toggle(false)}
        >
          <PanelRightClose aria-hidden="true" size={16} />
        </button>
      </div>
      {active ? (
        <div
          role="tabpanel"
          id={`${active.id}-panel`}
          aria-labelledby={`${active.id}-tab`}
          className={styles.panel}
        >
          {active.content}
        </div>
      ) : null}
    </aside>
  )
}
