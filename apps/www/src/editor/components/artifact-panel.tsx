import { useState } from 'react'
import type { Recipe, RecipeCompileResult } from '@ombelle/contracts'
import { glassContrastWarning } from '@ombelle/compiler'
import { recipeFilename } from '../storage'
import { highlightCode, type CodeLanguage } from './code-highlight'
import code from './code-view.module.css'
import { glassMaterialMinimumCli, installerRunner, publishedInstaller, recipeInstallBlocked } from '../../snapshots/install-command'

export type Tab = 'Usage' | 'Component' | 'CSS' | 'Recipe' | 'Install'
const tabs: Tab[] = ['Usage', 'Component', 'CSS', 'Recipe', 'Install']

/** Metadata line: recipe hash, catalog/compiler provenance, then the dependency list. */
export function artifactMeta(result: RecipeCompileResult): string[] {
  return [
    result.recipe.hash,
    `Catalog ${result.provenance.catalogRelease} · Compiler ${result.provenance.compilerVersion}`,
    ...(result.dependencies.length
      ? [result.dependencies.map(({ name, version }) => `${name}@${version}`).join(', ')]
      : ['No additional dependencies']),
  ]
}

/** The Install tab: the command, or why there is none yet for glass material overrides. */
export function installText(recipe: Recipe, installer: { version: string } = publishedInstaller): string {
  if (recipeInstallBlocked(recipe, installer))
    return `# Glass material needs ${publishedInstaller.packageName} ${glassMaterialMinimumCli}, which is not published yet.
# Download the recipe now; the install command appears here once ${glassMaterialMinimumCli} is released.`
  return `${installerRunner({ ...publishedInstaller, version: installer.version })} add --recipe ./${recipeFilename(recipe)} --cwd APP --yes`
}

function tabContent(tab: Tab, result: RecipeCompileResult, json: string): string {
  if (tab === 'Recipe') return json
  if (tab === 'Install') return installText(result.recipe.data)
  const kind = tab === 'CSS' ? 'style' : tab.toLowerCase()
  return result.artifacts.find((artifact) => artifact.kind === kind)?.content ?? ''
}

const languages: Record<Tab, CodeLanguage> = { Usage: 'tsx', Component: 'tsx', CSS: 'css', Recipe: 'json', Install: 'shell' }
const languageNames: Record<CodeLanguage, string> = { tsx: 'TSX', css: 'CSS', json: 'JSON', shell: 'Shell' }

/** The file name shown on the editor tab: the artifact path where there is one. */
function tabFile(tab: Tab, result: RecipeCompileResult): string {
  if (tab === 'Recipe') return recipeFilename(result.recipe.data)
  if (tab === 'Install') return 'Terminal'
  const kind = tab === 'CSS' ? 'style' : tab.toLowerCase()
  return result.artifacts.find((artifact) => artifact.kind === kind)?.logicalPath ?? tab
}

export function ArtifactPanel({ result, recipeJson, stale, onStatus, notice = null }: {
  result: RecipeCompileResult | null
  recipeJson: string | null
  stale: boolean
  onStatus: (message: string) => void
  /** Experimental-family notice shown beside the export and CLI command. */
  notice?: string | null
}) {
  const [tab, setTab] = useState<Tab>('Usage')
  const content = result ? tabContent(tab, result, recipeJson ?? '') : ''
  const contrast = result && !stale ? glassContrastWarning(result.preset.data, result.recipe.data.overrides) : undefined
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
      {notice && <p className="artifactNote" data-testid="experimental-notice">{notice}</p>}
      {contrast && <p className="artifactNote" role="status">{contrast}</p>}
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
        <div className={code.window}>
          <div className={code.bar}>
            <span className={code.file}><span className={code.fileName}>{tabFile(tab, result)}</span><span className={code.lang}>{languageNames[languages[tab]]}</span></span>
            <button type="button" className={code.copy} onClick={() => void copy()} disabled={stale || (tab === 'Recipe' && !recipeJson)} aria-label={`Copy ${tab}`}>Copy</button>
          </div>
          <pre role="tabpanel" id="artifact-panel" aria-labelledby={`artifact-${tab.replaceAll(' ', '-')}`} tabIndex={0} className={code.code}><code>{highlightCode(content, languages[tab])}</code></pre>
        </div>
        {tab === 'Install' && <p className="artifactNote">Run from the folder containing the downloaded {recipeFilename(result.recipe.data)} with Node 24.19.0 or newer Node 24. Replace APP with the path to an initialized project. The CLI verifies conflicts before applying. An installed recipe ID and revision are immutable; increase the revision before installing changed content.</p>}
        {tab === 'Recipe' && <p className="artifactNote">ID: {result.recipe.data.id} · Revision: {result.recipe.data.revision}. Changed content at an installed ID and revision needs a new revision.</p>}
      </> : <p>Compiling generated output…</p>}
      {/* Build details close the page: recipe hash, provenance, dependencies. */}
      <footer className="artifactMeta" data-testid="artifact-meta">
        <span data-testid="recipe-hash">{result?.recipe.hash ?? 'Pending'}</span>
        {result && artifactMeta(result).slice(1).map((item) => <span key={item}>{item}</span>)}
      </footer>
    </section>
  )
}
