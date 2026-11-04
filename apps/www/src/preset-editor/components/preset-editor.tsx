'use client'
import { useEffect, useRef, useState } from 'react'
import type { StyleFamily } from '@ombelle/contracts'
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
import { canExportPreset, serializePresetExport } from '../export'
import { GlassPanel, glassReadoutId } from './glass-panel'
import {
  EditorTopBar,
  InspectorSection,
  SegmentedControl,
} from '../../editor-shell'
import styles from './preset-editor.module.css'
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
    createPresetHistory(createPresetDraft('flat')),
  )
  const [hydrated, setHydrated] = useState(false),
    [recovery, setRecovery] = useState<string | null>(null)
  const [warning, setWarning] = useState<string | null>(null),
    [notice, setNotice] = useState('')
  const [restoreWarning, setRestoreWarning] = useState<string | null>(null)
  const [mode, setMode] = useState<'light' | 'dark'>('light'),
    [viewport, setViewport] = useState<'wide' | 'narrow'>('wide')
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
    cancelButton = useRef<HTMLButtonElement>(null),
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
  const glassReport = glass ? presetGlassReport(draft) : null
  // A glass draft below the contrast bound cannot be exported or published.
  const glassBlocked = glassReport !== null && !glassReport.passes
  const warnings = contrast.filter((pair) => pair.status === 'warning').length
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
    <main className={styles.editor} aria-label="Global preset editor">
      <h1 className={styles.srOnly}>Global preset editor</h1>
      <EditorTopBar
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
        revision={`Revision ${draft.identity.revision}`}
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
              onSelect: () => identityDialog.current?.showModal(),
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
            current={canExportPreset(compiled, draft) && !glassBlocked}
            announce={setNotice}
            describedBy={glass ? glassReadoutId : undefined}
          />
        }
      />
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
        <section aria-label="Preset inspector" className={styles.panel}>
          <InspectorSection id="inspector-family" title="Style family">
            <FamilyPicker value={draft.family} onChange={family} />
          </InspectorSection>
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
        </section>
        <div className={styles.canvas}>
          <div className={styles.preview}>
            <div className={`${styles.toolbar} ${styles.previewBar}`}>
              <SegmentedControl<typeof mode>
                label="Preview mode"
                value={mode}
                options={[
                  { value: 'light', label: 'Light' },
                  { value: 'dark', label: 'Dark' },
                ]}
                onChange={setMode}
              />
              <SegmentedControl<typeof viewport>
                label="Preview width"
                value={viewport}
                options={[
                  { value: 'wide', label: 'Wide' },
                  { value: 'narrow', label: '320 px' },
                ]}
                onChange={setViewport}
              />
              <button
                type="button"
                popoverTarget="preset-contrast-panel"
                className={styles.contrastChip}
                data-warnings={warnings || undefined}
              >
                Contrast:{' '}
                {contrast.length
                  ? warnings
                    ? `${warnings} warning${warnings === 1 ? '' : 's'}`
                    : 'all pass'
                  : 'pending'}
              </button>
              <p
                data-testid="preset-preview-status"
                className={styles.previewStatus}
                data-status={previewStatus}
              >
                Preview {previewStatus}
              </p>
            </div>
            <section
              id="preset-contrast-panel"
              popover="auto"
              aria-label="Token contrast"
              className={`preset-popover ${styles.contrastPanel}`}
            >
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
            <PresetPreviewFrame
              result={compiled.result}
              view={{ mode, viewport }}
              stale={compiled.stale}
              onStatus={setPreviewStatus}
            />
          </div>
          <div className={styles.exportCard}>
            <PresetExportPanel
              draft={draft}
              state={compiled}
              announce={setNotice}
              blocked={glassBlocked}
              describedBy={glass ? glassReadoutId : undefined}
            />
          </div>
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
        <h2 id="preset-confirm-heading">{confirmation?.label}</h2>
        <p className={styles.confirmText}>{confirmation?.description}</p>
        {confirmation && confirmation.changes.length > 0 && (
          <details className={styles.confirmChanges}>
            <summary>
              Show the {confirmation.changes.length} values that change
            </summary>
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
          </details>
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
      </dialog>
      <dialog
        ref={identityDialog}
        className={styles.confirmDialog}
        aria-labelledby="preset-identity-heading"
      >
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
      </dialog>
    </main>
  )
}
