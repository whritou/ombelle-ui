import { useState } from 'react'
import type { PresetEditorDraft } from '../model'
import type { PresetCompilerState } from '../use-preset-compiler'
import { contrastInstallBlocked, glassMaterialMinimumCli, installerRunner, materialInstallBlocked, publishedInstaller } from '../../snapshots/install-command'
import {
  canExportPreset,
  serializePresetExport,
  presetCssExport,
} from '../export'

export function downloadPresetText(text: string, filename: string) {
  const url = URL.createObjectURL(
    new Blob([text], { type: 'application/json;charset=utf-8' }),
  )
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = filename
  document.body.append(anchor)
  anchor.click()
  anchor.remove()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}
export function PresetExportPanel({
  draft,
  state,
  announce,
  contrastWarning,
  describedBy,
}: {
  draft: PresetEditorDraft
  state: PresetCompilerState
  announce: (message: string) => void
  contrastWarning: boolean
  /** Id of the live contrast readout. */
  describedBy?: string
}) {
  const [output, setOutput] = useState<'json' | 'tokens' | 'family'>('json'),
    [install, setInstall] = useState<'new' | 'existing'>('new')
  const enabled = canExportPreset(state, draft)
  const useLocalInstaller = contrastInstallBlocked(contrastWarning)
  const text = enabled
    ? output === 'json'
      ? serializePresetExport(state, draft)
      : presetCssExport(state, draft, output)
    : 'Compile the current draft to view its export.'
  async function copy() {
    try {
      await navigator.clipboard.writeText(text)
      announce('Export copied.')
    } catch {
      announce(
        'Clipboard unavailable. Select the export text below and copy it.',
      )
      document.getElementById('preset-export-text')?.focus()
    }
  }
  return (
    <div className="preset-export">
      <section aria-labelledby="preset-export-heading">
      <h2 id="preset-export-heading">Preset JSON and local export</h2>
      <p>
        Use <strong>Get code</strong> to publish a shareable preset. Download the
        JSON to keep a local copy.
      </p>
      <p>Catalog 0.1.0 · Compiler 0.1.0 · Preset schema 1.0</p>
      <p>
        Preset hash:{' '}
        <code data-testid="preset-hash">
          {enabled ? state.result!.preset.hash : 'Pending'}
        </code>
      </p>
      <button
        type="button"
        disabled={!enabled}
        aria-describedby={describedBy}
        onClick={() => {
          try {
            downloadPresetText(
              serializePresetExport(state, draft),
              'project-preset.json',
            )
            announce('Preset JSON downloaded.')
          } catch {
            announce(
              'Download failed. Your draft is intact; select and copy the JSON instead.',
            )
          }
        }}
      >
        Download preset JSON
      </button>
      <div className="preset-input-row">
        <label htmlFor="preset-output">Output</label>
        <select
          id="preset-output"
          value={output}
          onChange={(e) => setOutput(e.target.value as typeof output)}
        >
          <option value="json">Preset JSON</option>
          <option value="tokens">Tailwind v4 token CSS</option>
          <option value="family">Family CSS</option>
        </select>
        <button
          type="button"
          disabled={!enabled}
          aria-describedby={describedBy}
          onClick={() => void copy()}
        >
          Copy export
        </button>
      </div>
      <textarea
        id="preset-export-text"
        aria-label="Export text"
        value={text}
        readOnly
        rows={12}
        spellCheck={false}
      />
      <p>
        Token CSS provides palette and design variables. Family CSS supplies
        reviewed style rules. Use both to apply the complete family in your project.
      </p>
      <details>
        <summary>Dependencies</summary>
        <ul>
          {state.result?.dependencies.map((dependency) => (
            <li key={dependency.name}>
              <code>
                {dependency.name}@{dependency.version}
              </code>
            </li>
          ))}
        </ul>
      </details>
      <h3>Install with the CLI</h3>
      <label htmlFor="preset-install">Installation path</label>
      <select
        id="preset-install"
        value={install}
        onChange={(e) => setInstall(e.target.value as typeof install)}
      >
        <option value="new">New setup</option>
        <option value="existing">Already initialized shadcn</option>
      </select>
      {install === 'existing' && (
        <p>
          If you already initialized shadcn, add the styling to the project
          instead. This command merges the palette and tokens into your
          globals.css.
        </p>
      )}
      {useLocalInstaller ? (
        <p>
          Run <code>pnpm build:packages</code> from the Ombelle repository.
          Save <code>project-preset.json</code> there and replace <code>APP</code>
          with your target project directory.
        </p>
      ) : <p>
        Run this from the folder containing the downloaded{' '}
        <code>project-preset.json</code>, with Node 24.19.0 or newer Node 24.
        Replace <code>APP</code> with your target project directory. The CLI
        uses its existing package manager.
      </p>}
      {!useLocalInstaller && materialInstallBlocked({ design: state.result?.preset.data.design }) ? (
        <p data-testid="preset-install-held">
          This preset uses liquid glass material settings, which need{' '}
          {publishedInstaller.packageName} {glassMaterialMinimumCli}. That release
          is not published yet: download the preset now, and the command appears
          here once it is.
        </p>
      ) : (
        <pre data-testid="preset-install-command">
          {installerRunner(useLocalInstaller ? undefined : publishedInstaller)}{' '}
          {install === 'new' ? 'init --preset' : 'theme add'}{' '}
          ./project-preset.json
        </pre>
      )}
      <p>
        Run it from your app folder; the installer shows the changes and asks
        before writing. A theme merge preserves existing component
        source; changing markup requires an explicit migration.
      </p>
      </section>
    </div>
  )
}
