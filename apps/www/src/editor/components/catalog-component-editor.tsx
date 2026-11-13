'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { canonicalize } from '@ombelle/compiler'
import { resolveRecipePreset } from '@ombelle/catalog'
import { styleSupport, validateComponentRecipe, type ComponentRecipe } from '@ombelle/contracts'
import { siteFamilyOrder } from '../../snapshots/install-command'
import { downloadPresetText } from '../../preset-editor/components/preset-export-panel'
import { RecipeGetCode } from '../../recipe-snapshots/components/recipe-get-code'
import { EditorTopBar, SegmentedControl, familyCommands, previewModeOptions, previewTransparencyOptions, previewWidthOptions, useReducedTransparencySupport } from '../../editor-shell'
import { catalogDraftKey, catalogPresetRef, createCatalogDraft, restoreCatalogDraft } from '../catalog-draft'
import { familyNames } from './family-picker'
import { HISTORY_LIMIT } from '../history'
import type { EditorView } from '../model'
import { preserveRecovery, readRecoveries, recipeFilename } from '../storage'
import { useCatalogCompiler } from '../use-catalog-compiler'
import { useRecipeBatch } from '../use-recipe-batch'
import { changesSummaryFor } from './changes-summary'
import { MatrixControls } from './matrix-controls'
import { useMatrixLayout } from '../use-matrix-layout'
import type { MeasuredParts } from '../catalog-preview-protocol'
import { ArtifactPanel } from './artifact-panel'
import { CatalogProperties } from './catalog-properties'
import { ComponentNavigation } from './component-navigation'
import { EditorTabs } from './editor-tabs'
import { PreviewFrame } from './preview-frame'
import styles from './button-editor.module.css'
import { ScrollArea } from '../../generated/ui/components/ui/scroll-area'

type History = { past: ComponentRecipe[]; present: ComponentRecipe; future: ComponentRecipe[] }

export function CatalogComponentEditor({ component, name }: { component: ComponentRecipe['component']; name: string }) {
  const [history, setHistory] = useState<History>(() => ({ past: [], present: createCatalogDraft(component).recipe, future: [] }))
  const [hydrated, setHydrated] = useState(false)
  const [recovery, setRecovery] = useState<string | null>(null)
  const [recoveries, setRecoveries] = useState<string[]>([])
  const [status, setStatus] = useState('Loading draft…')
  const [measured, setMeasured] = useState<MeasuredParts>({})
  const [view, setView] = useState<EditorView>({ mode: 'light', viewport: 'wide', panel: 'preview', forcedState: 'none' })
  // Preview state only: never saved with the recipe.
  const [transparency, setTransparency] = useState<'auto' | 'reduced'>('auto')
  const transparencySupported = useReducedTransparencySupport()
  const undoRef = useRef<HTMLButtonElement>(null)
  const redoRef = useRef<HTMLButtonElement>(null)
  const focusAfterHistory = useRef<HTMLButtonElement | null>(null)
  const recipe = history.present
  const matrix = useMatrixLayout(component, recipe)
  const glassFamily = resolveRecipePreset(recipe.presetRef).styleFamily === 'liquid-glass'
  const { result, error, pending } = useCatalogCompiler(recipe)
  // The catalog default for the same family and preset: what Changes and Get code compare to.
  const presetKey = JSON.stringify(recipe.presetRef)
  const defaults = useMemo(() => [{ ...createCatalogDraft(recipe.component).recipe, presetRef: JSON.parse(presetKey) }],
    [recipe.component, presetKey])
  const reference = useRecipeBatch('catalog', defaults).results?.[0] ?? null
  const [showChanges, setShowChanges] = useState(0)
  const key = catalogDraftKey(component)
  const recoveryKey = `${key}.recoveries`
  useEffect(() => {
    focusAfterHistory.current?.focus()
    focusAfterHistory.current = null
  }, [history])
  useEffect(() => {
    try {
      const state = restoreCatalogDraft(component, localStorage.getItem(key))
      if (state.status === 'restored') setHistory({ past: [], present: state.draft.recipe, future: [] })
      if (state.status === 'recovery-required') setRecovery(state.recoveryText)
      setRecoveries(readRecoveries(localStorage, recoveryKey))
      setStatus(state.status === 'restored' ? 'Draft restored.' : 'Draft ready.')
    } catch {
      setStatus('Draft storage unavailable.')
    }
    setHydrated(true)
  }, [component, key, recoveryKey])
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
  // The summary diffs every file, so it is worked out once per result, not on every render.
  const changes = useMemo(() => changesSummaryFor(ready ? result : null, reference, () => setShowChanges(count => count + 1)), [ready, result, reference])
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

  return <main className={styles.root} aria-label={`${name} editor`} data-editor-root="">
    <EditorTopBar crumbs={[{ label: 'Components', href: '/editor/component' }, name]}
      commands={[familyCommands(siteFamilyOrder.filter(style => styleSupport(recipe.component, style) !== 'unavailable'),
        resolveRecipePreset(recipe.presetRef).styleFamily, familyNames, style => edit({ ...recipe, presetRef: catalogPresetRef(style) }))]} status={status} revision={`r${recipe.revision}`}
      nameField={{ id: `${component}-recipe-id`, label: 'Recipe ID', value: recipe.id, maxLength: 80, readOnly: true, onChange: () => {} }}
      undo={{ buttonRef: undoRef, disabled: !history.past.length || recovery !== null, onClick: () => {
        if (history.past.length === 1) focusAfterHistory.current = redoRef.current
        undo()
      } }}
      redo={{ buttonRef: redoRef, disabled: !history.future.length || recovery !== null, onClick: () => {
        if (history.future.length === 1) focusAfterHistory.current = undoRef.current
        redo()
      } }}
      menu={{ label: 'More actions', items: [
        { id: 'download-json', label: 'Download recipe JSON', disabled: !ready, onSelect: save },
        { id: 'reset-recipe', label: 'Reset recipe', destructive: true, disabled: recovery !== null,
          onSelect: () => edit(createCatalogDraft(component).recipe) },
        ...recoveries.map((bytes, index) => ({
          id: `recovery-${index}`, label: `Download preserved draft ${index + 1}`,
          onSelect: () => downloadPresetText(bytes, `${component}-draft-recovery-${index + 1}.txt`),
        })),
      ] }}
      primary={<RecipeGetCode className={styles.getCode} recipe={result?.recipe ?? null} current={ready}
        summary={changes}
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
            setRecoveries(preserveRecovery(localStorage, recovery, recoveryKey))
            setRecovery(null)
          } catch { setStatus('Could not preserve the recovery copy.') }
        }}>Start new draft</button>
      </div>
    </section> : <>
      <EditorTabs active={view.panel} onChange={panel => setView(previous => ({ ...previous, panel }))} />
      <div className={styles.workspace}>
        <aside className={`${styles.rail} ${view.panel !== 'customize' ? styles.mobileHiddenRail : ''}`} aria-label={`${name} inspector`}>
          <ScrollArea className={`www-scroll ${styles.railScroll}`} aria-label="Inspector controls">
            <div className={styles.railContent}>
              <CatalogProperties recipe={recipe} measured={measured} previewMode={view.mode} update={edit} />
              {error && <p role="alert" className="fieldError">{error}</p>}
            </div>
          </ScrollArea>
        </aside>
        <div className={`${styles.primary} ${view.panel === 'customize' ? styles.mobileHiddenPrimary : ''}`}>
          <section className={`${styles.previewSection} ${view.panel === 'code' ? styles.mobileHiddenPreview : ''}`} aria-label="Live preview">
            <div className={styles.viewControls}>
              <SegmentedControl label="Preview mode" value={view.mode} options={previewModeOptions}
                onChange={mode => setView(previous => ({ ...previous, mode }))} />
              {glassFamily && transparencySupported && <SegmentedControl<'auto' | 'reduced'> label="Preview transparency" value={transparency}
                options={previewTransparencyOptions} onChange={setTransparency} />}
              <MatrixControls matrix={matrix} />
              <SegmentedControl label="Preview width" value={view.viewport} options={previewWidthOptions('Narrow')}
                onChange={viewport => setView(previous => ({ ...previous, viewport }))} />
              <p className={styles.previewStatus} data-status={ready ? 'current' : 'pending'}>
                {ready ? 'Matches current recipe' : result ? 'Showing the last valid recipe' : 'Compiling preview…'}
              </p>
            </div>
            <div className={styles.specimen}><PreviewFrame result={result} view={view} component={component} componentName={name} onMeasure={setMeasured}
              reducedTransparency={glassFamily && transparencySupported && transparency === 'reduced'} matrix={matrix.matrix} /></div>
          </section>
          <div className={`${styles.codeSection} ${view.panel === 'preview' ? styles.mobileHiddenCode : ''}`}>
            <ArtifactPanel result={result} recipeJson={json} stale={!ready} onStatus={setStatus} componentName={name}
              reference={reference} showChanges={showChanges} />
          </div>
        </div>
      </div>
    </>}
  </main>
}
