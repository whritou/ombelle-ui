'use client'
import { useEffect, useMemo, useRef, useState } from 'react'
import { Download, ShieldCheck } from 'lucide-react'
import type { StyleFamily } from '@ombelle/contracts'
import { defaultSiteFamily, offeredStyleFamilies } from '../../snapshots/install-command'
import {
  applyGlassTint,
  applyStartingPreset,
  createPresetDraft,
  matchingStartingPreset,
  materializePreset,
  presetGlassReport,
  setPresetEdit,
  setPresetIdentity,
  resetPresetField,
  resetPresetTokens,
  planPresetFamilyChange,
  type PresetEditorDraft,
  type FamilyChange,
} from '../model'
import {
  createPresetHistory,
  recordPresetDraft,
  undoPreset,
  redoPreset,
} from '../history'
import {
  loadPresetSession,
  savePresetSession,
  draftStorageKey,
  historyStorageKey,
} from '../storage'
import { usePresetCompiler } from '../use-preset-compiler'
import {
  browserColor,
  measurePresetContrast,
  type TokenContrast,
} from '../contrast'
import { PresetPreviewFrame } from './preset-preview-frame'
import {
  DesignControls,
  FamilyPicker,
  ThemeControls,
  TokenList,
  familyNames,
  fieldId,
  revealPresetField,
} from './preset-controls'
import {
  accentSchemes,
  applyColorScheme,
  baseSchemes,
  resetColorScheme,
} from '../schemes'
import { PresetExportPanel, downloadPresetText } from './preset-export-panel'
import { PresetGetCode } from '../../snapshots/components/preset-get-code'
import { changesSummary, presetChanges } from '../../editor/artifact-diff'
import { canExportPreset, serializePresetExport } from '../export'
import { GlassPanel, glassReadoutId } from './glass-panel'
import { GlassStartingPoints } from './glass-starting-points'
import { defaultGlassPresetId, type StartingPresetId } from '@ombelle/catalog'
import { glassBackdropOptions, glassPresetBackdrop } from '../../site/glass-presets'
import { glassBackdropMenu, labInkFor, pickGlassScene } from '../../site/glass-backdrops'
import {
  EditorTopBar,
  familyCommands,
  InspectorSection,
  ReviewDrawer,
  SegmentedControl,
  previewModeOptions,
  previewTransparencyOptions,
  useReducedTransparencySupport,
  previewWidthOptions,
  useDrawerState,
} from '../../editor-shell'
import { PresetChecks, presetWarningCount } from './preset-checks'
import { presetScenes, type PresetBackdrop, type PresetScene } from '../preview-protocol'
import { sceneComponents, sceneOptions } from '../preview-scenes'
import styles from './preset-editor.module.css'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '../../generated/ui/components/ui/collapsible'
import { ScrollArea } from '../../generated/ui/components/ui/scroll-area'
import { useSiteDark } from '../../site/theme'

const familyName = (family: StyleFamily) => familyNames[family]
/** "/modes/dark/primaryForeground" → "Dark primary foreground". */
const changeLabel = (path: string) => {
  const [, group, a, b] = path.split('/')
  const words = (s: string) => s.replace(/[A-Z]/g, (c) => ' ' + c.toLowerCase())
  const text = group === 'modes' ? `${a} ${words(b!)}` : words(a!)
  return text[0]!.toUpperCase() + text.slice(1)
}
const isColor = (value: string) => /^#|^oklch\(/i.test(value)

export default function PresetEditor() {
  const [history, setHistory] = useState(() =>
    createPresetHistory(createPresetDraft(defaultSiteFamily)),
  )
  const [hydrated, setHydrated] = useState(false),
    [recovery, setRecovery] = useState<string | null>(null)
  const [warning, setWarning] = useState<string | null>(null),
    [notice, setNotice] = useState('')
  const [restoreWarning, setRestoreWarning] = useState<string | null>(null)
  const [mode, setMode] = useState<'light' | 'dark'>('light'),
    [viewport, setViewport] = useState<'wide' | 'narrow'>('wide'),
    [scene, setScene] = useState<PresetScene>('dashboard'),
    // The backdrop follows the starting preset and mode, as in the component pages and editors.
    // The picker overrides it for this preview until another starting preset matches.
    [backdropPreset, setBackdropPreset] = useState<StartingPresetId>(defaultGlassPresetId),
    [backdropOverride, setBackdropOverride] = useState<PresetBackdrop | null>(null),
    // Preview state only: simulates prefers-reduced-transparency, never saved.
    [transparency, setTransparency] = useState<'auto' | 'reduced'>('auto')
  const transparencySupported = useReducedTransparencySupport()
  // ?page= opens a preview page directly, including the component gallery,
  // which the page picker no longer offers.
  useEffect(() => {
    const page = new URLSearchParams(window.location.search).get('page')
    if (presetScenes.includes(page as PresetScene)) setScene(page as PresetScene)
  }, [])
  // The preview follows the site theme; the select still overrides it until
  // the theme toggles again.
  const siteDark = useSiteDark()
  useEffect(() => setMode(siteDark ? 'dark' : 'light'), [siteDark])
  const [previewStatus, setPreviewStatus] = useState<
    'connecting' | 'ready' | 'failed'
  >('connecting')
  const [confirmation, setConfirmation] = useState<
    (FamilyChange & { label: string; description: string }) | null
  >(null)
  const dialog = useRef<HTMLDialogElement>(null),
    identityDialog = useRef<HTMLDialogElement>(null),
    identityOpener = useRef<HTMLElement | null>(null),
    cancelButton = useRef<HTMLButtonElement>(null),
    returnFocus = useRef<HTMLElement | null>(null)
  const undoButton = useRef<HTMLButtonElement>(null),
    redoButton = useRef<HTMLButtonElement>(null),
    focusAfterHistory = useRef<HTMLButtonElement | null>(null)
  const [contrast, setContrast] = useState<TokenContrast[]>([])
  const [drawerOpen, setDrawerOpen] = useDrawerState(
    'ombelle.preset-editor.drawer',
    false,
  )
  const [drawerTab, setDrawerTab] = useState('checks')
  const draft = history.present,
    compiled = usePresetCompiler(draft)
  useEffect(() => {
    try {
      const loaded = loadPresetSession(window.localStorage)
      setHistory(loaded.history)
      setRecovery(loaded.recoveryRaw)
      setRestoreWarning(loaded.warning)
    } catch {
      setWarning('Browser storage is unavailable. Edits are kept in memory.')
    }
    setHydrated(true)
  }, [])
  useEffect(() => {
    if (!hydrated || recovery !== null) return
    try {
      const saved = savePresetSession(window.localStorage, history)
      setWarning(saved.warning)
      if (saved.saved) setNotice('Draft saved on this device.')
    } catch {
      setWarning('Draft could not be saved. Edits remain in memory.')
    }
  }, [history, hydrated, recovery])
  useEffect(() => {
    if (compiled.result)
      setContrast(
        measurePresetContrast(compiled.result.preset.data, browserColor),
      )
  }, [compiled.result])
  useEffect(() => {
    focusAfterHistory.current?.focus()
    focusAfterHistory.current = null
  }, [history])
  useEffect(() => {
    if (confirmation) {
      dialog.current?.showModal()
      // Start on Cancel, not the optional list toggle, so Enter is safe.
      cancelButton.current?.focus()
    }
    else if (dialog.current?.open) dialog.current.close()
  }, [confirmation])
  function commit(next: PresetEditorDraft, key: string, coalesce = false) {
    setRestoreWarning(null)
    setHistory((previous) =>
      recordPresetDraft(previous, next, { key, at: Date.now(), coalesce }),
    )
  }
  function finishConfirmation(accept: boolean) {
    if (accept && confirmation) commit(confirmation.draft, 'family/reset')
    setConfirmation(null)
    returnFocus.current?.focus()
  }
  function confirm(change: FamilyChange, label: string, description: string) {
    returnFocus.current = document.activeElement as HTMLElement
    setConfirmation({ ...change, label, description })
  }
  function family(family: StyleFamily) {
    const change = planPresetFamilyChange(draft, family)
    const count = change.changes.length
    if (count)
      confirm(
        change,
        'Change style family?',
        `Switching to ${familyName(family)} updates ${count} ${count === 1 ? 'value' : 'values'} you haven't customized to its style defaults. Everything you edited, and the preset name, stay as they are.`,
      )
    else commit(change.draft, 'family')
  }
  const diagnostic = compiled.diagnostic
  const glass = draft.family === 'liquid-glass'
  const startingPreset = useMemo(() => (glass ? matchingStartingPreset(draft) : null), [glass, draft])
  // A custom draft keeps the backdrop of the preset it was started from.
  // Only a different starting preset clears the picker: an undo or reset that matches the
  // same preset again keeps the reader's chosen backdrop.
  useEffect(() => {
    if (!startingPreset || startingPreset === backdropPreset) return
    setBackdropPreset(startingPreset)
    setBackdropOverride(null)
  }, [startingPreset])
  // The scene the draft's glass text reads best on, kept on the starting preset's own
  // scene while an edit leaves it as readable; the picker still overrides it.
  const glassPreset = useMemo(() => {
    if (!glass) return null
    try { return materializePreset(draft) } catch { return null }
  }, [glass, draft])
  const autoBackdrop = glassPreset ? pickGlassScene(glassPreset, mode, backdropPreset) : glassPresetBackdrop(backdropPreset, mode)
  const backdrop = backdropOverride ?? autoBackdrop
  const reduced = transparencySupported && transparency === 'reduced'
  const backdropOptions = glassPreset ? glassBackdropMenu(glassPreset, mode, autoBackdrop, reduced) : glassBackdropOptions
  const labInk = glassPreset ? labInkFor(glassPreset, mode, backdrop) : null
  // The catalog default Get code compares to: the starting preset for glass, the family's base otherwise.
  const defaultDraft = useMemo(() => glass ? applyStartingPreset(createPresetDraft('liquid-glass'), backdropPreset)
    : createPresetDraft(draft.family), [glass, backdropPreset, draft.family])
  const reference = usePresetCompiler(defaultDraft)
  const glassReport = glass ? presetGlassReport(draft) : null
  const glassContrastWarning = glassReport?.passes === false
  // Download JSON and Get code both require a current compile result.
  const exportable = canExportPreset(compiled, draft)
  const warnedTokens = new Set(
    contrast
      .filter((pair) => pair.status === 'warning')
      .flatMap((pair) => [pair.foreground, pair.background]),
  )
  const controlProps = {
    draft,
    errorPath: diagnostic?.path,
    onEdit: (path: Parameters<typeof setPresetEdit>[1], value: string) =>
      commit(setPresetEdit(draft, path, value), path, true),
    onReset: (path: Parameters<typeof resetPresetField>[1]) =>
      commit(resetPresetField(draft, path), 'reset:' + path),
  }
  return (
    <main className={styles.editor} aria-label="Preset editor">
      <EditorTopBar
        commands={[familyCommands(offeredStyleFamilies(draft.family), draft.family, familyNames, family)]}
        crumbs={['Presets']}
        nameField={{
          id: fieldId('/name'),
          label: 'Preset name',
          value: draft.identity.name,
          maxLength: 80,
          invalid: diagnostic?.path === '/name',
          onChange: (value) =>
            commit(setPresetIdentity(draft, 'name', value), 'name'),
        }}
        revision={`r${draft.identity.revision}`}
        status={notice}
        undo={{
          disabled: !history.past.length,
          buttonRef: undoButton,
          onClick: () => {
            // The last undo disables this button; move focus to Redo instead of the page.
            if (history.past.length === 1)
              focusAfterHistory.current = redoButton.current
            setHistory(undoPreset)
          },
        }}
        redo={{
          disabled: !history.future.length,
          buttonRef: redoButton,
          onClick: () => {
            if (history.future.length === 1)
              focusAfterHistory.current = undoButton.current
            setHistory(redoPreset)
          },
        }}
        menu={{
          label: 'More actions',
          items: [
            {
              id: 'download-json',
              label: 'Download JSON',
              disabled: !exportable,
              onSelect: () => {
                try {
                  downloadPresetText(
                    serializePresetExport(compiled, draft),
                    'project-preset.json',
                  )
                  setNotice('Preset JSON downloaded.')
                } catch {
                  setNotice('Download failed. Your draft is intact.')
                }
              },
            },
            {
              id: 'identity',
              label: 'ID & revision…',
              onSelect: () => {
                // The menu light-dismisses; remember its trigger so closing can return there.
                identityOpener.current = document.querySelector<HTMLElement>(
                  'button[aria-label="More actions"]',
                )
                identityDialog.current?.showModal()
              },
            },
            {
              id: 'reset-tokens',
              label: 'Reset all tokens…',
              destructive: true,
              onSelect: () =>
                confirm(
                  { draft: resetPresetTokens(draft), changes: [] },
                  'Reset all tokens?',
                  `Colors and design values go back to the ${familyName(draft.family)} defaults. The preset name, id and revision stay. You can undo this.`,
                ),
            },
          ],
        }}
        primary={
          <PresetGetCode
            className={styles.getCode}
            preset={compiled.result?.preset ?? null}
            current={exportable}
            contrastWarning={glassContrastWarning}
            announce={setNotice}
            describedBy={glass ? glassReadoutId : undefined}
            summary={exportable && compiled.result && reference.result
              ? <p data-testid="changes-summary">{changesSummary(presetChanges(compiled.result, reference.result))}</p> : undefined}
          />
        }
        extra={<><span className={styles.draftNote} title="Draft — automated token contrast only">Draft — automated token contrast only</span><a href="/docs/preset-editor" className="text-sm font-semibold underline underline-offset-4">Preset editor guide</a></>}
      />
      <h1 className={styles.srOnly}>Preset editor</h1>
      {warning && <p role="alert">{warning}</p>}
      {restoreWarning && <p role="alert">{restoreWarning}</p>}
      {recovery !== null && (
        <section aria-label="Draft recovery">
          <h2>Recover your saved draft</h2>
          <p>
            The saved data has been retained. Download a copy before choosing to
            reset it.
          </p>
          <button
            type="button"
            onClick={() => {
              try {
                downloadPresetText(recovery, 'preset-draft-recovery.json')
                setNotice('Recovery data downloaded.')
              } catch {
                setNotice(
                  'Recovery download failed. The original data is still retained.',
                )
              }
            }}
          >
            Download recovery data
          </button>
          <button
            type="button"
            onClick={() => {
              if (
                !window.confirm(
                  'Replace the saved recovery data with a new preset draft?',
                )
              )
                return
              try {
                localStorage.removeItem(draftStorageKey)
                localStorage.removeItem(historyStorageKey)
                setRecovery(null)
                setRestoreWarning(null)
                setHistory(createPresetHistory(createPresetDraft(defaultSiteFamily)))
              } catch {
                setWarning(
                  'Storage could not be reset. Your recovery data is retained.',
                )
              }
            }}
          >
            Reset saved draft
          </button>
        </section>
      )}
      {diagnostic && (
        <div role="alert" id="preset-error">
          <p>{diagnostic.message}</p>
          {diagnostic.path && (
            <a
              href={'#' + fieldId(diagnostic.path)}
              onClick={(event) => {
                event.preventDefault()
                revealPresetField(diagnostic.path!)
              }}
            >
              Review {diagnostic.path}
            </a>
          )}
          {diagnostic.code === 'WORKER_FAILED' && (
            <button type="button" onClick={compiled.retry}>
              Retry compilation
            </button>
          )}
        </div>
      )}
      {glass && (
        <div className={styles.glass}>
          <GlassPanel report={glassReport} />
        </div>
      )}
      <div className={styles.workbench}>
        <ScrollArea aria-label="Preset inspector" className={`www-scroll ${styles.panel}`}>
          <div className={styles.panelContent}>
          <InspectorSection id="inspector-family" title="Style family">
            <FamilyPicker value={draft.family} onChange={family} />
          </InspectorSection>
          {glass && (
            <InspectorSection id="inspector-glass" title="Glass material" meta="Starting preset and tint">
              <GlassStartingPoints
                draft={draft}
                onPick={(id) => {
                  commit(applyStartingPreset(draft, id), 'glass:preset')
                  setBackdropPreset(id)
                  setBackdropOverride(null)
                }}
                onTint={(tint) => commit(applyGlassTint(draft, tint), 'glass:tint')}
              />
            </InspectorSection>
          )}
          <InspectorSection
            id="inspector-colors"
            title="Colors"
            meta="Light and dark"
          >
            <ThemeControls
              draft={draft}
              onApply={(scheme, group) =>
                commit(applyColorScheme(draft, scheme), 'scheme:' + group)
              }
              onResetGroup={(group) =>
                commit(
                  resetColorScheme(
                    draft,
                    group === 'accent' ? accentSchemes : baseSchemes,
                  ),
                  'scheme:' + group,
                )
              }
            />
            <TokenList {...controlProps} warnings={warnedTokens} />
          </InspectorSection>
          <InspectorSection id="inspector-shape" title="Typography & shape">
            <DesignControls {...controlProps} section="shape" />
          </InspectorSection>
          <InspectorSection id="inspector-depth" title="Depth & motion">
            <DesignControls {...controlProps} section="depth" />
          </InspectorSection>
          </div>
        </ScrollArea>
        <div className={styles.canvas}>
          <div className={styles.preview}>
            <div className={`${styles.toolbar} ${styles.previewBar}`}>
              <SegmentedControl<typeof mode>
                label="Preview mode"
                value={mode}
                options={previewModeOptions}
                onChange={setMode}
              />
              {glass && transparencySupported && (
                <SegmentedControl<'auto' | 'reduced'>
                  label="Preview transparency"
                  value={transparency}
                  options={previewTransparencyOptions}
                  onChange={setTransparency}
                />
              )}
              <SegmentedControl<PresetScene>
                label="Preview page"
                value={scene}
                options={sceneOptions}
                onChange={setScene}
              />
              {glass && (
                <SegmentedControl<PresetBackdrop>
                  label="Preview backdrop"
                  value={backdrop}
                  options={backdropOptions}
                  onChange={setBackdropOverride}
                />
              )}
              <SegmentedControl<typeof viewport>
                label="Preview width"
                value={viewport}
                options={previewWidthOptions('320 px')}
                onChange={setViewport}
              />
              <p
                data-testid="preset-preview-status"
                className={styles.previewStatus}
                data-status={previewStatus}
              >
                Preview {previewStatus}
              </p>
            </div>
            <PresetPreviewFrame
              result={compiled.result}
              view={{
                mode,
                viewport,
                ...(scene === 'gallery' ? {} : { scene }),
                ...(glass && backdrop !== 'kit' ? { backdrop } : {}),
                ...(glass && labInk && !reduced ? { labInk } : {}),
                ...(glass && reduced ? { reducedTransparency: true as const } : {}),
              }}
              stale={compiled.stale}
              onStatus={setPreviewStatus}
            />
            <p className={styles.sceneComponents}>
              Components in this page: {sceneComponents[scene]}
            </p>
          </div>
        </div>
        <div className={styles.drawerSlot} data-open={drawerOpen || undefined}>
          <ReviewDrawer
            label="Review"
            open={drawerOpen}
            onOpenChange={setDrawerOpen}
            activeTab={drawerTab}
            onTabChange={setDrawerTab}
            tabs={[
              {
                id: 'checks',
                label: 'Checks',
                icon: <ShieldCheck aria-hidden="true" size={20} />,
                badge: presetWarningCount(contrast, glassReport),
                content: (
                  <PresetChecks
                    contrast={contrast}
                    glassReport={glassReport}
                    onEditToken={revealPresetField}
                  />
                ),
              },
              {
                id: 'export',
                label: 'Export',
                icon: <Download aria-hidden="true" size={20} />,
                content: (
                  <PresetExportPanel
                    draft={draft}
                    state={compiled}
                    announce={setNotice}
                    contrastWarning={glassContrastWarning}
                    describedBy={glass ? glassReadoutId : undefined}
                  />
                ),
              },
            ]}
          />
        </div>
      </div>
      <dialog
        ref={dialog}
        className={styles.confirmDialog}
        aria-labelledby="preset-confirm-heading"
        onCancel={(event) => {
          event.preventDefault()
          finishConfirmation(false)
        }}
      >
        <ScrollArea aria-labelledby="preset-confirm-heading" className={`www-scroll ${styles.confirmScroll}`}>
        <div className={styles.confirmBody}>
        <h2 id="preset-confirm-heading">{confirmation?.label}</h2>
        <p className={styles.confirmText}>{confirmation?.description}</p>
        {confirmation && confirmation.changes.length > 0 && (
          <Collapsible className={styles.confirmChanges}>
            <CollapsibleTrigger>
              Show the {confirmation.changes.length} values that change
            </CollapsibleTrigger>
            <CollapsibleContent>
            <ScrollArea aria-label="Changed values" className="www-scroll">
            <ul>
              {confirmation.changes.map((change) => (
                <li key={change.path}>
                  <span>{changeLabel(change.path)}</span>
                  <span className={styles.confirmValues}>
                    {isColor(change.before) && (
                      <i aria-hidden="true" style={{ background: change.before }} />
                    )}
                    {change.before} →{' '}
                    {isColor(change.after) && (
                      <i aria-hidden="true" style={{ background: change.after }} />
                    )}
                    {change.after}
                  </span>
                </li>
              ))}
            </ul>
            </ScrollArea>
            </CollapsibleContent>
          </Collapsible>
        )}
        <div className={styles.confirmActions}>
          <button
            ref={cancelButton}
            type="button"
            onClick={() => finishConfirmation(false)}
          >
            Cancel
          </button>
          <button
            type="button"
            className={styles.confirmPrimary}
            onClick={() => finishConfirmation(true)}
          >
            Confirm change
          </button>
        </div>
        </div>
        </ScrollArea>
      </dialog>
      <dialog
        ref={identityDialog}
        className={styles.confirmDialog}
        aria-labelledby="preset-identity-heading"
        onClose={() => {
          // Fires for Done and Escape alike.
          identityOpener.current?.focus()
          identityOpener.current = null
        }}
      >
        <ScrollArea aria-labelledby="preset-identity-heading" className={`www-scroll ${styles.confirmScroll}`}>
        <div className={styles.confirmBody}>
        <h2 id="preset-identity-heading">ID &amp; revision</h2>
        <p className={styles.confirmText}>
          The id names this preset in your project. Raise the revision when you
          publish a changed version.
        </p>
        {(['id', 'revision'] as const).map((key) => (
          <div className={styles.field} key={key}>
            <label htmlFor={fieldId('/' + key)}>Preset {key}</label>
            <input
              id={fieldId('/' + key)}
              value={draft.identity[key]}
              maxLength={key === 'revision' ? 16 : 80}
              inputMode={key === 'revision' ? 'numeric' : undefined}
              aria-invalid={diagnostic?.path === '/' + key || undefined}
              onChange={(e) =>
                commit(setPresetIdentity(draft, key, e.target.value), key)
              }
            />
          </div>
        ))}
        <div className={styles.confirmActions}>
          <button
            type="button"
            className={styles.confirmPrimary}
            onClick={() => identityDialog.current?.close()}
          >
            Done
          </button>
        </div>
        </div>
        </ScrollArea>
      </dialog>
    </main>
  )
}
