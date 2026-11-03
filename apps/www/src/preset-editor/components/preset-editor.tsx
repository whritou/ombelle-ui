'use client'
import { useEffect, useRef, useState } from 'react'
import { styleFamilies, type StyleFamily } from '@ombelle/contracts'
import {
  createPresetDraft,
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
import { PresetControls, fieldId } from './preset-controls'
import { PresetExportPanel, downloadPresetText } from './preset-export-panel'
import { GlassPanel, glassReadoutId } from './glass-panel'
import styles from './preset-editor.module.css'

const familyLabel = (family: StyleFamily) =>
  family === 'liquid-glass' ? 'Liquid glass (Experimental)' : family

export default function PresetEditor() {
  const [history, setHistory] = useState(() =>
    createPresetHistory(createPresetDraft('flat')),
  )
  const [hydrated, setHydrated] = useState(false),
    [recovery, setRecovery] = useState<string | null>(null)
  const [warning, setWarning] = useState<string | null>(null),
    [notice, setNotice] = useState('')
  const [restoreWarning, setRestoreWarning] = useState<string | null>(null)
  const [mode, setMode] = useState<'light' | 'dark'>('light'),
    [viewport, setViewport] = useState<'wide' | 'narrow'>('wide')
  const [previewStatus, setPreviewStatus] = useState<
    'connecting' | 'ready' | 'failed'
  >('connecting')
  const [confirmation, setConfirmation] = useState<
    (FamilyChange & { label: string }) | null
  >(null)
  const dialog = useRef<HTMLDialogElement>(null),
    returnFocus = useRef<HTMLElement | null>(null)
  const undoButton = useRef<HTMLButtonElement>(null),
    redoButton = useRef<HTMLButtonElement>(null),
    focusAfterHistory = useRef<HTMLButtonElement | null>(null)
  const [contrast, setContrast] = useState<TokenContrast[]>([])
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
    if (confirmation) dialog.current?.showModal()
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
  function confirm(change: FamilyChange, label: string) {
    returnFocus.current = document.activeElement as HTMLElement
    setConfirmation({ ...change, label })
  }
  function family(family: StyleFamily) {
    const change = planPresetFamilyChange(draft, family)
    if (change.changes.length) confirm(change, 'Change style family?')
    else commit(change.draft, 'family')
  }
  const diagnostic = compiled.diagnostic
  const glass = draft.family === 'liquid-glass'
  const glassReport = glass ? presetGlassReport(draft) : null
  // A glass draft below the contrast bound cannot be exported or published.
  const glassBlocked = glassReport !== null && !glassReport.passes
  return (
    <main className={styles.editor} aria-label="Global preset editor">
      <div className={styles.top}>
      <header>
        <p className={styles.crumb}>
          <a href="/">Ombelle</a> <span aria-hidden="true">/</span> Project
          preset
        </p>
        <h1>Global preset editor</h1>
        <p>Make a theme that follows your next component into your project.</p>
        <p className={styles.badge}>Draft — automated token contrast only</p>
      </header>
      <div className={`${styles.toolbar} ${styles.actions}`}>
        <label htmlFor="preset-family">Style family</label>
        <select
          id="preset-family"
          value={draft.family}
          onChange={(e) => family(e.target.value as StyleFamily)}
        >
          {styleFamilies.map((family) => (
            <option key={family} value={family}>
              {familyLabel(family)}
            </option>
          ))}
        </select>
        <button
          ref={undoButton}
          type="button"
          disabled={!history.past.length}
          onClick={() => {
            // The last undo disables this button; move focus to Redo instead of the page.
            if (history.past.length === 1)
              focusAfterHistory.current = redoButton.current
            setHistory(undoPreset)
          }}
        >
          Undo
        </button>
        <button
          ref={redoButton}
          type="button"
          disabled={!history.future.length}
          onClick={() => {
            if (history.future.length === 1)
              focusAfterHistory.current = undoButton.current
            setHistory(redoPreset)
          }}
        >
          Redo
        </button>
        <button
          type="button"
          onClick={() =>
            confirm(
              { draft: resetPresetTokens(draft), changes: [] },
              'Reset all tokens?',
            )
          }
        >
          Reset all tokens
        </button>
      </div>
      </div>
      <p role="status" aria-live="polite" className={styles.notice}>
        {notice}
      </p>
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
                setHistory(createPresetHistory(createPresetDraft('flat')))
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
            <a href={'#' + fieldId(diagnostic.path)}>
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
      {glass && <GlassPanel report={glassReport} />}
      <div className={styles.workbench}>
        <section aria-labelledby="preset-controls-heading" className={styles.controls}>
          <h2 id="preset-controls-heading">Customize</h2>
          <fieldset className={styles.identity}>
            <legend>Preset identity</legend>
            {(['id', 'name', 'revision'] as const).map((key) => (
              <div className="preset-control" key={key}>
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
          </fieldset>
          <PresetControls
            draft={draft}
            errorPath={diagnostic?.path}
            onEdit={(path, value) =>
              commit(setPresetEdit(draft, path, value), path, true)
            }
            onReset={(path) =>
              commit(resetPresetField(draft, path), 'reset:' + path)
            }
          />
        </section>
        <div className={styles.preview}>
          <div className={`${styles.toolbar} ${styles.previewBar}`}>
            <label htmlFor="preset-mode">Preview mode</label>
            <select
              id="preset-mode"
              value={mode}
              onChange={(e) => setMode(e.target.value as typeof mode)}
            >
              <option value="light">Light</option>
              <option value="dark">Dark</option>
            </select>
            <label htmlFor="preset-width">Preview width</label>
            <select
              id="preset-width"
              value={viewport}
              onChange={(e) => setViewport(e.target.value as typeof viewport)}
            >
              <option value="wide">Wide</option>
              <option value="narrow">320 pixels</option>
            </select>
            <p data-testid="preset-preview-status" className={styles.previewStatus} data-status={previewStatus}>Preview {previewStatus}</p>
          </div>
          <PresetPreviewFrame
            result={compiled.result}
            view={{ mode, viewport }}
            stale={compiled.stale}
            onStatus={setPreviewStatus}
          />
          <section aria-label="Token contrast" className={styles.contrastPanel}>
            <h2>Token contrast</h2>
            <p>
              Eight text pairs in both modes, using a 4.5:1 threshold. Warnings
              do not prevent export. This does not evaluate every component
              state or non-text contrast.
            </p>
            <div className={styles.contrast}>
              {contrast.map((pair) => (
                <p key={pair.mode + pair.foreground} data-status={pair.status}>
                  {pair.mode} {pair.foreground}/{pair.background}:{' '}
                  {pair.status === 'not-evaluated'
                    ? 'Not evaluated'
                    : `${pair.ratio!.toFixed(2)}:1 — ${pair.status === 'pass' ? 'Pass' : 'Warning'}`}
                </p>
              ))}
            </div>
          </section>
        </div>
      </div>
      <PresetExportPanel
        draft={draft}
        state={compiled}
        announce={setNotice}
        blocked={glassBlocked}
        describedBy={glass ? glassReadoutId : undefined}
      />
      <dialog
        ref={dialog}
        aria-labelledby="preset-confirm-heading"
        onCancel={(event) => {
          event.preventDefault()
          finishConfirmation(false)
        }}
      >
        <h2 id="preset-confirm-heading">{confirmation?.label}</h2>
        <p>Explicitly customized values and preset identity are retained.</p>
        {confirmation && confirmation.changes.length > 0 && (
          <ul>
            {confirmation.changes.map((change) => (
              <li key={change.path}>
                {change.path}: {change.before} → {change.after}
              </li>
            ))}
          </ul>
        )}
        <button type="button" onClick={() => finishConfirmation(false)}>
          Cancel
        </button>
        <button type="button" onClick={() => finishConfirmation(true)}>
          Confirm change
        </button>
      </dialog>
    </main>
  )
}
