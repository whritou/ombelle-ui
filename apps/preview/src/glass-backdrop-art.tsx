import type { PresetBackdrop } from '../../www/src/preset-editor/preview-protocol'
import type { LabInk } from '../../www/src/site/glass-backdrops'

/**
 * Puts the preview root over a glass backdrop, or takes it off with undefined. Every glass
 * preview goes through here so one starting preset shows the same scene everywhere. Kit is
 * the stylesheet's own gradient: naming it would switch that gradient off with no art drawn.
 */
export function setGlassBackdrop(root: HTMLElement, scene: PresetBackdrop | undefined, labInk: LabInk | null = null) {
  if (scene) root.dataset.backdrop = 'glass'
  else delete root.dataset.backdrop
  if (scene && scene !== 'kit') root.dataset.glassBackdrop = scene
  else delete root.dataset.glassBackdrop
  if (scene && labInk) root.setAttribute('data-glass-lab-ink', labInk)
  else root.removeAttribute('data-glass-lab-ink')
}

/** The lab's optical test backgrounds, kept as vector art so the same lines refract at any size. */
export function GlassBackdropArt({ scene }: { scene: PresetBackdrop }) {
  if (scene === 'kit') return null
  if (scene === 'mist' || scene === 'dawn' || scene === 'grid') return <LightBackdropArt scene={scene} />
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
  const [skyTop, skyBottom] = night ? ['#0b0614', '#2b0f3a'] : ['#15265e', '#053d6f']
  return (
    <svg className="glass-backdrop-art" viewBox="0 0 960 600" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
      <defs>
        <linearGradient id="glass-sky" x2=".84" y2="1">
          <stop stopColor={skyTop} />
          <stop stopColor={skyBottom} offset="1" />
        </linearGradient>
        <linearGradient id="glass-ribbon" x2=".78" y2="1">
          <stop stopColor="#e6ffef" />
          <stop offset=".4" stopColor={night ? '#e07ad0' : '#55e5c7'} />
          <stop offset="1" stopColor={night ? '#6a2bb8' : '#3d8cec'} />
        </linearGradient>
        <linearGradient id="glass-ribbon-fold" x2="1" y2=".4">
          <stop stopColor={night ? '#14051f' : '#010d37'} />
          <stop offset=".55" stopColor={night ? '#5a2a9e' : '#2167c5'} />
          <stop offset="1" stopColor={night ? '#f1a7e6' : '#84f3d4'} />
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
      <circle cx="715" cy="225" r="177" fill="none" stroke="#c5fff6" strokeOpacity=".25" />
      <circle cx="715" cy="225" r="152" fill="none" stroke="#c5fff6" strokeOpacity=".18" />
      <use href="#glass-ribbon-line" fill="none" stroke="url(#glass-ribbon-fold)" strokeWidth="162" transform="translate(0 49)" opacity=".8" />
      <use href="#glass-ribbon-line" fill="none" stroke="url(#glass-ribbon)" strokeWidth="110" opacity={night ? '.6' : '.96'} />
      {Array.from({ length: 15 }, (_, index) => (
        <use key={index} href="#glass-ribbon-line" transform={`translate(0 ${index * 7 - 52})`}
          fill="none" stroke="#effffa" strokeWidth="1" opacity={index % 3 === 0 ? '.42' : '.2'} />
      ))}
      <rect width="960" height="600" fill="url(#glass-grid)" opacity=".23" />
      <rect width="960" height="600" fill="url(#glass-grain)" />
    </svg>
  )
}

const lightScenes = {
  // Brume: a cool, pale sky with soft blue, lilac and mint light.
  mist: { sky: ['#f3f6fb', '#dfe7f2'], blobs: ['#a9c9f2', '#cdbff2', '#bfe9dc'], ribbon: ['#ffffff', '#b8d2f3', '#8fb0e6'], line: '#5b7bb0' },
  // Aube: a warm pastel dawn, peach into lilac.
  dawn: { sky: ['#fdf0e8', '#ece2f7'], blobs: ['#f8bfa8', '#f3b3cf', '#c8b8f0'], ribbon: ['#fffaf6', '#f5bccb', '#b7a3ec'], line: '#9a6a8e' },
  // Trame: a blueprint on paper, for light text-on-glass checks.
  grid: { sky: ['#f6f8fc', '#e8eef8'], blobs: ['#b5cdf5', '#d7e3f8', '#c3e6f0'], ribbon: ['#ffffff', '#c9dbf6', '#9dbbeb'], line: '#3c64b4' },
} as const

/** Light scenes: dark preset ink reads on them without a halo, and the glass still has colour to bend. */
function LightBackdropArt({ scene }: { scene: keyof typeof lightScenes }) {
  const { sky, blobs, ribbon, line } = lightScenes[scene]
  const id = (name: string) => `glass-${scene}-${name}`
  const grid = scene === 'grid'
  return (
    <svg className="glass-backdrop-art" viewBox="0 0 960 600" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
      <defs>
        <linearGradient id={id('sky')} x2=".84" y2="1">
          <stop stopColor={sky[0]} />
          <stop offset="1" stopColor={sky[1]} />
        </linearGradient>
        <linearGradient id={id('ribbon')} x2=".78" y2="1">
          <stop stopColor={ribbon[0]} />
          <stop offset=".45" stopColor={ribbon[1]} />
          <stop offset="1" stopColor={ribbon[2]} />
        </linearGradient>
        <filter id={id('blur')} x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="60" />
        </filter>
        <pattern id={id('grid')} width="30" height="30" patternUnits="userSpaceOnUse">
          <path d="M30 0H0V30" fill="none" stroke={line} strokeOpacity=".14" />
        </pattern>
        <path id={id('line')} d="M-90 490C140 590 281 105 466 240S671 535 1050 40" />
      </defs>
      <rect width="960" height="600" fill={`url(#${id('sky')})`} />
      <g filter={`url(#${id('blur')})`}>
        <circle cx="180" cy="170" r="170" fill={blobs[0]} opacity=".75" />
        <circle cx="760" cy="150" r="150" fill={blobs[1]} opacity=".7" />
        <circle cx="620" cy="500" r="190" fill={blobs[2]} opacity=".7" />
      </g>
      {grid ? (
        <>
          <rect width="960" height="600" fill={`url(#${id('grid')})`} />
          <g fill="none" stroke={line} strokeWidth="2" opacity=".45">
            <path d="M-20 454H131L345 130H569L862 455H984M-20 481H161L374 157H541L834 482H984M-20 508H190L405 185H514L804 509H984" />
            <path d="M160 80V545M480 80V545M800 80V545M75 300H885" strokeDasharray="5 7" />
          </g>
        </>
      ) : (
        <>
          <use href={`#${id('line')}`} fill="none" stroke={`url(#${id('ribbon')})`} strokeWidth="120" opacity=".85" />
          {Array.from({ length: 12 }, (_, index) => (
            <use key={index} href={`#${id('line')}`} transform={`translate(0 ${index * 8 - 44})`}
              fill="none" stroke={line} strokeWidth="1" opacity={index % 3 === 0 ? '.22' : '.1'} />
          ))}
          <rect width="960" height="600" fill={`url(#${id('grid')})`} opacity=".35" />
        </>
      )}
    </svg>
  )
}
