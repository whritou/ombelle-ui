import type { ComponentId } from '@ombelle/contracts'
import styles from '../../editor-shell/editor-shell.module.css'
import { editableComponents } from '../editable-components'

export function ComponentNavigation({ current }: { current: ComponentId }) {
  const active = editableComponents.find(component => component.id === current)
  return (
    <nav className={styles.componentNavigation} aria-label="Editable components">
      {active && <a href={active.href} aria-current="page">{active.label}</a>}
      {editableComponents.length > 1 && <details className="relative">
        <summary className="cursor-pointer rounded-lg px-3 py-2 text-sm font-medium">Choose a component</summary>
        <ul className="absolute z-20 mt-1 grid max-h-72 w-56 list-none overflow-auto rounded-lg border border-border bg-card p-1 shadow-soft">
          {editableComponents.filter(component => component.id !== current).map(component =>
            <li key={component.id}><a className="w-full" href={component.href}>{component.label}</a></li>)}
        </ul>
      </details>}
      <a href="/components">Browse all components</a>
    </nav>
  )
}
