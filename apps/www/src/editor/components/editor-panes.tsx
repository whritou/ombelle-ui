'use client'

import { Code2, LayoutGrid, SlidersHorizontal } from 'lucide-react'
import { EditorDock, type DockTab } from '../../editor-shell'
import type { EditorView } from '../model'
import type { MatrixLayout } from '../use-matrix-layout'
import styles from './button-editor.module.css'

export type Pane = EditorView['panel']

/**
 * The phone's panes for a component editor. Customize shows the inspector under a pinned, compact
 * preview; Matrix shows the preview in its Matrix layout; Code shows the generated output. Above
 * 768px every pane is on screen and these classes do nothing.
 */
export function paneClasses(pane: Pane) {
  return {
    rail: `${styles.rail} ${pane !== 'customize' ? styles.mobileHiddenRail : ''}`,
    primary: `${styles.primary} ${pane === 'customize' ? styles.paneCustomize : ''}`,
    preview: `${styles.previewSection} ${pane === 'code' ? styles.mobileHiddenPreview : ''}`,
    code: `${styles.codeSection} ${pane !== 'code' ? styles.mobileHiddenCode : ''}`,
  }
}

/** Switches the pane; entering Matrix turns the Matrix layout on, leaving it turns it off. */
export function switchPane(pane: Pane, previous: Pane, matrix: MatrixLayout, setView: (update: (view: EditorView) => EditorView) => void) {
  if (pane === 'matrix' && previous !== 'matrix') matrix.setLayout('matrix')
  if (pane !== 'matrix' && previous === 'matrix') matrix.setLayout('single')
  setView(view => ({ ...view, panel: pane }))
}

export function ComponentEditorDock({ name, pane, matrix, onChange }: {
  name: string
  pane: Pane
  matrix: MatrixLayout
  onChange(pane: Pane): void
}) {
  const tabs: DockTab<Pane>[] = [
    { value: 'customize', label: 'Customize', icon: <SlidersHorizontal aria-hidden="true" /> },
    ...(matrix.available ? [{ value: 'matrix' as const, label: 'Matrix', icon: <LayoutGrid aria-hidden="true" /> }] : []),
    { value: 'code', label: 'Code', icon: <Code2 aria-hidden="true" /> },
  ]
  return <EditorDock label={`${name} editor panes`} value={pane} tabs={tabs} onChange={onChange} />
}
