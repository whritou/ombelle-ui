'use client'

import { Redo2, Undo2 } from 'lucide-react'
import { useEffect, useRef, type ReactNode, type Ref } from 'react'
import styles from './editor-shell.module.css'
import { OverflowMenu, type OverflowItem } from './overflow-menu'

type HistoryAction = {
  disabled: boolean
  onClick(): void
  buttonRef: Ref<HTMLButtonElement>
}

export function EditorTopBar({
  crumbs,
  nameField,
  revision,
  status,
  undo,
  redo,
  menu,
  primary,
  extra,
}: {
  crumbs: readonly string[]
  nameField: {
    id: string
    label: string
    value: string
    maxLength: number
    invalid?: boolean
    readOnly?: boolean
    onChange(value: string): void
  }
  revision: string
  status: string
  undo: HistoryAction
  redo: HistoryAction
  menu: { label: string; items: readonly OverflowItem[] }
  primary: ReactNode
  extra?: ReactNode
}) {
  const bar = useStickyBarHeight()
  return (
    <header ref={bar} className={styles.topBar}>
      <nav aria-label="Breadcrumb" className={styles.crumbs}>
        {crumbs.map((crumb, index) => (
          <span key={`${index}-${crumb}`}>{crumb}</span>
        ))}
      </nav>
      <div className={styles.nameField}>
        <label htmlFor={nameField.id}>{nameField.label}</label>
        <input
          id={nameField.id}
          type="text"
          value={nameField.value}
          maxLength={nameField.maxLength}
          readOnly={nameField.readOnly}
          aria-invalid={nameField.invalid ? true : undefined}
          onChange={(event) => nameField.onChange(event.target.value)}
        />
      </div>
      <span className={styles.revision}>{revision}</span>
      <span role="status" className={styles.status}>
        {status}
      </span>
      <div className={styles.topActions}>
        <button
          type="button"
          ref={undo.buttonRef}
          className={styles.iconButton}
          aria-label="Undo"
          disabled={undo.disabled}
          onClick={undo.onClick}
        >
          <Undo2 aria-hidden="true" size={16} />
        </button>
        <button
          type="button"
          ref={redo.buttonRef}
          className={styles.iconButton}
          aria-label="Redo"
          disabled={redo.disabled}
          onClick={redo.onClick}
        >
          <Redo2 aria-hidden="true" size={16} />
        </button>
        <OverflowMenu id={`${nameField.id}-menu`} label={menu.label} items={menu.items} />
        {extra}
        {primary}
      </div>
    </header>
  )
}

/** CSS variable holding the pinned top bar's height, for sticky panels below it. */
export const editorBarHeightVar = '--editor-bar-height'

// The bar wraps on narrow screens, so its height is measured, not assumed.
function useStickyBarHeight() {
  const ref = useRef<HTMLElement>(null)
  useEffect(() => {
    const element = ref.current
    if (!element || typeof ResizeObserver === 'undefined') return
    const root = document.documentElement
    const update = () =>
      root.style.setProperty(editorBarHeightVar, `${element.getBoundingClientRect().height}px`)
    update()
    const observer = new ResizeObserver(update)
    observer.observe(element)
    return () => {
      observer.disconnect()
      root.style.removeProperty(editorBarHeightVar)
    }
  }, [])
  return ref
}
