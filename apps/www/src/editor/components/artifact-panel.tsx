import { useState } from 'react'
import type { RecipeCompileResult } from '@ombelle/contracts'

type Tab = 'Usage' | 'Component' | 'CSS' | 'Dependencies' | 'Recipe JSON' | 'Details' | 'CLI'
const tabs: Tab[] = ['Usage', 'Component', 'CSS', 'Dependencies', 'Recipe JSON', 'Details', 'CLI']

function tabContent(tab: Tab, result: RecipeCompileResult, json: string): string {
  if (tab === 'Dependencies') return result.dependencies.length
    ? result.dependencies.map(({ name, version }) => `${name}@${version}`).join('\n')
    : 'No additional dependencies.'
  if (tab === 'Recipe JSON') return json
  if (tab === 'Details') return [
    `Recipe hash: ${result.recipe.hash}`, `Preset hash: ${result.preset.hash}`,
    `Catalog release: ${result.provenance.catalogRelease}`,
    `Compiler version: ${result.provenance.compilerVersion}`,
  ].join('\n')
  if (tab === 'CLI') return 'pnpm exec node packages/cli/dist/main.js add --recipe ./button.recipe.json --cwd APP --yes'
  const kind = tab === 'CSS' ? 'style' : tab.toLowerCase()
  return result.artifacts.find((artifact) => artifact.kind === kind)?.content ?? ''
}

export function ArtifactPanel({ result, recipeJson, stale, onStatus }: {
  result: RecipeCompileResult | null
  recipeJson: string | null
  stale: boolean
  onStatus: (message: string) => void
}) {
  const [tab, setTab] = useState<Tab>('Usage')
  const content = result ? tabContent(tab, result, recipeJson ?? '') : ''
  async function copy() {
    try {
      await navigator.clipboard.writeText(content)
      onStatus(`${tab} copied.`)
    } catch {
      onStatus(`${tab} could not be copied. Check clipboard permissions.`)
    }
  }
  return (
    <section className="artifacts" aria-labelledby="artifacts-title">
      <div className="sectionTitle"><div><h2 id="artifacts-title">Generated output</h2><p>Compiled from this Button recipe.</p></div>
        {stale && <span className="staleBadge">Output is out of date</span>}
      </div>
      {result ? <>
        <div className="artifactTabs" role="tablist" aria-label="Generated artifacts">
          {tabs.map((item) => <button key={item} type="button" role="tab" id={`artifact-${item.replaceAll(' ', '-')}`}
            aria-selected={tab === item} aria-controls="artifact-panel" tabIndex={tab === item ? 0 : -1}
            onKeyDown={(event) => {
              if (event.key !== 'ArrowRight' && event.key !== 'ArrowLeft') return
              event.preventDefault()
              const next = (tabs.indexOf(item) + (event.key === 'ArrowRight' ? 1 : tabs.length - 1)) % tabs.length
              setTab(tabs[next]!)
              document.getElementById(`artifact-${tabs[next]!.replaceAll(' ', '-')}`)?.focus()
            }}
            onClick={() => setTab(item)}>{item}</button>)}
        </div>
        <div className="artifactToolbar"><span>{tab === 'CLI' ? 'Local installation' : tab}</span>
          <button type="button" onClick={() => void copy()} disabled={stale || (tab === 'Recipe JSON' && !recipeJson)} aria-label={`Copy ${tab}`}>Copy</button></div>
        <pre role="tabpanel" id="artifact-panel" aria-labelledby={`artifact-${tab.replaceAll(' ', '-')}`} tabIndex={0}><code>{content}</code></pre>
        {tab === 'CLI' && <p className="artifactNote">Run this from an initialized project. The CLI verifies conflicts before applying. An installed recipe ID and revision are immutable; increase the revision before installing changed content.</p>}
        {tab === 'Recipe JSON' && <p className="artifactNote">ID: {result.recipe.data.id} · Revision: {result.recipe.data.revision}. Changed content at an installed ID and revision needs a new revision.</p>}
      </> : <p>Compiling generated output…</p>}
    </section>
  )
}
