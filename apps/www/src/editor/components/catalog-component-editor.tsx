'use client'

import { useEffect, useRef, useState } from 'react'
import { canonicalize } from '@ombelle/compiler'
import { validateComponentRecipe, type ComponentRecipe } from '@ombelle/contracts'
import { downloadPresetText } from '../../preset-editor/components/preset-export-panel'
import { RecipeGetCode } from '../../recipe-snapshots/components/recipe-get-code'
import { EditorTopBar, SegmentedControl, previewModeOptions, previewWidthOptions } from '../../editor-shell'
import { catalogDraftKey, createCatalogDraft, restoreCatalogDraft } from '../catalog-draft'
import { HISTORY_LIMIT } from '../history'
import type { EditorView } from '../model'
import { recipeFilename } from '../storage'
import { useCatalogCompiler } from '../use-catalog-compiler'
import { ArtifactPanel } from './artifact-panel'
import { CatalogProperties } from './catalog-properties'
import { ComponentNavigation } from './component-navigation'
import { EditorTabs } from './editor-tabs'
import { PreviewFrame } from './preview-frame'
import styles from './button-editor.module.css'

type History = { past: ComponentRecipe[]; present: ComponentRecipe; future: ComponentRecipe[] }

export function CatalogComponentEditor({ component, name }: { component: ComponentRecipe['component']; name: string }) {
  const [history, setHistory] = useState<History>(() => ({ past: [], present: createCatalogDraft(component).recipe, future: [] }))
  const [hydrated, setHydrated] = useState(false)
  const [recovery, setRecovery] = useState<string | null>(null)
  const [status, setStatus] = useState('Loading draft…')
  const [view, setView] = useState<EditorView>({ mode: 'light', viewport: 'wide', panel: 'preview', forcedState: 'none' })
  const undoRef = useRef<HTMLButtonElement>(null)
  const redoRef = useRef<HTMLButtonElement>(null)
  const recipe = history.present
  const { result, error, pending } = useCatalogCompiler(recipe)
  const key = catalogDraftKey(component)
  useEffect(() => {
    try {
      const state = restoreCatalogDraft(component, localStorage.getItem(key))
      if (state.status === 'restored') setHistory({ past: [], present: state.draft.recipe, future: [] })
      if (state.status === 'recovery-required') setRecovery(state.recoveryText)
      setStatus(state.status === 'restored' ? 'Draft restored.' : 'Draft ready.')
    } catch {
      setStatus('Draft storage unavailable.')
    }
    setHydrated(true)
  }, [component, key])
  useEffect(() => {
    if (!hydrated || recovery !== null) return
    let data: ComponentRecipe
    try { data = validateComponentRecipe(recipe) } catch { return }
    try {
      localStorage.setItem(key, JSON.stringify({ storageVersion: 1, recipe: data }))
      setStatus('Draft saved locally.')
    } catch { setStatus('Draft storage unavailable.') }
  }, [hydrated, key, recipe, recovery])

  const ready = hydrated && recovery === null && !pending && !error && result !== null &&
    canonicalize(result.recipe.data) === canonicalize(recipe)
  const json = ready ? canonicalize(result.recipe.data) + '\n' : null
  const save = () => {
    if (!json) return
    downloadPresetText(json, recipeFilename(recipe))
    setStatus('Recipe JSON downloaded.')
  }
  const edit = (next: ComponentRecipe) => setHistory(previous => ({
    past: [...previous.past, previous.present].slice(-HISTORY_LIMIT), present: next, future: [],
  }))
  const undo = () => setHistory(previous => previous.past.length ? ({
    past: previous.past.slice(0, -1), present: previous.past.at(-1)!, future: [previous.present, ...previous.future],
  }) : previous)
  const redo = () => setHistory(previous => previous.future.length ? ({
    past: [...previous.past, previous.present].slice(-HISTORY_LIMIT), present: previous.future[0], future: previous.future.slice(1),
  }) : previous)

  return <main className={styles.root} aria-label={`${name} editor`}>
    <EditorTopBar crumbs={['Components', name]} status={status} revision={`r${recipe.revision}`}
      nameField={{ id: `${component}-recipe-id`, label: 'Recipe ID', value: recipe.id, maxLength: 80, readOnly: true, onChange: () => {} }}
      undo={{ buttonRef: undoRef, disabled: !history.past.length || recovery !== null, onClick: undo }}
      redo={{ buttonRef: redoRef, disabled: !history.future.length || recovery !== null, onClick: redo }}
      menu={{ label: 'More actions', items: [
        { id: 'download-json', label: 'Download recipe JSON', disabled: !ready, onSelect: save },
        { id: 'reset-recipe', label: 'Reset recipe', destructive: true, disabled: recovery !== null,
          onSelect: () => edit(createCatalogDraft(component).recipe) },
      ] }}
      primary={<RecipeGetCode className={styles.getCode} recipe={result?.recipe ?? null} current={ready}
        componentName={name} storageKey={`${key}.publication`} announce={setStatus}
        secondary={<button type="button" onClick={save} disabled={!ready}>Download JSON instead</button>} />}
    />
    <h1 className={styles.srOnly}>{name} editor</h1>
    <ComponentNavigation current={component} />
    {recovery !== null ? <section className={styles.recovery} role="alert">
      <h2>Your saved draft needs recovery</h2>
      <div className={styles.recoveryActions}>
        <button type="button" onClick={() => downloadPresetText(recovery, `${component}-draft-recovery.txt`)}>Download recovery copy</button>
        <button type="button" onClick={() => {
          try {
            localStorage.setItem(`${key}.recovery`, recovery)
            setRecovery(null)
          } catch { setStatus('Could not preserve the recovery copy.') }
        }}>Start new draft</button>
      </div>
    </section> : <>
      <EditorTabs active={view.panel} onChange={panel => setView(previous => ({ ...previous, panel }))} />
      <div className={styles.workspace}>
        <aside className={`${styles.rail} ${view.panel !== 'customize' ? styles.mobileHiddenRail : ''}`} aria-label={`${name} inspector`}>
          <CatalogProperties recipe={recipe} update={edit} />
          {error && <p role="alert" className="fieldError">{error}</p>}
        </aside>
        <div className={`${styles.primary} ${view.panel === 'customize' ? styles.mobileHiddenPrimary : ''}`}>
          <section className={`${styles.previewSection} ${view.panel === 'code' ? styles.mobileHiddenPreview : ''}`} aria-label="Live preview">
            <div className={styles.viewControls}>
              <SegmentedControl label="Preview mode" value={view.mode} options={previewModeOptions}
                onChange={mode => setView(previous => ({ ...previous, mode }))} />
              <SegmentedControl label="Preview width" value={view.viewport} options={previewWidthOptions('Narrow')}
                onChange={viewport => setView(previous => ({ ...previous, viewport }))} />
              <p className={styles.previewStatus} data-status={ready ? 'current' : 'pending'}>
                {ready ? 'Matches current recipe' : result ? 'Showing the last valid recipe' : 'Compiling preview…'}
              </p>
            </div>
            <div className={styles.specimen}><PreviewFrame result={result} view={view} component={component} componentName={name} /></div>
          </section>
          <div className={`${styles.codeSection} ${view.panel === 'preview' ? styles.mobileHiddenCode : ''}`}>
            <ArtifactPanel result={result} recipeJson={json} stale={!ready} onStatus={setStatus} componentName={name} />
          </div>
        </div>
      </div>
    </>}
  </main>
}
