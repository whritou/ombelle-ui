import { useState } from 'react'
import type { PresetEditorDraft } from '../model'
import type { PresetCompilerState } from '../use-preset-compiler'
import { PublishPreset } from '../../snapshots/components/publish-preset'
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
}: {
  draft: PresetEditorDraft
  state: PresetCompilerState
  announce: (message: string) => void
}) {
  const [output, setOutput] = useState<'json' | 'tokens' | 'family'>('json'),
    [install, setInstall] = useState<'new' | 'existing'>('new')
  const enabled = canExportPreset(state, draft)
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
    <section aria-labelledby="preset-export-heading">
      <h2 id="preset-export-heading">Export your preset</h2>
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
        <button type="button" disabled={!enabled} onClick={() => void copy()}>
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
        reviewed style rules. Use the CLI to merge these into your project;
        copying token CSS alone does not apply the complete family.
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
      <h3>Install with the private local CLI</h3>
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
      <p>
        From your Ombelle repository, run <code>pnpm build:packages</code>, then
        save the download there as <code>project-preset.json</code>. Replace{' '}
        <code>APP</code> with your target project directory. The CLI uses its
        existing package manager.
      </p>
      <pre data-testid="preset-install-command">
        pnpm exec node packages/cli/dist/main.js{' '}
        {install === 'new' ? 'init --preset' : 'theme add'}{' '}
        ./project-preset.json --cwd APP --dry-run --json
      </pre>
      <p>
        Review the plan, then replace <code>--dry-run --json</code> with{' '}
        <code>--yes</code> to apply. A theme merge preserves existing component
        source; changing markup requires an explicit migration.
      </p>
      <PublishPreset
        preset={state.result?.preset ?? null}
        current={enabled}
        announce={announce}
      />
    </section>
  )
}
