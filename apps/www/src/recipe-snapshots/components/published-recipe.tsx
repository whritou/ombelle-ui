'use client'
import { useEffect, useRef, useState } from 'react'
import type { RecipeSnapshot, RecipeCompileResult } from '@ombelle/contracts'
import { canonicalize, compileRecipe, verifyRecipeSnapshot } from '@ombelle/compiler'
import { PreviewFrame } from '../../editor/components/preview-frame'
import { ArtifactPanel } from '../../editor/components/artifact-panel'
import { downloadPresetText } from '../../preset-editor/components/preset-export-panel'
import { recipeSnapshotInstallCommand } from '../install-command'
import { glassMaterialInstallNotice, publishedInstaller, recipeInstallBlocked } from '../../snapshots/install-command'
import styles from '../../preset-editor/components/preset-editor.module.css'

export function PublishedRecipe({ snapshot, origin }: { snapshot: RecipeSnapshot; origin: string }) {
  const latest = useRef(snapshot); latest.current = snapshot
  const [preview, setPreview] = useState<{ snapshot: RecipeSnapshot; result: RecipeCompileResult } | null>(null)
  const [notice, setNotice] = useState('')
  const [mode, setMode] = useState<'light' | 'dark'>('light')
  const [viewport, setViewport] = useState<'wide' | 'narrow'>('wide')
  const result = preview?.snapshot === snapshot ? preview.result : null
  const json = canonicalize(snapshot.recipe) + '\n'
  const command = recipeInstallBlocked(snapshot.recipe) ? null
    : recipeSnapshotInstallCommand({ origin, reference: snapshot.id + '@' + snapshot.revision, recipeHash: snapshot.recipeHash }, publishedInstaller)
  useEffect(() => {
    let active = true
    void (async () => {
      try {
        const verified = await verifyRecipeSnapshot(snapshot)
        const compiled = await compileRecipe({ recipe: verified.recipe })
        if (active && latest.current === snapshot) setPreview({ snapshot, result: compiled })
      } catch {
        if (active && latest.current === snapshot) setNotice('Preview unavailable. Verified recipe JSON remains available below.')
      }
    })()
    return () => { active = false }
  }, [snapshot])
  return <main className={styles.editor}>
    <h1>Published Button recipe</h1>
    <p><code>{snapshot.id}@{snapshot.revision}</code></p>
    <p>This immutable public snapshot is a draft. Publishing verifies schema and compilation; it does not imply accessibility or quality review.</p>
    <p>There is no automatic expiry while the service operates or anonymous edit/delete action. An operator may withdraw access; downloaded copies and installed source cannot be recalled.</p>
    <p>Installs one isolated Button recipe. Initialize a project first. Saved project defaults remain unchanged. Increase the embedded recipe revision before installing changed content under the same identity.</p>
    <dl>
      <dt>Recipe identity</dt><dd>{snapshot.recipe.id}@{snapshot.recipe.revision}</dd>
      <dt>Recipe hash</dt><dd><code>{snapshot.recipeHash}</code></dd>
      <dt>Preset hash</dt><dd><code>{snapshot.presetHash}</code></dd>
      <dt>Catalog / compiler</dt><dd>{snapshot.catalogRelease} / {snapshot.compilerVersion}</dd>
    </dl>
    <label>Preview mode <select value={mode} onChange={event => setMode(event.target.value as typeof mode)}><option value="light">Light</option><option value="dark">Dark</option></select></label>
    <label>Preview width <select value={viewport} onChange={event => setViewport(event.target.value as typeof viewport)}><option value="wide">Wide</option><option value="narrow">Narrow</option></select></label>
    {result && <PreviewFrame key={snapshot.id + '@' + snapshot.revision} result={result} view={{ mode, viewport, panel: 'preview', forcedState: 'none' }} />}
    {command ? <>
      <label>Install command<textarea aria-label="Install command" readOnly value={command} rows={5} /></label>
      <p>This command runs the published {publishedInstaller.packageName}@{publishedInstaller.version} installer through npx (Node 24.19.0 or newer Node 24). Replace APP with the target directory, review the plan, then use --yes to apply.</p>
      <button type="button" onClick={async () => { const current = snapshot; try { await navigator.clipboard.writeText(command); if (latest.current === current) setNotice('Install command copied.') } catch { if (latest.current === current) setNotice('Copy unavailable. Select the install command text above.') } }}>Copy install command</button>
    </> : <p>{glassMaterialInstallNotice}</p>}
    <button type="button" onClick={() => { try { downloadPresetText(json, 'button.recipe.json'); setNotice('Recipe JSON downloaded.') } catch { setNotice('Download unavailable. Select the recipe JSON below.') } }}>Download recipe JSON</button>
    <label>Recipe JSON<textarea aria-label="Recipe JSON" readOnly value={json} rows={10} /></label>
    {result && <ArtifactPanel result={result} recipeJson={json} stale={false} onStatus={setNotice} />}
    <p role="status" aria-live="polite">{notice}</p>
    <a href="/editor/component/button">Open the Button editor</a>
  </main>
}
