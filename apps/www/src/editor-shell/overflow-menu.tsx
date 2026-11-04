'use client'

import { Ellipsis } from 'lucide-react'
import styles from './editor-shell.module.css'

export type OverflowItem = {
  id: string
  label: string
  onSelect: () => void
  destructive?: boolean
  disabled?: boolean
}

export function OverflowMenu({
  id,
  label,
  items,
}: {
  id: string
  label: string
  items: readonly OverflowItem[]
}) {
  const regular = items.filter((item) => !item.destructive)
  const destructive = items.filter((item) => item.destructive)
  const renderItem = (item: OverflowItem) => (
    <button
      key={item.id}
      type="button"
      role="menuitem"
      disabled={item.disabled}
      className={styles.menuItem}
      data-destructive={item.destructive ? 'true' : undefined}
      onClick={(event) => {
        event.currentTarget.closest<HTMLElement>('[popover]')?.hidePopover?.()
        item.onSelect()
      }}
    >
      {item.label}
    </button>
  )
  return (
    <>
      <button
        type="button"
        className={styles.iconButton}
        aria-label={label}
        popoverTarget={id}
      >
        <Ellipsis aria-hidden="true" size={16} />
      </button>
      <div id={id} popover="auto" role="menu" aria-label={label} className={styles.menu}>
        {regular.map(renderItem)}
        {destructive.length > 0 && regular.length > 0 ? (
          <hr role="separator" className={styles.menuSeparator} />
        ) : null}
        {destructive.map(renderItem)}
      </div>
    </>
  )
}
