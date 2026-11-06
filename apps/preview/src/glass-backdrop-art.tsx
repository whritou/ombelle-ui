import type { PresetBackdrop } from '../../www/src/preset-editor/preview-protocol'
import type { Preset } from '@ombelle/contracts'
import { defaultGlassPresetId, getCatalog } from '@ombelle/catalog'
import { normalizeColor } from '@ombelle/compiler'

const labDefaults = [
  [defaultGlassPresetId, 'prism'],
  ['builtin-liquid-glass-givre', 'prism'],
  ['builtin-liquid-glass-fume', 'prism'],
  ['builtin-liquid-glass-relief', 'peach'],
] as const

/** The lab's ink is for the default material and its paired backdrop. Custom edits keep the text plate. */
export function hasLabPreviewInk(preset: Preset, scene: PresetBackdrop): boolean {
  const catalog = getCatalog(preset.catalogRelease)
  return labDefaults.some(([id, backdrop]) => {
    if (backdrop !== scene) return false
    const reference = catalog.startingPresets[id]
    const designKeys = Object.keys(reference.design) as (keyof Preset['design'])[]
    return designKeys.every((key) => (preset.design[key] ?? 0) === (reference.design[key] ?? 0))
      && (['light', 'dark'] as const).every((mode) => Object.entries(reference.modes[mode]).every(([key, color]) => {
        const actual = preset.modes[mode][key as keyof Preset['modes']['light']]
        return actual !== undefined && normalizeColor(actual) === normalizeColor(color)
      }))
  })
}

/**
 * Puts the preview root over a glass backdrop, or takes it off with undefined. Every glass
 * preview goes through here so one starting preset shows the same scene everywhere. Kit is
 * the stylesheet's own gradient: naming it would switch that gradient off with no art drawn.
 */
export function setGlassBackdrop(root: HTMLElement, scene: PresetBackdrop | undefined, labInk = false) {
  if (scene) root.dataset.backdrop = 'glass'
  else delete root.dataset.backdrop
  if (scene && scene !== 'kit') root.dataset.glassBackdrop = scene
  else delete root.dataset.glassBackdrop
  root.toggleAttribute('data-glass-lab-ink', Boolean(scene) && labInk)
}

/** The lab's optical test backgrounds, kept as vector art so the same lines refract at any size. */
export function GlassBackdropArt({ scene }: { scene: PresetBackdrop }) {
  if (scene === 'kit') return null
  if (scene === 'peach') {
    return (
      <svg className="glass-backdrop-art" viewBox="0 0 960 600" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
        <defs>
          <linearGradient id="peach-wall" x2=".76" y2="1">
            <stop stopColor="#db8170" />
            <stop offset="1" stopColor="#b86e88" />
          </linearGradient>
          <linearGradient id="peach-floor" x2=".9" y2="1">
            <stop stopColor="#f1a87c" />
            <stop offset="1" stopColor="#b87967" />
          </linearGradient>
        </defs>
        <rect width="960" height="600" fill="url(#peach-wall)" />
        <path d="M0 0H960V106L0 31Z" fill="#bc7880" />
        <path d="M0 423L960 515V600H0Z" fill="url(#peach-floor)" />
      </svg>
    )
  }
  const night = scene === 'night'
  const grid = scene === 'grid'
  const [skyTop, skyBottom] = grid ? ['#101b3b', '#214b87'] : night ? ['#060b20', '#1b1445'] : ['#15265e', '#053d6f']
  return (
    <svg className="glass-backdrop-art" viewBox="0 0 960 600" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
      <defs>
        <linearGradient id="glass-sky" x2=".84" y2="1">
          <stop stopColor={skyTop} />
          <stop stopColor={skyBottom} offset="1" />
        </linearGradient>
        <linearGradient id="glass-ribbon" x2=".78" y2="1">
          <stop stopColor="#e6ffef" />
          <stop offset=".4" stopColor={night ? '#9774ef' : '#55e5c7'} />
          <stop offset="1" stopColor={night ? '#4c25b9' : '#3d8cec'} />
        </linearGradient>
        <linearGradient id="glass-ribbon-fold" x2="1" y2=".4">
          <stop stopColor="#010d37" />
          <stop offset=".55" stopColor="#2167c5" />
          <stop offset="1" stopColor="#84f3d4" />
        </linearGradient>
        <pattern id="glass-grid" width="30" height="30" patternUnits="userSpaceOnUse">
          <path d="M30 0H0V30" fill="none" stroke="white" strokeOpacity=".26" />
        </pattern>
        <pattern id="glass-grain" width="5" height="5" patternUnits="userSpaceOnUse">
          <circle cx="1" cy="1" r=".65" fill="white" opacity=".16" />
        </pattern>
        <path id="glass-ribbon-line" d="M-90 490C140 590 281 105 466 240S671 535 1050 40" />
      </defs>
      <rect width="960" height="600" fill="url(#glass-sky)" />
      {!grid && (
        <>
          <circle cx="715" cy="225" r="177" fill="none" stroke="#c5fff6" strokeOpacity=".25" />
          <circle cx="715" cy="225" r="152" fill="none" stroke="#c5fff6" strokeOpacity=".18" />
          <use href="#glass-ribbon-line" fill="none" stroke="url(#glass-ribbon-fold)" strokeWidth="162" transform="translate(0 49)" opacity=".8" />
          <use href="#glass-ribbon-line" fill="none" stroke="url(#glass-ribbon)" strokeWidth="110" opacity={night ? '.6' : '.96'} />
          {Array.from({ length: 15 }, (_, index) => (
            <use key={index} href="#glass-ribbon-line" transform={`translate(0 ${index * 7 - 52})`}
              fill="none" stroke="#effffa" strokeWidth="1" opacity={index % 3 === 0 ? '.42' : '.2'} />
          ))}
        </>
      )}
      <rect width="960" height="600" fill="url(#glass-grid)" opacity={grid ? '1' : '.23'} />
      <rect width="960" height="600" fill="url(#glass-grain)" />
      {grid && (
        <g fill="none" stroke="#81f4d5" strokeWidth="2" opacity=".78">
          <path d="M-20 454H131L345 130H569L862 455H984M-20 481H161L374 157H541L834 482H984M-20 508H190L405 185H514L804 509H984" />
          <path d="M160 80V545M480 80V545M800 80V545M75 300H885" strokeDasharray="5 7" />
        </g>
      )}
    </svg>
  )
}
