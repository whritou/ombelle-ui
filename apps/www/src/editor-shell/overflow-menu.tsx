'use client'

import { useEffect, useRef, type KeyboardEvent } from 'react'
import { Ellipsis } from 'lucide-react'
import styles from './editor-shell.module.css'

export type OverflowItem = {
  id: string
  label: string
  onSelect: () => void
  destructive?: boolean
  disabled?: boolean
}

/**
 * Menu keyboard pattern: ArrowDown/ArrowUp move to the next/previous enabled
 * item and wrap, Home/End go to the first/last enabled item. Returns the item
 * index to focus, or null when the key is not a menu navigation key or no item
 * is enabled. `current` is -1 when focus is outside the items.
 */
export function menuFocusTarget(
  key: string,
  current: number,
  disabled: readonly boolean[],
): number | null {
  const enabled = disabled.flatMap((off, index) => (off ? [] : [index]))
  if (!enabled.length) return null
  if (key === 'Home') return enabled[0]
  if (key === 'End') return enabled[enabled.length - 1]
  if (key === 'ArrowDown')
    return enabled.find((index) => index > current) ?? enabled[0]
  if (key === 'ArrowUp')
    return [...enabled].reverse().find((index) => index < current || current < 0) ??
      enabled[enabled.length - 1]
  return null
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
  const trigger = useRef<HTMLButtonElement>(null)
  const menu = useRef<HTMLDivElement>(null)
  const regular = items.filter((item) => !item.destructive)
  const destructive = items.filter((item) => item.destructive)
  const menuItems = () =>
    Array.from(menu.current?.querySelectorAll<HTMLButtonElement>('[role="menuitem"]') ?? [])
  // Opening the menu moves focus to its first enabled item.
  useEffect(() => {
    const element = menu.current
    if (!element) return
    const onToggle = (event: Event) => {
      if ((event as Event & { newState?: string }).newState !== 'open') return
      menuItems().find((item) => !item.disabled)?.focus()
    }
    element.addEventListener('toggle', onToggle)
    return () => element.removeEventListener('toggle', onToggle)
  }, [])
  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key === 'Escape') {
      event.preventDefault()
      menu.current?.hidePopover?.()
      trigger.current?.focus()
      return
    }
    const list = menuItems()
    const target = menuFocusTarget(
      event.key,
      list.indexOf(document.activeElement as HTMLButtonElement),
      list.map((item) => item.disabled),
    )
    if (target === null) return
    event.preventDefault()
    list[target]?.focus()
  }
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
        ref={trigger}
        type="button"
        className={styles.iconButton}
        aria-label={label}
        aria-haspopup="menu"
        popoverTarget={id}
      >
        <Ellipsis aria-hidden="true" size={16} />
      </button>
      <div
        ref={menu}
        id={id}
        popover="auto"
        role="menu"
        aria-label={label}
        className={styles.menu}
        onKeyDown={onKeyDown}
      >
        {regular.map(renderItem)}
        {destructive.length > 0 && regular.length > 0 ? (
          <hr role="separator" className={styles.menuSeparator} />
        ) : null}
        {destructive.map(renderItem)}
      </div>
    </>
  )
}
