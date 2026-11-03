import type { Preset } from '@ombelle/contracts'

type ColorKey = keyof Preset['modes']['light']
type Rgb = readonly [number, number, number]

export type GlassContrastPair = {
  mode: 'light' | 'dark'
  surface: ColorKey
  text: ColorKey
  ratioOverBlack: number
  ratioOverWhite: number
  passes: boolean
}
export type GlassContrastReport = {
  opacity: number
  transparency: 'auto' | 'reduced'
  pairs: GlassContrastPair[]
  passes: boolean
  minimumOpacity: number | null
}

export const glassContrastPairs: readonly [surface: ColorKey, text: ColorKey][] =
  [
    ['card', 'cardForeground'],
    ['card', 'mutedForeground'],
    ['popover', 'popoverForeground'],
    ['popover', 'mutedForeground'],
    ['muted', 'foreground'],
    ['muted', 'mutedForeground'],
    ['secondary', 'secondaryForeground'],
    ['background', 'foreground'],
  ]

const clamp01 = (v: number) => Math.min(1, Math.max(0, v))
const encode = (c: number) =>
  c <= 0.0031308 ? 12.92 * c : 1.055 * c ** (1 / 2.4) - 0.055
const decode = (c: number) =>
  c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4

type Color = { rgb: Rgb; alpha: number }

/** Parses '#rrggbb' or 'oklch(L C H[ / A])' to gamma-encoded sRGB in 0..1 plus alpha. */
function parseColor(color: string): Color {
  const value = color.trim()
  if (/^#[0-9a-f]{6}$/i.test(value))
    return {
      rgb: [1, 3, 5].map(
        (i) => parseInt(value.slice(i, i + 2), 16) / 255,
      ) as unknown as Rgb,
      alpha: 1,
    }
  const m = /^oklch\(\s*([^\s/)]+)\s+([^\s/)]+)\s+([^\s/)]+)(?:\s*\/\s*([^\s)]+))?\s*\)$/i.exec(
    value,
  )
  if (!m) throw new Error(`Unsupported colour for glass contrast: ${color}`)
  const num = (s: string) =>
    s.endsWith('%') ? Number(s.slice(0, -1)) / 100 : Number(s)
  const alpha = m[4] === undefined ? 1 : clamp01(num(m[4]))
  const L = num(m[1])
  const C = Number(m[2])
  const h = (Number(m[3].replace('deg', '')) * Math.PI) / 180
  const a = C * Math.cos(h)
  const b = C * Math.sin(h)
  const l = (L + 0.3963377774 * a + 0.2158037573 * b) ** 3
  const mm = (L - 0.1055613458 * a - 0.0638541728 * b) ** 3
  const s = (L - 0.0894841775 * a - 1.291485548 * b) ** 3
  const lin = [
    4.0767416621 * l - 3.3077115913 * mm + 0.2309699292 * s,
    -1.2684380046 * l + 2.6097574011 * mm - 0.3413193965 * s,
    -0.0041960863 * l - 0.7034186147 * mm + 1.707614701 * s,
  ]
  return {
    rgb: lin.map((v) => clamp01(encode(clamp01(v)))) as unknown as Rgb,
    alpha,
  }
}

const luminanceOf = (rgb: Rgb) =>
  decode(rgb[0]) * 0.2126 + decode(rgb[1]) * 0.7152 + decode(rgb[2]) * 0.0722

/** Luminance of the colour's own channels; alpha is not composited here. */
export function relativeLuminance(color: string): number {
  return luminanceOf(parseColor(color).rgb)
}

const ratio = (a: number, b: number) =>
  (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05)

// color-mix(in srgb, surface alpha, transparent) over backdrop b in {0, 1}
const over = (s: number, alpha: number, b: 0 | 1) => alpha * s + (1 - alpha) * b
const composite = (rgb: Rgb, alpha: number, b: 0 | 1): Rgb => [
  over(rgb[0], alpha, b),
  over(rgb[1], alpha, b),
  over(rgb[2], alpha, b),
]

/**
 * Contrast against the text is V-shaped in the surface luminance: it falls to
 * 1:1 where the surface matches the text and rises on either side. Passing at
 * both composite ends therefore only proves safety when the text luminance lies
 * outside the [over-black, over-white] interval; inside it, some backdrop makes
 * the surface match the text. With an effective coverage of 0.6..1 (an opaque
 * surface token and the schema's glassOpacity range) both ends cannot pass with
 * the text inside the interval: that needs (Yw + 0.05) / (Yb + 0.05) >=
 * 4.5 * 4.5 = 20.25, while at coverage >= 0.6 the ratio is at most about 3.7.
 * The explicit check keeps the guarantee if the range widens or a translucent
 * surface token lowers the coverage.
 */
function textBetween(
  textLum: number,
  lumOverBlack: number,
  lumOverWhite: number,
): boolean {
  return textLum > lumOverBlack && textLum < lumOverWhite
}

function evaluate(data: Preset, opacity: number): GlassContrastPair[] {
  const pairs: GlassContrastPair[] = []
  for (const mode of ['light', 'dark'] as const) {
    const colors = data.modes[mode] as Record<string, string>
    for (const [surface, text] of glassContrastPairs) {
      const surfaceColor = parseColor(colors[surface])
      const textColor = parseColor(colors[text])
      // A translucent surface token stacks with glassOpacity: color-mix keeps
      // the token's own alpha, so the effective coverage is opacity * alpha.
      const effective = opacity * surfaceColor.alpha
      const textLum = luminanceOf(textColor.rgb)
      const lumOverBlack = luminanceOf(composite(surfaceColor.rgb, effective, 0))
      const lumOverWhite = luminanceOf(composite(surfaceColor.rgb, effective, 1))
      const ratioOverBlack = ratio(lumOverBlack, textLum)
      const ratioOverWhite = ratio(lumOverWhite, textLum)
      pairs.push({
        mode,
        surface,
        text,
        ratioOverBlack,
        ratioOverWhite,
        passes:
          // Translucent text takes on the backdrop too; it is never bounded.
          textColor.alpha >= 1 &&
          ratioOverBlack >= 4.5 &&
          ratioOverWhite >= 4.5 &&
          !textBetween(textLum, lumOverBlack, lumOverWhite),
      })
    }
  }
  return pairs
}

export function glassContrastReport(data: Preset): GlassContrastReport {
  const transparency = data.design?.transparency ?? 'auto'
  const configured = data.design?.glassOpacity ?? 1
  const opacity = transparency === 'reduced' ? 1 : configured
  const pairs = evaluate(data, opacity)
  let minimumOpacity: number | null = null
  for (let step = 60; step <= 100; step++) {
    const candidate = step / 100
    if (evaluate(data, candidate).every((p) => p.passes)) {
      minimumOpacity = candidate
      break
    }
  }
  return {
    opacity,
    transparency,
    pairs,
    passes: pairs.every((p) => p.passes),
    minimumOpacity,
  }
}
