import type { StyleFamily } from '@ombelle/contracts'

/**
 * A palette as the landing page needs it: ten colours per mode, in the order
 * background, foreground, card, primary, primaryForeground, secondary,
 * secondaryForeground, muted, mutedForeground, border.
 */
export type LandingPalette = { name: string; light: readonly string[]; dark: readonly string[] }

/** A liquid glass starting preset, reduced to the two values the page can show. */
export type LandingGlassPreset = { name: string; blurPx: number; opacity: number }

/** The design values a visitor changes with the sliders; an unset key keeps the family default. */
export type LandingTweaks = { radiusPx?: number; borderPx?: number; shadowPx?: number }

export type FamilyDesign = { radiusPx: number; borderPx: number; shadowXPx: number; shadowYPx: number }

type Meta = {
  name: string
  short: string
  blurb: string
  /** What to look for in the family's tile. */
  signature: string
  fonts: string
  /** The family's built-in preset design values (packages/catalog/src/presets). */
  design: FamilyDesign
}

export const familyMeta: Record<StyleFamily, Meta> = {
  ombelle: {
    name: 'Ombelle', short: 'Ombelle', blurb: 'Pill buttons, rounded cards and fine ink outlines.',
    signature: 'pills everywhere, and buttons that slide onto a crisp offset shadow when pressed.',
    fonts: 'Bricolage Grotesque · Figtree', design: { radiusPx: 12, borderPx: 1.5, shadowXPx: 3, shadowYPx: 3 },
  },
  papier: {
    name: 'Papier', short: 'Papier', blurb: 'Warm paper, ink rules and a serif voice.',
    signature: 'the double rule on top of the card, the dotted divider, the italic link and the stamp press.',
    fonts: 'Fraunces · Instrument Sans · IBM Plex Mono', design: { radiusPx: 2, borderPx: 1, shadowXPx: 0, shadowYPx: 2 },
  },
  organic: {
    name: 'Organic', short: 'Organic', blurb: 'Soft, uneven shapes in moss and cream.',
    signature: 'the tinted blob, the wavy link, the pebble button, and corners that shift when you hover.',
    fonts: 'Young Serif · Nunito · DM Mono', design: { radiusPx: 20, borderPx: 2, shadowXPx: 0, shadowYPx: 8 },
  },
  'retro-futurism': {
    name: 'Retro futurism', short: 'Retro', blurb: 'Space-age pills in rocket orange and indigo.',
    signature: 'the sunset band with its striped sun, two-tone scanline pills and the striped progress.',
    fonts: 'Michroma · Exo 2 · Space Mono', design: { radiusPx: 14, borderPx: 2, shadowXPx: 0, shadowYPx: 4 },
  },
  minimalist: {
    name: 'Minimalist', short: 'Minimalist', blurb: 'Hairline borders, quiet type, nothing decorative.',
    signature: 'the ruled input, hairline rows and a single thin underline. Whitespace does the rest.',
    fonts: 'Geist', design: { radiusPx: 4, borderPx: 1, shadowXPx: 0, shadowYPx: 0 },
  },
  'neo-brutalism': {
    name: 'Neo-Brutalism', short: 'Neo-brutal', blurb: 'Thick ink borders, hard shadows, uppercase type.',
    signature: 'tilted badges, a banded header and a button that slams into its shadow.',
    fonts: 'Space Grotesk · Work Sans · Space Mono', design: { radiusPx: 0, borderPx: 2.5, shadowXPx: 4, shadowYPx: 4 },
  },
  flat: {
    name: 'Flat', short: 'Flat', blurb: 'Colour blocks and zero noise. No borders at all.',
    signature: 'surfaces told apart by fill alone: colour blocks, a filled input, no outline anywhere.',
    fonts: 'DM Sans', design: { radiusPx: 8, borderPx: 0, shadowXPx: 0, shadowYPx: 0 },
  },
  'liquid-glass': {
    name: 'Liquid glass', short: 'Glass', blurb: 'Translucent surfaces with blur and an opaque fallback.',
    signature: 'the colours behind the panel showing through, more or less with each preset below.',
    fonts: 'Inter Tight · Inter · JetBrains Mono', design: { radiusPx: 12, borderPx: 1, shadowXPx: 0, shadowYPx: 12 },
  },
}

/** Families whose borders are fills or hairlines, so a palette's border colour is only a divider. */
const quietBorders: readonly StyleFamily[] = ['flat', 'minimalist']
/** Families whose offset shadow is drawn in the border colour in light mode. */
const inkShadows: readonly StyleFamily[] = ['ombelle', 'neo-brutalism', 'papier', 'retro-futurism']

/** The custom properties a palette sets on a family element. */
export function paletteVars(family: StyleFamily, palette: LandingPalette | undefined, dark: boolean): Record<string, string> {
  if (!palette) return {}
  const c = dark ? palette.dark : palette.light
  const [background, foreground, card, primary, primaryForeground, secondary, secondaryForeground, muted, mutedForeground, border] = c as string[]
  const vars: Record<string, string> = {
    '--bg': background!, '--fg': foreground!, '--card': card!, '--pri': primary!, '--prif': primaryForeground!,
    '--sec': secondary!, '--secf': secondaryForeground!, '--mut': muted!, '--mfg': mutedForeground!, '--ring': primary!,
  }
  if (quietBorders.includes(family)) {
    vars['--cbd'] = border!
    vars['--div'] = `1px solid ${border}`
  } else vars['--bd'] = border!
  // Accent text must read on the background: a yellow or near-black primary cannot be it.
  vars['--at'] = family === 'minimalist' || (family === 'neo-brutalism' && !dark) ? foreground! : primary!
  if (!dark && inkShadows.includes(family)) vars['--shc'] = border!
  if (family === 'retro-futurism') vars['--g1'] = primary!
  return vars
}

/** The custom properties a glass preset sets: how much backdrop shows through. */
export function glassVars(preset: LandingGlassPreset | undefined, dark: boolean): Record<string, string> {
  if (!preset) return {}
  return {
    '--cbf': `blur(${preset.blurPx}px) saturate(1.6)`,
    '--card': `rgb(${dark ? '30 41 59' : '255 255 255'} / ${preset.opacity})`,
  }
}

/** The custom properties the sliders set; each slider owns one group. */
export function tweakVars(tweaks: LandingTweaks): Record<string, string> {
  const vars: Record<string, string> = {}
  if (tweaks.radiusPx !== undefined) {
    const r = `${tweaks.radiusPx}px`
    Object.assign(vars, {
      '--r': r, '--rc': `${Math.round(tweaks.radiusPx * 1.4)}px`, '--rb': r, '--rbh': r, '--ri': r, '--rseg': r,
      '--rsegi': `${Math.max(0, tweaks.radiusPx - 3)}px`, '--rbd': r, '--rsw': r, '--rbar': r,
    })
  }
  if (tweaks.borderPx !== undefined) {
    const b = `${tweaks.borderPx}px`
    Object.assign(vars, {
      '--bw': b, '--bbw': b, '--cbw': b, '--ibw': b, '--bdw': b,
      '--ibot': `${b} solid var(--bd)`, '--ctop': `${b} solid var(--bd)`, '--obsh': 'none',
    })
  }
  if (tweaks.shadowPx !== undefined) {
    const s = tweaks.shadowPx
    if (s === 0) Object.assign(vars, { '--bsh': 'none', '--bshh': 'none', '--bsha': 'none', '--csh': 'none', '--ish': 'none', '--bth': 'none', '--bta': 'scale(.97)' })
    else Object.assign(vars, {
      '--bsh': `${s}px ${s}px 0 var(--shc)`, '--bshh': `${s + 1}px ${s + 1}px 0 var(--shc)`, '--bsha': '0 0 0 var(--shc)',
      '--csh': `${s + 2}px ${s + 2}px 0 var(--shc)`, '--bth': 'translate(-1px,-1px)', '--bta': `translate(${s}px,${s}px)`,
    })
  }
  return vars
}

/** The preset design values after the sliders, as the preset JSON names them. */
export function designValues(design: FamilyDesign, tweaks: LandingTweaks) {
  const radiusPx = tweaks.radiusPx ?? design.radiusPx
  return {
    radiusPx,
    radiusRem: Number((radiusPx / 16).toFixed(4)),
    borderWidthPx: tweaks.borderPx ?? design.borderPx,
    shadowOffsetXPx: tweaks.shadowPx ?? design.shadowXPx,
    shadowOffsetYPx: tweaks.shadowPx ?? design.shadowYPx,
    shadowPx: tweaks.shadowPx ?? Math.max(design.shadowXPx, design.shadowYPx),
  }
}

/**
 * An example preset code in the published shape (`ps_` + 32 hex + `@1`), derived
 * from the design so the same design always shows the same code. It is not a
 * published snapshot and does not install.
 */
export function exampleCode(seed: string): string {
  let hex = ''
  for (let n = 0; n < 4; n++) {
    let h = 2166136261 ^ n
    for (let i = 0; i < seed.length; i++) {
      h ^= seed.charCodeAt(i)
      h = Math.imul(h, 16777619)
    }
    h ^= h >>> 13
    h = Math.imul(h, 0x5bd1e995)
    hex += ((h ^ (h >>> 15)) >>> 0).toString(16).padStart(8, '0')
  }
  return `ps_${hex}@1`
}
