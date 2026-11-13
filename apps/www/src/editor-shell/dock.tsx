'use client'

import type { ReactNode } from 'react'
import styles from './editor-shell.module.css'
import { keepChoice } from './inspector'
import { ToggleGroup, ToggleGroupItem } from '../generated/ui/components/ui/toggle-group'

export type DockTab<T extends string> = { value: T; label: string; icon: ReactNode; badge?: number }

/**
 * The phone's pane switcher: a segmented Toggle Group floating at the bottom of the screen. CSS shows
 * it below 768px only; above that every pane is on screen.
 */
export function EditorDock<T extends string>({ label, value, tabs, onChange }: {
  label: string
  value: T
  tabs: readonly DockTab<T>[]
  onChange(value: T): void
}) {
  return (
    <nav aria-label={label} className={styles.dock}>
      <ToggleGroup type="single" variant="segmented" aria-label={label} value={value} onValueChange={keepChoice(onChange)}>
        {tabs.map(tab => (
          <ToggleGroupItem key={tab.value} value={tab.value}
            aria-label={tab.badge ? `${tab.label}, ${tab.badge} ${tab.badge === 1 ? 'warning' : 'warnings'}` : undefined}>
            {tab.icon}
            <span>{tab.label}</span>
            {tab.badge ? <span className={styles.dockBadge} aria-hidden="true">{tab.badge}</span> : null}
          </ToggleGroupItem>
        ))}
      </ToggleGroup>
    </nav>
  )
}
