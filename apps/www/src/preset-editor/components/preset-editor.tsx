'use client'
import { useEffect, useRef, useState } from 'react'
import { supportedStyleFamilies, type StyleFamily } from '@ombelle/contracts'
import { createPresetDraft, setPresetEdit, setPresetIdentity, resetPresetField, resetPresetTokens, planPresetFamilyChange, type PresetEditorDraft, type FamilyChange } from '../model'
import { createPresetHistory, recordPresetDraft, undoPreset, redoPreset } from '../history'
import { loadPresetSession, savePresetSession, draftStorageKey, historyStorageKey } from '../storage'
import { usePresetCompiler } from '../use-preset-compiler'
import { browserColor, measurePresetContrast, type TokenContrast } from '../contrast'
import { PresetPreviewFrame } from './preset-preview-frame'
import { PresetControls, fieldId } from './preset-controls'
import { PresetExportPanel, downloadPresetText } from './preset-export-panel'
import styles from './preset-editor.module.css'

export default function PresetEditor() {
  const [history, setHistory] = useState(() => createPresetHistory(createPresetDraft('flat')))
  const [hydrated, setHydrated] = useState(false), [recovery, setRecovery] = useState<string | null>(null)
  const [warning, setWarning] = useState<string | null>(null), [notice, setNotice] = useState('')
  const [mode, setMode] = useState<'light' | 'dark'>('light'), [viewport, setViewport] = useState<'wide' | 'narrow'>('wide')
  const [previewStatus, setPreviewStatus] = useState<'connecting' | 'ready' | 'failed'>('connecting')
  const [confirmation, setConfirmation] = useState<(FamilyChange & { label: string }) | null>(null)
  const dialog = useRef<HTMLDialogElement>(null), returnFocus = useRef<HTMLElement | null>(null)
  const [contrast, setContrast] = useState<TokenContrast[]>([])
  const draft = history.present, compiled = usePresetCompiler(draft)
  useEffect(() => {
    try { const loaded = loadPresetSession(window.localStorage); setHistory(loaded.history); setRecovery(loaded.recoveryRaw); setWarning(loaded.warning) }
    catch { setWarning('Browser storage is unavailable. Edits are kept in memory.') }
    setHydrated(true)
  }, [])
  useEffect(() => {
    if (!hydrated || recovery !== null) return
    try { const saved = savePresetSession(window.localStorage, history); setWarning(saved.warning); if (saved.saved) setNotice('Draft saved on this device.') }
    catch { setWarning('Draft could not be saved. Edits remain in memory.') }
  }, [history, hydrated, recovery])
  useEffect(() => { if (compiled.result) setContrast(measurePresetContrast(compiled.result.preset.data, browserColor)) }, [compiled.result])
  useEffect(() => { if (confirmation) dialog.current?.showModal(); else if (dialog.current?.open) dialog.current.close() }, [confirmation])
  function commit(next: PresetEditorDraft, key: string, coalesce = false) { setHistory((previous) => recordPresetDraft(previous, next, { key, at: Date.now(), coalesce })) }
  function finishConfirmation(accept: boolean) { if (accept && confirmation) commit(confirmation.draft, 'family/reset'); setConfirmation(null); returnFocus.current?.focus() }
  function confirm(change: FamilyChange, label: string) { returnFocus.current = document.activeElement as HTMLElement; setConfirmation({ ...change, label }) }
  function family(family: StyleFamily) { const change = planPresetFamilyChange(draft, family); if (change.changes.length) confirm(change, 'Change style family?'); else commit(change.draft, 'family') }
  const diagnostic = compiled.diagnostic
  return <main className={styles.editor}>
    <header><a href="/">Ombelle</a><p>Project preset</p><h1>Global preset editor</h1><p>Make a theme that follows your next component into your project.</p><p>Draft — automated token contrast only</p></header>
    <div className={styles.toolbar}><label htmlFor="preset-family">Style family</label><select id="preset-family" value={draft.family} onChange={(e) => family(e.target.value as StyleFamily)}>{supportedStyleFamilies.map((family) => <option key={family} value={family}>{family}</option>)}</select><button type="button" disabled={!history.past.length} onClick={() => setHistory(undoPreset)}>Undo</button><button type="button" disabled={!history.future.length} onClick={() => setHistory(redoPreset)}>Redo</button><button type="button" onClick={() => confirm({ draft: resetPresetTokens(draft), changes: [] }, 'Reset all tokens?')}>Reset all tokens</button></div>
    <p role="status" aria-live="polite">{notice}</p>{warning && <p role="alert">{warning}</p>}
    {recovery !== null && <section aria-label="Draft recovery"><h2>Recover your saved draft</h2><p>The saved data has been retained. Download a copy before choosing to reset it.</p><button type="button" onClick={() => { try { downloadPresetText(recovery, 'preset-draft-recovery.json'); setNotice('Recovery data downloaded.') } catch { setNotice('Recovery download failed. The original data is still retained.') } }}>Download recovery data</button><button type="button" onClick={() => { if (!window.confirm('Replace the saved recovery data with a new preset draft?')) return; try { localStorage.removeItem(draftStorageKey); localStorage.removeItem(historyStorageKey); setRecovery(null); setHistory(createPresetHistory(createPresetDraft('flat'))) } catch { setWarning('Storage could not be reset. Your recovery data is retained.') } }}>Reset saved draft</button></section>}
    {diagnostic && <div role="alert" id="preset-error"><p>{diagnostic.message}</p>{diagnostic.path && <a href={'#' + fieldId(diagnostic.path)}>Review {diagnostic.path}</a>}{diagnostic.code === 'WORKER_FAILED' && <button type="button" onClick={compiled.retry}>Retry compilation</button>}</div>}
    <div className={styles.workbench}><section aria-labelledby="preset-controls-heading"><h2 id="preset-controls-heading">Customize</h2><fieldset><legend>Preset identity</legend>{(['id', 'name', 'revision'] as const).map((key) => <div className="preset-control" key={key}><label htmlFor={fieldId('/' + key)}>Preset {key}</label><input id={fieldId('/' + key)} value={draft.identity[key]} maxLength={key === 'revision' ? 16 : 80} inputMode={key === 'revision' ? 'numeric' : undefined} aria-invalid={diagnostic?.path === '/' + key || undefined} onChange={(e) => commit(setPresetIdentity(draft, key, e.target.value), key)} /></div>)}</fieldset>
      <PresetControls draft={draft} errorPath={diagnostic?.path} onEdit={(path, value) => commit(setPresetEdit(draft, path, value), path, true)} onReset={(path) => commit(resetPresetField(draft, path), 'reset:' + path)} />
    </section><div className={styles.preview}><div className={styles.toolbar}><label htmlFor="preset-mode">Preview mode</label><select id="preset-mode" value={mode} onChange={(e) => setMode(e.target.value as typeof mode)}><option value="light">Light</option><option value="dark">Dark</option></select><label htmlFor="preset-width">Preview width</label><select id="preset-width" value={viewport} onChange={(e) => setViewport(e.target.value as typeof viewport)}><option value="wide">Wide</option><option value="narrow">320 pixels</option></select></div><p data-testid="preset-preview-status">Preview {previewStatus}</p><PresetPreviewFrame result={compiled.result} view={{ mode, viewport }} stale={compiled.stale} onStatus={setPreviewStatus} /></div></div>
    <section aria-label="Token contrast"><h2>Token contrast</h2><p>Eight text pairs in both modes, using a 4.5:1 threshold. Warnings do not prevent export. This does not evaluate every component state or non-text contrast.</p><div className={styles.contrast}>{contrast.map((pair) => <p key={pair.mode + pair.foreground}>{pair.mode} {pair.foreground}/{pair.background}: {pair.status === 'not-evaluated' ? 'Not evaluated' : `${pair.ratio!.toFixed(2)}:1 — ${pair.status === 'pass' ? 'Pass' : 'Warning'}`}</p>)}</div></section>
    <PresetExportPanel draft={draft} state={compiled} announce={setNotice} />
    <dialog ref={dialog} aria-labelledby="preset-confirm-heading" onCancel={(event) => { event.preventDefault(); finishConfirmation(false) }}><h2 id="preset-confirm-heading">{confirmation?.label}</h2><p>Explicitly customized values and preset identity are retained.</p>{confirmation && confirmation.changes.length > 0 && <ul>{confirmation.changes.map((change) => <li key={change.path}>{change.path}: {change.before} → {change.after}</li>)}</ul>}<button type="button" onClick={() => finishConfirmation(false)}>Cancel</button><button type="button" onClick={() => finishConfirmation(true)}>Confirm change</button></dialog>
  </main>
}
