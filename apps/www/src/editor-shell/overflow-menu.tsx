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
 * Fixed position for a menu opening under its trigger, right edges aligned,
 * kept inside the viewport.
 */
export function menuPosition(
  trigger: Pick<DOMRect, 'bottom' | 'right'>,
  viewportWidth: number,
  gap = 4,
): { top: number; right: number } {
  return {
    top: Math.round(trigger.bottom + gap),
    right: Math.max(gap, Math.round(viewportWidth - trigger.right)),
  }
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
  // The menu opens under its trigger, then focus moves to its first enabled item.
  useEffect(() => {
    const element = menu.current
    if (!element) return
    const place = () => {
      const anchor = trigger.current?.getBoundingClientRect()
      if (!anchor) return
      const { top, right } = menuPosition(anchor, document.documentElement.clientWidth)
      element.style.top = top + 'px'
      element.style.right = right + 'px'
    }
    const onBeforeToggle = (event: Event) => {
      if ((event as Event & { newState?: string }).newState === 'open') place()
    }
    const onToggle = (event: Event) => {
      if ((event as Event & { newState?: string }).newState !== 'open') return
      menuItems().find((item) => !item.disabled)?.focus()
    }
    // The pinned top bar keeps the trigger in place on scroll; a resize can move it.
    const onResize = () => {
      if (element.matches(':popover-open')) place()
    }
    element.addEventListener('beforetoggle', onBeforeToggle)
    element.addEventListener('toggle', onToggle)
    window.addEventListener('resize', onResize)
    return () => {
      element.removeEventListener('beforetoggle', onBeforeToggle)
      element.removeEventListener('toggle', onToggle)
      window.removeEventListener('resize', onResize)
    }
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
