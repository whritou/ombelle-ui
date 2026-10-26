'use client'

import { useEffect, useMemo, useState } from 'react'
import { FoundationError, validateRecipe, type Recipe, type RecipeCompileResult, type StyleFamily } from '@ombelle/contracts'
import exampleRecipe from '../../../../../examples/recipe.example.json'
import { changeDraftFamily, type EditorDraft, type EditorView } from '../model'
import { recordDraft, redo, undo, type EditorHistory } from '../history'
import { DRAFT_STORAGE_KEY, restoreDraft, serializeDraft, serializeRecipe } from '../storage'
import { useCompiler } from '../use-compiler'
import type { CompileDiagnostic } from '../compile-protocol'
import { PreviewFrame } from './preview-frame'
import { PropertiesPanel } from './properties-panel'
import { ArtifactPanel } from './artifact-panel'
import { EditorTabs } from './editor-tabs'
import { StatusAnnouncer } from './status-announcer'
import styles from './button-editor.module.css'

const initialDraft: EditorDraft = { storageVersion: 1, recipe: validateRecipe(exampleRecipe) }
const initialView: EditorView = { mode: 'light', viewport: 'wide', panel: 'preview', forcedState: 'none' }
const initialHistory: EditorHistory = { past: [], present: initialDraft, future: [] }

function download(name: string, text: string, type: string) {
  const url = URL.createObjectURL(new Blob([text], { type }))
  const link = document.createElement('a')
  link.href = url
  link.download = name
  document.body.append(link)
  link.click()
  link.remove()
  window.setTimeout(() => URL.revokeObjectURL(url), 1000)
}

function resultMatchesDraft(result: RecipeCompileResult | null, recipe: Recipe): boolean {
  if (!result) return false
  const compiled = result.recipe.data
  return compiled.schemaVersion === recipe.schemaVersion && compiled.id === recipe.id &&
    compiled.revision === recipe.revision && compiled.component === recipe.component &&
    compiled.content === recipe.content &&
    JSON.stringify(compiled.presetRef) === JSON.stringify(recipe.presetRef) &&
    JSON.stringify(compiled.overrides) === JSON.stringify(recipe.overrides) &&
    Object.entries(recipe.props).every(([key, value]) => compiled.props[key as keyof Recipe['props']] === value)
}

export function ButtonEditor() {
  const [history, setHistory] = useState<EditorHistory>(initialHistory)
  const [view, setView] = useState<EditorView>(initialView)
  const [hydrated, setHydrated] = useState(false)
  const [recovery, setRecovery] = useState<string | null>(null)
  const [diagnostic, setDiagnostic] = useState<CompileDiagnostic | null>(null)
  const [status, setStatus] = useState('Loading local draft…')
  const draft = history.present
  const compilation = useCompiler(draft.recipe)

  useEffect(() => {
    try {
      const restored = restoreDraft(window.localStorage.getItem(DRAFT_STORAGE_KEY))
      if (restored.status === 'restored') {
        setHistory({ past: [], present: restored.draft, future: [] })
        setStatus('Local draft restored.')
      } else if (restored.status === 'recovery-required') {
        setRecovery(restored.recoveryText)
        setStatus('Stored draft needs recovery.')
      } else setStatus('New local draft ready.')
    } catch {
      setStatus('Local storage is unavailable. Changes will stay in this tab.')
    }
    setHydrated(true)
  }, [])

  useEffect(() => {
    if (!hydrated || recovery !== null) return
    try {
      window.localStorage.setItem(DRAFT_STORAGE_KEY, serializeDraft(draft))
      setStatus('Draft saved locally.')
    } catch {
      setStatus('Draft could not be saved locally. Download recipe JSON to keep a copy.')
    }
  }, [hydrated, recovery, draft])

  useEffect(() => {
    if (compilation.status === 'invalid' && compilation.diagnostic)
      setStatus(`Compilation failed: ${compilation.diagnostic.message}`)
  }, [compilation.status, compilation.diagnostic])

  const exportReady = compilation.status === 'compiled' && !compilation.stale &&
    diagnostic === null && resultMatchesDraft(compilation.result, draft.recipe)
  const recipeJson = useMemo(() => {
    if (!exportReady) return null
    try { return serializeRecipe(draft) } catch { return null }
  }, [draft, exportReady])
  const displayedDiagnostic = diagnostic ?? compilation.diagnostic

  function edit(recipe: Recipe, groupKey: string) {
    try {
      setHistory(recordDraft(history, recipe, { groupKey, at: Date.now() }))
      setDiagnostic(null)
    } catch (error) {
      setDiagnostic(error instanceof FoundationError
        ? { code: error.code, message: error.message, path: error.path }
        : { code: 'INVALID_DATA', message: 'This value cannot be used in a recipe.' })
      setStatus('Recipe change rejected. Review the field error.')
    }
  }

  function chooseFamily(family: StyleFamily) {
    try { edit(changeDraftFamily(draft, family).recipe, 'family') }
    catch (error) { setDiagnostic({ code: 'INVALID_PRESET', message: error instanceof Error ? error.message : 'Unsupported preset.', path: '/presetRef' }) }
  }

  function saveDownload() {
    try {
      const text = serializeRecipe(draft)
      if (!exportReady || !recipeJson) throw new Error('Wait for the current recipe to compile.')
      download(`${draft.recipe.id}-r${draft.recipe.revision}.json`, text + '\n', 'application/json;charset=utf-8')
      setStatus('Recipe JSON downloaded.')
    } catch (error) {
      setStatus(error instanceof Error ? `Recipe download failed: ${error.message}` : 'Recipe download failed.')
    }
  }

  return <main className={styles.root}>
    <header className={styles.header}>
      <div><p className={styles.product}>Ombelle / Component editor</p><h1>Button workbench</h1>
        <p>Shape one Button, inspect its output, and take the recipe into your project.</p></div>
      <div className={styles.headerActions}>
        <button type="button" onClick={() => setHistory(undo)} disabled={!history.past.length || recovery !== null}>Undo</button>
        <button type="button" onClick={() => setHistory(redo)} disabled={!history.future.length || recovery !== null}>Redo</button>
        <button type="button" className={styles.download} onClick={saveDownload} disabled={!recipeJson || recovery !== null}>Download recipe JSON</button>
      </div>
    </header>

    {recovery !== null ? <section className={styles.recovery} role="alert" aria-labelledby="recovery-title">
      <h2 id="recovery-title">Your saved draft needs recovery</h2>
      <p>The stored draft could not be validated. Download its original bytes before starting a new draft.</p>
      <div className={styles.recoveryActions}>
        <button type="button" onClick={() => {
          try { download('button-draft-recovery.txt', recovery, 'text/plain;charset=utf-8'); setStatus('Recovery copy downloaded.') }
          catch { setStatus('Recovery download failed. The stored draft is still available.') }
        }}>Download recovery copy</button>
        <button type="button" onClick={() => { setHistory(initialHistory); setRecovery(null); setStatus('New local draft ready.') }}>Start new draft</button>
      </div>
    </section> : <>
      <EditorTabs active={view.panel} onChange={(panel) => setView((previous) => ({ ...previous, panel }))} />
      <div className={styles.workspace}>
        <div className={`${styles.primary} ${view.panel === 'customize' ? styles.mobileHiddenPrimary : ''}`}>
          <section className={`${styles.previewSection} ${view.panel === 'code' ? styles.mobileHiddenPreview : ''}`} aria-labelledby="preview-title">
            <div className={styles.sectionTitle}><div><h2 id="preview-title">Live preview</h2><p>Compiled Button specimen</p></div>
              <span className={styles.recipeMeta}>Recipe {draft.recipe.id} · r{draft.recipe.revision}</span></div>
            <div className={styles.viewControls}>
              <label>Preview mode <select value={view.mode} onChange={(event) => setView({ ...view, mode: event.target.value as EditorView['mode'] })}><option value="light">Light</option><option value="dark">Dark</option></select></label>
              <label>Preview width <select value={view.viewport} onChange={(event) => setView({ ...view, viewport: event.target.value as EditorView['viewport'] })}><option value="wide">Wide</option><option value="narrow">Narrow</option></select></label>
              <label>Demonstrate state <select value={view.forcedState} onChange={(event) => setView({ ...view, forcedState: event.target.value as EditorView['forcedState'] })}><option value="none">Default</option><option value="focus">Focus</option><option value="hover">Hover</option></select></label>
            </div>
            <div className={styles.specimen}><PreviewFrame result={compilation.result} view={view} /></div>
            <p className={styles.previewStatus}>{compilation.stale || diagnostic || !resultMatchesDraft(compilation.result, draft.recipe)
              ? compilation.result ? 'Preview shows the last valid recipe.' : 'Compiling preview…'
              : 'Preview matches the current recipe.'}</p>
          </section>
          <div className={`${styles.codeSection} ${view.panel === 'preview' ? styles.mobileHiddenCode : ''}`}>
            <ArtifactPanel result={compilation.result} recipeJson={recipeJson} stale={!exportReady || diagnostic !== null} onStatus={setStatus} />
            <p className={styles.hashLine}>Recipe hash: <span data-testid="recipe-hash">{compilation.result?.recipe.hash ?? 'Pending'}</span></p>
          </div>
        </div>
        <aside className={`${styles.rail} ${view.panel !== 'customize' ? styles.mobileHiddenRail : ''}`}>
          <PropertiesPanel recipe={draft.recipe} diagnostic={displayedDiagnostic} onChange={edit} onFamily={chooseFamily}
            onDiagnostic={(path, message) => { setDiagnostic({ code: 'INVALID_DATA', path, message }); setStatus('Recipe change rejected. Review the field error.') }} />
        </aside>
      </div>
    </>}
    <div className={styles.status}><StatusAnnouncer message={status} /></div>
  </main>
}
