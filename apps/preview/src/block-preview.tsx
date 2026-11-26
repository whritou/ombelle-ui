import * as React from 'react'
import { createRoot } from 'react-dom/client'
import { styleFamilies, type StyleFamily } from '../../../packages/contracts/src/style-families.js'
import { supportedBlockIds } from '../../../packages/contracts/src/block-ids.js'
import { blockFamilyFonts, blockGlassBackdrop, blockModules, loadGlassFilter } from './generated/block-preview'
// The glass scenes are page backdrop: the kit gradient exists only in this stylesheet.
import './glass-backdrop.css'
import { GlassBackdropArt, setGlassBackdrop } from './glass-backdrop-art'
import { loadPresetFonts } from './preset-fonts'
import { blockStylesOrigin } from '../../www/src/editor/preview-url'

// One block on its own page, for the website's block pages: /block-preview/?block=<id>&family=<family>#<light|dark>.
// The block is the compiled file `add <block>` installs; its family's look is one stylesheet the website serves,
// /previews/<family>/blocks/<id>.css (scripts/generate-www-previews.ts). The mode is the hash, so a mode change
// restyles the page without reloading it; a family change loads a new page with its own stylesheet.

const modeOf = (): 'light' | 'dark' => (window.location.hash === '#dark' ? 'dark' : 'light')

/** The website's origin, which serves the stylesheets: '' (this origin) unless a loopback dev site framed this page. */
const siteOrigin = () => blockStylesOrigin(document.referrer, window.location.origin)

function BlockPage({ Block, Filter, family }: { Block: React.ComponentType; Filter: React.ComponentType | null; family: StyleFamily }) {
  const [mode, setMode] = React.useState(modeOf)
  React.useEffect(() => {
    const onHash = () => setMode(modeOf())
    window.addEventListener('hashchange', onHash)
    return () => window.removeEventListener('hashchange', onHash)
  }, [])
  const scene = family === 'liquid-glass' ? blockGlassBackdrop[mode] : undefined
  React.useLayoutEffect(() => {
    document.documentElement.classList.toggle('dark', mode === 'dark')
    setGlassBackdrop(document.documentElement, scene)
  }, [mode, scene])
  // The website sizes the frame to the block, so the page shows it whole at every width.
  const main = React.useRef<HTMLElement>(null)
  React.useEffect(() => {
    const element = main.current
    if (!element || window.parent === window) return
    const report = () => window.parent.postMessage({ type: 'ombelle-block-size', height: Math.ceil(element.getBoundingClientRect().height) }, '*')
    const observer = new ResizeObserver(report)
    observer.observe(element)
    return () => observer.disconnect()
  }, [])
  return <>
    {scene && <GlassBackdropArt scene={scene} />}
    {Filter && <Filter />}
    <main ref={main} data-block-preview-page="" aria-label="Block preview">
      <Block />
    </main>
  </>
}

export async function mountBlockPreview(root: HTMLElement): Promise<void> {
  const params = new URLSearchParams(window.location.search)
  const id = params.get('block') ?? ''
  const family = params.get('family') ?? ''
  const page = createRoot(root)
  if (!(supportedBlockIds as readonly string[]).includes(id) || !(styleFamilies as readonly string[]).includes(family))
    return page.render(<main><h1>Unknown block preview</h1></main>)
  const link = document.createElement('link')
  link.rel = 'stylesheet'
  link.href = `${siteOrigin()}/previews/${family}/blocks/${id}.css`
  link.dataset.blockStyles = ''
  const styled = new Promise<void>((resolve) => {
    link.onload = link.onerror = () => resolve()
  })
  document.head.append(link)
  // A plain page around the block, as in an app: the block brings its own spacing.
  const style = document.createElement('style')
  style.textContent = 'body { margin: 0; min-block-size: 100vh; background: var(--background); color: var(--foreground); font-family: var(--font-family) } main[data-block-preview-page] { position: relative; padding-block: 1.5rem }'
  document.head.append(style)
  const [module, Filter] = await Promise.all([
    blockModules[id]!(),
    family === 'liquid-glass' ? loadGlassFilter() : Promise.resolve(null),
    loadPresetFonts(blockFamilyFonts[family] ?? []),
    styled,
  ])
  // Each block file exports one component.
  const Block = Object.values(module).find((value) => typeof value === 'function') as React.ComponentType
  page.render(<BlockPage Block={Block} Filter={Filter} family={family as StyleFamily} />)
}
