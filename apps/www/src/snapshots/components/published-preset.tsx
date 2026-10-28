'use client'
import { useEffect, useRef, useState } from 'react'
import { canonicalize, compile } from '@ombelle/compiler'
import {
  supportedComponentIds,
  type CompileResult,
  type PresetSnapshot,
} from '@ombelle/contracts'
import { PresetPreviewFrame } from '../../preset-editor/components/preset-preview-frame'
import { downloadPresetText } from '../../preset-editor/components/preset-export-panel'
import type { PresetView } from '../../preset-editor/preview-protocol'
import styles from '../../preset-editor/components/preset-editor.module.css'
import { snapshotInstallCommand } from '../install-command'

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
}: {
  snapshot: PresetSnapshot
  origin: string
}) {
  const [result, setResult] = useState<CompileResult | null>(null)
  const [previewStatus, setPreviewStatus] = useState(
    'Compiling snapshot preview…',
  )
  const [announcement, setAnnouncement] = useState('')
  const [view, setView] = useState<PresetView>({
    mode: 'light',
    viewport: 'wide',
  })
  const output = useRef<HTMLTextAreaElement>(null)
  const json = canonicalize(snapshot.preset) + '\n'
  const source = {
    origin,
    reference: `${snapshot.id}@${snapshot.revision}`,
    presetHash: snapshot.presetHash,
  }
  useEffect(() => {
    let active = true
    setResult(null)
    setPreviewStatus('Compiling snapshot preview…')
    void compile({
      preset: snapshot.preset,
      componentIds: supportedComponentIds,
      catalogRelease: snapshot.catalogRelease,
      compilerVersion: snapshot.compilerVersion,
    })
      .then((compiled) => {
        if (!active) return
        if (compiled.preset.hash !== snapshot.presetHash)
          throw new Error('Snapshot hash mismatch')
        setResult(compiled)
      })
      .catch(() => {
        if (active)
          setPreviewStatus(
            'Preview compilation unavailable. Preset JSON remains available.',
          )
      })
    return () => {
      active = false
    }
  }, [snapshot])
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
        <p role="status">{previewStatus}</p>
        <PresetPreviewFrame
          result={result}
          view={view}
          stale={false}
          onStatus={(status) => {
            if (status === 'ready') setPreviewStatus('Snapshot gallery ready.')
            else if (status === 'failed')
              setPreviewStatus(
                'Gallery unavailable. Preset JSON remains available.',
              )
          }}
        />
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
      <section aria-labelledby="snapshot-install-heading">
        <h2 id="snapshot-install-heading">
          Install from the private repository
        </h2>
        <p>
          These commands require access to the private repository, Node 24.19.0
          and pnpm 11.25.0. From the repository root, run{' '}
          <code>pnpm install --frozen-lockfile --ignore-scripts</code>, then{' '}
          <code>pnpm build:packages</code>.
        </p>
        <p>
          Replace <code>APP</code> with your app path (quote paths containing
          spaces). Run the selected command from the repository root and review
          the JSON dry-run plan. To apply that plan, remove{' '}
          <code>--dry-run</code> and add <code>--yes</code>. Validation,
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
              {title} dry-run command
            </label>
            <textarea
              id={`snapshot-command-${scope}`}
              readOnly
              rows={5}
              value={snapshotInstallCommand(source, scope)}
              spellCheck={false}
            />
          </section>
        ))}
      </section>
    </main>
  )
}
