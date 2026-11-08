'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { FoundationError, validateRecipe, type Recipe, type StyleFamily } from '@ombelle/contracts'
import exampleRecipe from '../../../../../examples/recipe.example.json'
import { defaultSiteFamily } from '../../snapshots/install-command'
import { changeDraftFamily, draftFamily, experimentalNotice, resetDraftRecipe, type EditorDraft, type EditorView } from '../model'
import { recordDraft, redo, undo, type EditorHistory } from '../history'
import { DRAFT_STORAGE_KEY, preserveRecovery, readRecoveries, recipeFilename, restoreDraft, serializeDraft, serializeRecipe } from '../storage'
import { resultMatchesDraft } from '../result-match'
import { useCompiler } from '../use-compiler'
import type { CompileDiagnostic } from '../compile-protocol'
import { PreviewFrame } from './preview-frame'
import { PropertiesPanel } from './properties-panel'
import { ArtifactPanel } from './artifact-panel'
import { ComponentNavigation } from './component-navigation'
import { EditorTabs } from './editor-tabs'
import { RecipeGetCode } from '../../recipe-snapshots/components/recipe-get-code'
import { EditorTopBar, SegmentedControl, previewModeOptions, previewWidthOptions, type OverflowItem } from '../../editor-shell'
import styles from './button-editor.module.css'

const initialDraft: EditorDraft = changeDraftFamily({ storageVersion: 1, recipe: validateRecipe(exampleRecipe) }, defaultSiteFamily)
const initialRecipeJson = serializeRecipe(initialDraft)
const initialView: EditorView = { mode: 'light', viewport: 'wide', panel: 'preview', forcedState: 'none' }
const initialHistory: EditorHistory = { past: [], present: initialDraft, future: [] }

function download(name: string, text: string, type: string) {
  const url = URL.createObjectURL(new Blob([text], { type }))
  const link = document.createElement('a')
  link.href = url
  link.download = name
  try {
    document.body.append(link)
    link.click()
  } finally {
    link.remove()
    window.setTimeout(() => URL.revokeObjectURL(url), 1000)
  }
}

export function ButtonEditor() {
  const [history, setHistory] = useState<EditorHistory>(initialHistory)
  const [view, setView] = useState<EditorView>(initialView)
  const [hydrated, setHydrated] = useState(false)
  const [recovery, setRecovery] = useState<string | null>(null)
  const [preservedRecoveries, setPreservedRecoveries] = useState<string[]>([])
  const [diagnostic, setDiagnostic] = useState<CompileDiagnostic | null>(null)
  const [status, setStatus] = useState('Loading local draft…')
  const draft = history.present
  const compilation = useCompiler(draft.recipe)
  const undoButton = useRef<HTMLButtonElement>(null)
  const redoButton = useRef<HTMLButtonElement>(null)
  const focusAfterHistory = useRef<HTMLButtonElement | null>(null)

  useEffect(() => {
    focusAfterHistory.current?.focus()
    focusAfterHistory.current = null
  }, [history])

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
      setHydrated(true)
    } catch {
      setStatus('Local storage is unavailable. Changes will stay in this tab.')
    }
    try { setPreservedRecoveries(readRecoveries(window.localStorage)) }
    catch { setStatus('The local recovery archive could not be read. Its bytes were left unchanged.') }
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
    try {
      // The shipped Neo-Brutalism specimen pins square corners and a hard shadow.
      const source = family === 'liquid-glass' && serializeRecipe(draft) === initialRecipeJson
        ? resetDraftRecipe(draft, initialDraft.recipe)
        : draft
      edit(changeDraftFamily(source, family).recipe, 'family')
    }
    catch (error) { setDiagnostic({ code: 'INVALID_PRESET', message: error instanceof Error ? error.message : 'Unsupported preset.', path: '/presetRef' }) }
  }

  function resetRecipe() {
    try {
      setHistory(recordDraft(history, resetDraftRecipe(draft, initialDraft.recipe).recipe, { groupKey: 'reset', at: Date.now() }))
      setDiagnostic(null)
      setStatus('Recipe reset to the starting content and family values. Undo restores your changes.')
    } catch {
      setStatus('Recipe reset failed. Your draft is unchanged.')
    }
  }

  function saveDownload() {
    try {
      const text = serializeRecipe(draft)
      if (!exportReady || !recipeJson) throw new Error('Wait for the current recipe to compile.')
      download(recipeFilename(draft.recipe), text + '\n', 'application/json;charset=utf-8')
      setStatus('Recipe JSON downloaded.')
    } catch (error) {
      setStatus(error instanceof Error ? `Recipe download failed: ${error.message}` : 'Recipe download failed.')
    }
  }

  function startNewDraft() {
    if (recovery === null) return
    try {
      const preserved = preserveRecovery(window.localStorage, recovery)
      setPreservedRecoveries(preserved)
      setHistory(initialHistory)
      setRecovery(null)
      setStatus('New local draft ready. The original draft is preserved for recovery.')
    } catch {
      setStatus('Could not preserve the stored draft. Free local storage before starting a new draft; the original draft remains available to download.')
    }
  }

  function downloadPreserved(index: number) {
    const raw = preservedRecoveries[index]
    if (raw === undefined) return
    try { download(`button-draft-recovery-${index + 1}.txt`, raw, 'text/plain;charset=utf-8'); setStatus('Preserved draft downloaded.') }
    catch { setStatus('Preserved draft download failed. The local recovery copy remains available.') }
  }

  function downloadRecovery() {
    if (recovery === null) return
    try { download('button-draft-recovery.txt', recovery, 'text/plain;charset=utf-8'); setStatus('Recovery copy downloaded.') }
    catch { setStatus('Recovery download failed. The stored draft is still available.') }
  }

  const previewCurrent = !(compilation.stale || diagnostic || !resultMatchesDraft(compilation.result, draft.recipe))
  const menuItems: OverflowItem[] = [
    { id: 'download-json', label: 'Download recipe JSON', disabled: !recipeJson || recovery !== null, onSelect: saveDownload },
    ...(recovery !== null ? [{ id: 'download-recovery', label: 'Download recovery copy', onSelect: downloadRecovery }] : []),
    ...preservedRecoveries.map((_, index) => ({
      id: `download-preserved-${index}`,
      label: `Download preserved draft${preservedRecoveries.length === 1 ? '' : ` ${index + 1}`}`,
      onSelect: () => downloadPreserved(index),
    })),
    { id: 'reset-recipe', label: 'Reset recipe', destructive: true, disabled: recovery !== null, onSelect: resetRecipe },
  ]

  return <main className={styles.root} aria-label="Button editor">
    <EditorTopBar
      crumbs={['Components', 'Button']}
      nameField={{
        id: 'button-recipe-id', label: 'Recipe ID', value: draft.recipe.id, maxLength: 80, readOnly: true,
        onChange: () => {},
      }}
      revision={`r${draft.recipe.revision}`}
      status={status}
      undo={{
        disabled: !history.past.length || recovery !== null, buttonRef: undoButton,
        onClick: () => {
          // The last undo disables this button; keep keyboard focus on Redo instead of losing it to the page.
          if (history.past.length === 1) focusAfterHistory.current = redoButton.current
          setHistory(undo)
        },
      }}
      redo={{
        disabled: !history.future.length || recovery !== null, buttonRef: redoButton,
        onClick: () => {
          if (history.future.length === 1) focusAfterHistory.current = undoButton.current
          setHistory(redo)
        },
      }}
      menu={{ label: 'More actions', items: menuItems }}
      primary={<RecipeGetCode className={styles.getCode} recipe={compilation.result?.recipe ?? null} current={exportReady && recovery === null} announce={setStatus}
        secondary={<button type="button" onClick={saveDownload} disabled={!recipeJson}>Download JSON instead</button>} />}
    />
    <h1 className={styles.srOnly}>Button editor</h1>
    <ComponentNavigation current="button" />

    {recovery !== null ? <section className={styles.recovery} role="alert" aria-labelledby="recovery-title">
      <h2 id="recovery-title">Your saved draft needs recovery</h2>
      <p>The stored draft could not be validated. Download its original bytes, or start a new draft to keep them in a separate local recovery copy.</p>
      <div className={styles.recoveryActions}>
        <button type="button" onClick={downloadRecovery}>Download recovery copy</button>
        <button type="button" onClick={startNewDraft}>Start new draft</button>
      </div>
    </section> : <>
      {preservedRecoveries.length > 0 && <p className={styles.preservedRecovery}>
        {preservedRecoveries.length} previous invalid draft{preservedRecoveries.length === 1 ? ' is' : 's are'} preserved on this device. Download {preservedRecoveries.length === 1 ? 'it' : 'them'} from More actions.
      </p>}
      <EditorTabs active={view.panel} onChange={(panel) => setView((previous) => ({ ...previous, panel }))} />
      <div className={styles.workspace}>
        <aside className={`${styles.rail} ${view.panel !== 'customize' ? styles.mobileHiddenRail : ''}`} aria-label="Button inspector">
          <PropertiesPanel recipe={draft.recipe} family={draftFamily(draft.recipe)} onFamily={chooseFamily} diagnostic={displayedDiagnostic} onChange={edit}
            onDiagnostic={(path, message) => { setDiagnostic({ code: 'INVALID_DATA', path, message }); setStatus('Recipe change rejected. Review the field error.') }} />
        </aside>
        <div className={`${styles.primary} ${view.panel === 'customize' ? styles.mobileHiddenPrimary : ''}`}>
          <section className={`${styles.previewSection} ${view.panel === 'code' ? styles.mobileHiddenPreview : ''}`} aria-labelledby="preview-title">
            <h2 id="preview-title" className={styles.srOnly}>Live preview</h2>
            <div className={styles.viewControls}>
              <SegmentedControl<EditorView['mode']> label="Preview mode" value={view.mode}
                options={previewModeOptions}
                onChange={(mode) => setView((previous) => ({ ...previous, mode }))} />
              <SegmentedControl<EditorView['viewport']> label="Preview width" value={view.viewport}
                options={previewWidthOptions('Narrow')}
                onChange={(viewport) => setView((previous) => ({ ...previous, viewport }))} />
              <SegmentedControl<EditorView['forcedState']> label="Preview state" value={view.forcedState}
                options={[{ value: 'none', label: 'Rest' }, { value: 'hover', label: 'Hover' }, { value: 'focus', label: 'Focus' }, { value: 'active', label: 'Active' }, { value: 'disabled', label: 'Disabled' }, { value: 'loading', label: 'Loading' }]}
                onChange={(forcedState) => setView((previous) => ({ ...previous, forcedState }))} />
              <p className={styles.previewStatus} data-status={previewCurrent ? 'current' : 'pending'}>
                {previewCurrent ? 'Matches current recipe' : compilation.result ? 'Showing the last valid recipe' : 'Compiling preview…'}
              </p>
            </div>
            <div className={styles.specimen}><PreviewFrame result={compilation.result} view={view} /></div>
          </section>
          <div className={`${styles.codeSection} ${view.panel === 'preview' ? styles.mobileHiddenCode : ''}`}>
            <ArtifactPanel result={compilation.result} recipeJson={recipeJson} stale={!exportReady || diagnostic !== null} onStatus={setStatus}
              notice={experimentalNotice(draftFamily(draft.recipe))} />
          </div>
        </div>
      </div>
    </>}
  </main>
}
