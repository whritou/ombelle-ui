'use client'

import dynamic from 'next/dynamic'
import { Redo2, Search, Undo2 } from 'lucide-react'
import { useEffect, useRef, useState, type ReactNode, type Ref } from 'react'
import { editableComponents } from '../editor/editable-components'
import { isCommandShortcut, paletteGroups, type PaletteGroup } from './command-groups'
import styles from './editor-shell.module.css'
import { OverflowMenu, type OverflowItem } from './overflow-menu'
import { Button } from '../generated/ui/components/ui/button'
import { ButtonGroup } from '../generated/ui/components/ui/button-group'

// The palette and its command menu load on first open, so they add nothing to the first page load.
const CommandPalette = dynamic(() => import('./command-palette'), { ssr: false })

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
  commands,
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
  /** The editor's own command groups for the Ctrl+K palette, such as its style families. */
  commands?: readonly PaletteGroup[]
}) {
  const bar = useStickyBarHeight()
  const [palette, setPalette] = useState(false)
  const [paletteLoaded, setPaletteLoaded] = useState(false)
  const openPalette = (open: boolean) => {
    if (open) setPaletteLoaded(true)
    setPalette(open)
  }
  useEffect(() => {
    if (!commands) return
    const toggle = (event: KeyboardEvent) => {
      if (!isCommandShortcut(event)) return
      // Ctrl+K also works from text fields; the browser's own use of it gives way.
      event.preventDefault()
      setPaletteLoaded(true)
      setPalette(open => !open)
    }
    window.addEventListener('keydown', toggle)
    return () => window.removeEventListener('keydown', toggle)
  }, [commands])
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
        <ButtonGroup aria-label="History" className={styles.historyGroup}>
          <Button
            variant="ghost"
            size="icon-sm"
            ref={undo.buttonRef}
            className={styles.iconButton}
            aria-label="Undo"
            disabled={undo.disabled}
            onClick={undo.onClick}
          >
            <Undo2 aria-hidden="true" size={16} />
          </Button>
          <Button
            variant="ghost"
            size="icon-sm"
            ref={redo.buttonRef}
            className={styles.iconButton}
            aria-label="Redo"
            disabled={redo.disabled}
            onClick={redo.onClick}
          >
            <Redo2 aria-hidden="true" size={16} />
          </Button>
        </ButtonGroup>
        {commands && (
          // Compact, so the bar keeps one row: the icon and the shortcut. Its name, "Commands Ctrl K",
          // includes the keys it shows.
          <button type="button" className={styles.commandsButton} title="Commands (Ctrl+K)"
            aria-keyshortcuts="Control+K Meta+K" onClick={() => openPalette(true)}>
            <Search aria-hidden="true" size={14} />
            <span className="sr-only">Commands </span>
            <span className={styles.commandsKeys}><kbd>Ctrl</kbd> <kbd>K</kbd></span>
          </button>
        )}
        <OverflowMenu id={`${nameField.id}-menu`} label={menu.label} items={menu.items} />
        {extra}
        {primary}
      </div>
      {commands && paletteLoaded && (
        <CommandPalette open={palette} onOpenChange={openPalette}
          groups={paletteGroups(commands, menu.items, editableComponents, typeof window === 'undefined' ? '' : window.location.pathname)} />
      )}
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
