import { createRoot } from 'react-dom/client'
import { getCatalog } from '@ombelle/catalog'
import { presetBackdrops, type PresetBackdrop } from '../../www/src/preset-editor/preview-protocol'
import { GlassBackdropArt, setGlassBackdrop } from './glass-backdrop-art'
import './glass-backdrop.css'

/**
 * One glass preview scene alone, for measuring its channel range:
 * /glass-scene/?scene=<backdrop>&mode=<light|dark>. Kit is the stylesheet's gradient over
 * the family base preset's background.
 */
export function mountGlassScenePage(root: HTMLElement) {
  const params = new URLSearchParams(window.location.search)
  const scene = params.get('scene') as PresetBackdrop
  const mode = params.get('mode') === 'dark' ? 'dark' : 'light'
  if (!presetBackdrops.includes(scene)) {
    root.textContent = 'Unknown glass scene'
    return
  }
  const html = document.documentElement
  html.classList.toggle('dark', mode === 'dark')
  html.style.setProperty('--background', getCatalog('0.1.0').startingPresets['builtin-liquid-glass'].modes[mode].background ?? null)
  document.body.style.margin = '0'
  setGlassBackdrop(html, scene)
  createRoot(root).render(<GlassBackdropArt scene={scene} />)
  requestAnimationFrame(() => requestAnimationFrame(() => { html.dataset.sceneReady = 'true' }))
}
