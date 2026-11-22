'use client'
import { useRef, useState } from 'react'
import { canonicalize } from '@ombelle/compiler/light'
import type { PresetSnapshot } from '@ombelle/contracts'
import { PresetPreviewFrame } from '../../preset-editor/components/preset-preview-frame'
import { downloadPresetText } from '../../preset-editor/components/preset-export-panel'
import type { PresetView } from '../../preset-editor/preview-protocol'
import styles from '../../preset-editor/components/preset-editor.module.css'
import { contrastInstallBlocked, glassMaterialInstallNotice, materialInstallBlocked, publishedInstaller, fontsInstallBlocked, fontsInstallNotice, semanticPaletteInstallBlocked, semanticPaletteInstallNotice, snapshotInstallCommand } from '../install-command'
import { snapshotPreviewMessage, type FrameStatus, type SnapshotPreview } from '../snapshot-preview'

const choices = [
  {
    scope: 'new',
    title: 'New setup',
    description:
      'Initialize an app with this preset as its saved project defaults.',
  },
  {
    scope: 'theme',
    title: 'Existing shadcn theme',
    description:
      'Merge tokens and compatible reviewed CSS into the configured global stylesheet and save project defaults. Existing component source stays untouched; source defaults apply to future additions.',
  },
  {
    scope: 'button',
    title: 'Component-only Button',
    description:
      'Install a separate scoped Button. Preserve the saved global theme, other components and defaults for later ordinary additions.',
  },
] as const

export function PublishedPreset({
  snapshot,
  origin,
  preview,
}: {
  snapshot: PresetSnapshot
  origin: string
  /** Prepared on the server (prepareSnapshotPreview), so this page compiles nothing in the browser. */
  preview: SnapshotPreview
}) {
  const [frameStatus, setFrameStatus] = useState<FrameStatus>('connecting')
  const [announcement, setAnnouncement] = useState('')
  const [view, setView] = useState<PresetView>({
    mode: 'light',
    viewport: 'wide',
  })
  const output = useRef<HTMLTextAreaElement>(null)
  const json = canonicalize(snapshot.preset) + '\n'
  const { contrastWarning } = preview
  const useLocalInstaller = contrastInstallBlocked(contrastWarning)
  const installUnavailable = semanticPaletteInstallBlocked(snapshot.preset)
    ? semanticPaletteInstallNotice
    : fontsInstallBlocked({ design: snapshot.preset.design }) ? fontsInstallNotice
    : !useLocalInstaller && materialInstallBlocked({ design: snapshot.preset.design }) ? glassMaterialInstallNotice : undefined
  const source = {
    origin,
    reference: `${snapshot.id}@${snapshot.revision}`,
    presetHash: snapshot.presetHash,
  }
  async function copyJson() {
    try {
      await navigator.clipboard.writeText(json)
      setAnnouncement('Preset JSON copied.')
    } catch {
      setAnnouncement(
        'Clipboard unavailable. Select and copy the preset JSON below.',
      )
      output.current?.focus()
      output.current?.select()
    }
  }
  return (
    <main className={`${styles.editor} ${styles.published}`}>
      <header>
        <p>Read-only published preset</p>
        <h1>{snapshot.preset.name}</h1>
        <p>
          Draft — automated token contrast only. Publication does not certify
          accessibility or production readiness.
        </p>
        {contrastWarning && <p>Contrast warning. Some Liquid Glass text falls below 4.5:1 in the contrast model.</p>}
        <p>
          Exact reference: <code>{source.reference}</code>
        </p>
        <p>
          Preset hash: <code>{snapshot.presetHash}</code>
        </p>
        <p>
          Schema {snapshot.preset.schemaVersion} · Catalog{' '}
          {snapshot.catalogRelease} · Compiler {snapshot.compilerVersion}
        </p>
        <p>
          Published{' '}
          <time dateTime={snapshot.createdAt}>{snapshot.createdAt}</time>
        </p>
        <p>
          Anyone with the reference can read this preset. Published data has no
          automatic expiry while the service operates. There is no anonymous
          edit or delete action. An operator may withdraw access; cached copies
          and installed source cannot be recalled.
        </p>
        <p>
          This page is read-only. Opening it preserves your saved editor draft.
        </p>
      </header>
      <section aria-labelledby="shared-preview-heading">
        <h2 id="shared-preview-heading">Preview this snapshot</h2>
        <p>
          View settings only affect this preview; they are outside the published
          preset and its hash.
        </p>
        <div className="preset-input-row">
          <label htmlFor="snapshot-mode">Color mode</label>
          <select
            id="snapshot-mode"
            value={view.mode}
            onChange={(event) =>
              setView({
                ...view,
                mode: event.target.value as PresetView['mode'],
              })
            }
          >
            <option value="light">Light</option>
            <option value="dark">Dark</option>
          </select>
          <label htmlFor="snapshot-viewport">Preview width</label>
          <select
            id="snapshot-viewport"
            value={view.viewport}
            onChange={(event) =>
              setView({
                ...view,
                viewport: event.target.value as PresetView['viewport'],
              })
            }
          >
            <option value="wide">Wide</option>
            <option value="narrow">Narrow</option>
          </select>
        </div>
        <p role="status">{snapshotPreviewMessage(preview, frameStatus)}</p>
        {preview.frame.kind !== 'failed' && (
          <PresetPreviewFrame
            key={`${snapshot.id}@${snapshot.revision}:${snapshot.presetHash}`}
            result={preview.frame.kind === 'compiled' ? preview.frame.result : null}
            preset={preview.frame.kind === 'tokens' ? snapshot.preset : null}
            view={view}
            stale={false}
            onStatus={setFrameStatus}
          />
        )}
      </section>
      <section aria-labelledby="snapshot-json-heading">
        <h2 id="snapshot-json-heading">Preset JSON</h2>
        <p>
          This is the canonical normalized preset. The download includes a
          trailing newline outside the preset hash.
        </p>
        <div className="preset-input-row">
          <button type="button" onClick={() => void copyJson()}>
            Copy preset JSON
          </button>
          <button
            type="button"
            onClick={() => {
              try {
                downloadPresetText(json, `${snapshot.id}-1.json`)
                setAnnouncement('Preset JSON downloaded.')
              } catch {
                setAnnouncement(
                  'Download unavailable. Copy the preset JSON below.',
                )
                output.current?.focus()
              }
            }}
          >
            Download preset JSON
          </button>
        </div>
        <label htmlFor="snapshot-json">Canonical preset JSON</label>
        <textarea
          ref={output}
          id="snapshot-json"
          readOnly
          value={json}
          rows={12}
          spellCheck={false}
        />
        <p role="status" aria-live="polite">
          {announcement}
        </p>
      </section>
      {installUnavailable ? <p>{installUnavailable}</p> : (
      <section aria-labelledby="snapshot-install-heading">
        <h2 id="snapshot-install-heading">
          Install with the Ombelle CLI
        </h2>
        {useLocalInstaller ? (
          <p>From the Ombelle repository, run <code>pnpm build:packages</code> before using the commands below.</p>
        ) : <p>
          These commands run the published{' '}
          <code>
            {publishedInstaller.packageName}@{publishedInstaller.version}
          </code>{' '}
          installer through npx and require Node 24.19.0 or newer Node 24.
        </p>}
        <p>
          Run the selected command from your app folder. It shows every file
          and dependency change and asks before writing. Validation,
          compatibility and modified-file conflicts still apply; dependency
          lifecycle scripts stay disabled.
        </p>
        <p>
          The origin comes from service configuration. The hash and TLS detect
          mismatched content; they do not authenticate a publisher. Website
          actions do not run a local installation.
        </p>
        {choices.map(({ scope, title, description }) => (
          <section key={scope} aria-label={title}>
            <h3>{title}</h3>
            <p>{description}</p>
            <label htmlFor={`snapshot-command-${scope}`}>
              {title} install command
            </label>
            <textarea
              id={`snapshot-command-${scope}`}
              readOnly
              rows={5}
              value={snapshotInstallCommand(source, scope, useLocalInstaller ? undefined : publishedInstaller)}
              spellCheck={false}
            />
          </section>
        ))}
      </section>
      )}
    </main>
  )
}
