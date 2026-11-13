'use client'

import { BookOpen, Redo2, Search } from 'lucide-react'
import type { ReactNode, RefObject } from 'react'
import styles from './editor-shell.module.css'
import type { OverflowItem } from './top-bar'
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '../generated/ui/components/ui/sheet'

export type MoreLink = { label: string; href: string }

/**
 * The phone's More actions: what the desktop bar shows (Redo, Commands), the editor's menu and its
 * links, with destructive actions last after a separator. A list of buttons in a dialog, not an
 * ARIA menu, so Tab and the sheet's own focus trap are all the keyboard needs.
 */
export function MoreActionsList({ redo, onCommands, items, links = [], onDone }: {
  redo: { disabled: boolean; onClick(): void }
  onCommands?: () => void
  items: readonly OverflowItem[]
  links?: readonly MoreLink[]
  onDone(): void
}) {
  const run = (action: () => void) => () => { onDone(); action() }
  const regular = items.filter(item => !item.destructive)
  const destructive = items.filter(item => item.destructive)
  const button = (key: string, label: string, onClick: () => void, icon: ReactNode, extra: { disabled?: boolean; destructive?: boolean } = {}) => (
    <li key={key}>
      <button type="button" className={styles.moreItem} disabled={extra.disabled} data-destructive={extra.destructive ? '' : undefined} onClick={onClick}>
        {icon}{label}
      </button>
    </li>
  )
  return (
    <ul className={styles.moreList}>
      {button('redo', 'Redo', run(redo.onClick), <Redo2 aria-hidden="true" size={16} />, { disabled: redo.disabled })}
      {onCommands && button('commands', 'Commands', run(onCommands), <Search aria-hidden="true" size={16} />)}
      {regular.map(item => button(item.id, item.label, run(item.onSelect), null, { disabled: item.disabled }))}
      {links.map(link => (
        <li key={link.href}>
          <a className={styles.moreItem} href={link.href}><BookOpen aria-hidden="true" size={16} />{link.label}</a>
        </li>
      ))}
      {destructive.length > 0 && <li role="separator" className={styles.moreSeparator} />}
      {destructive.map(item => button(item.id, item.label, run(item.onSelect), null, { disabled: item.disabled, destructive: true }))}
    </ul>
  )
}

/** The bottom sheet that holds the phone's More actions. */
export function MoreActionsSheet({ open, onOpenChange, returnFocus, ...list }: {
  open: boolean
  onOpenChange(open: boolean): void
  /** The button that opened the sheet; it is opened by state, so focus is returned by hand. */
  returnFocus: RefObject<HTMLElement | null>
} & Omit<Parameters<typeof MoreActionsList>[0], 'onDone'>) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" aria-label="More actions" className={styles.phoneSheet}
        onCloseAutoFocus={(event) => { event.preventDefault(); returnFocus.current?.focus() }}>
        <SheetHeader>
          <SheetTitle>More actions</SheetTitle>
          <SheetDescription className="sr-only">Actions that do not fit in the top bar on a phone.</SheetDescription>
        </SheetHeader>
        <MoreActionsList {...list} onDone={() => onOpenChange(false)} />
      </SheetContent>
    </Sheet>
  )
}
