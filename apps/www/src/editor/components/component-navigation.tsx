import type { ComponentId } from '@ombelle/contracts'
import styles from '../../editor-shell/editor-shell.module.css'
import { editableComponents } from '../editable-components'

export function ComponentNavigation({ current }: { current: ComponentId }) {
  return (
    <nav className={styles.componentNavigation} aria-label="Editable components">
      {editableComponents.map(component => (
        <a key={component.id} href={component.href} aria-current={component.id === current ? 'page' : undefined}>
          {component.label}
        </a>
      ))}
      <a href="/components">Browse all components</a>
    </nav>
  )
}
