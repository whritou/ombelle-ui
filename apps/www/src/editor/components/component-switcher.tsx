'use client'

import { ChevronDown, Search } from 'lucide-react'
import { useId, useRef, useState } from 'react'
import type { ComponentId } from '@ombelle/contracts'
import styles from '../../editor-shell/editor-shell.module.css'
import { useViewportClass } from '../../editor-shell/breakpoints'
import { editableComponents } from '../editable-components'
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '../../generated/ui/components/ui/sheet'

type EditableComponent = (typeof editableComponents)[number]

/** The components whose label contains the query, ignoring case and surrounding spaces, in list order. */
export function filterComponents(query: string, list: readonly EditableComponent[] = editableComponents): readonly EditableComponent[] {
  const needle = query.trim().toLowerCase()
  return needle ? list.filter(component => component.label.toLowerCase().includes(needle)) : list
}

/**
 * The trail's current page as a button that opens every component editor, with search, Browse all
 * components and the guide. Replaces the component row on every width: a bottom sheet on a phone,
 * a side sheet otherwise.
 */
export function ComponentSwitcher({ current }: { current: ComponentId }) {
  const active = editableComponents.find(component => component.id === current)
  const label = active?.label ?? current
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const trigger = useRef<HTMLButtonElement>(null)
  const searchId = useId()
  const viewport = useViewportClass()
  const shown = filterComponents(query)
  return (
    <>
      <button ref={trigger} type="button" className={styles.switcher} aria-haspopup="dialog" aria-expanded={open}
        aria-label={`Component: ${label}. Choose a component`} onClick={() => setOpen(true)}>
        {label}<ChevronDown aria-hidden="true" size={14} />
      </button>
      <Sheet open={open} onOpenChange={(next) => { setOpen(next); if (!next) setQuery('') }}>
        <SheetContent side={viewport === 'phone' ? 'bottom' : 'inline-end'} aria-label="Choose a component" className={styles.phoneSheet}
          onCloseAutoFocus={(event) => { event.preventDefault(); trigger.current?.focus() }}>
          <SheetHeader>
            <SheetTitle>Choose a component</SheetTitle>
            <SheetDescription className="sr-only">Open the editor of another component.</SheetDescription>
          </SheetHeader>
          <div className={styles.switcherSearch}>
            <label htmlFor={searchId} className="sr-only">Search components</label>
            <Search aria-hidden="true" size={16} />
            <input id={searchId} type="search" value={query} placeholder="Search components" autoComplete="off"
              onChange={(event) => setQuery(event.target.value)} />
          </div>
          <ul aria-label="Components" className={styles.switcherList}>
            {shown.map(component => (
              <li key={component.id}>
                <a href={component.href} aria-current={component.id === current ? 'page' : undefined}>
                  {component.label}{component.id === current && <span>Editing</span>}
                </a>
              </li>
            ))}
            {shown.length === 0 && <li className={styles.switcherEmpty}>No component matches “{query.trim()}”.</li>}
          </ul>
          <div className={styles.switcherLinks}>
            <a href="/components">Browse all components</a>
            <a href="/docs/component-editor">Component editor guide</a>
          </div>
        </SheetContent>
      </Sheet>
    </>
  )
}
