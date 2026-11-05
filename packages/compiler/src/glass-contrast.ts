import type { Preset } from '@ombelle/contracts'

type ColorKey = keyof Preset['modes']['light']
type Rgb = readonly [number, number, number]

export type GlassContrastPair = {
  mode: 'light' | 'dark'
  surface: ColorKey
  text: ColorKey
  /** The tint mixed into the surface, with the amount resolved for this mode. */
  tint?: { color: ColorKey; amount: number }
  /** The share of the glass opacity the surface covers, when it is less than 1. */
  coverage?: number
  /** Over the darkest backdrop the glass filter can produce, without sheen. */
  ratioOverBlack: number
  /** Over the brightest filtered backdrop, under the full sheen. */
  ratioOverWhite: number
  /** The opaque fallback surface, with and without its sheen. */
  ratioOpaque: number
  passes: boolean
}
/** Fractions in 0..1 of `color` mixed into the surface, per mode. */
export type GlassTint = { color: ColorKey; light: number; dark: number }
export type GlassPairSpec = {
  surface: ColorKey
  text: ColorKey
  tint?: GlassTint
  /**
   * Fraction in 0..1 of the glass opacity the surface paints, as in
   * calc(var(--glass-opacity) * 55%). Defaults to 1. The opaque fallback and
   * reduced transparency paint the surface whole, so they ignore it.
   */
  coverage?: number
}
export type GlassBackdrop = {
  /** CSS saturate(), contrast() and brightness() amounts, in filter order. */
  saturation: number
  contrast: number
  brightness: number
  /** Opacity of the white specular gradient laid over the surface. */
  sheen: number
  /** Gamma-encoded channel range every backdrop pixel lands in after the filter. */
  low: number
  high: number
}
export type GlassContrastReport = {
  opacity: number
  transparency: 'auto' | 'reduced'
  backdrop: Record<'light' | 'dark', GlassBackdrop>
  /** Coverage nested glass uses: it drops its own filter, so it sees raw 0..1 backdrops. */
  nestedOpacity: Record<'light' | 'dark', number> | null
  pairs: GlassContrastPair[]
  passes: boolean
  /** Lowest passing glassOpacity in 0.01 steps: the larger of the two modes. */
  minimumOpacity: number | null
  minimumOpacityByMode: Record<'light' | 'dark', number | null>
}

/**
 * Values used when a preset leaves a glass field out. Filter and sheen
 * defaults are neutral, so presets written before these fields compile to the
 * same bound as before; the built-in preset sets every field explicitly.
 */
export const glassDesignDefaults = {
  glassBlurPx: 12,
  glassOpacity: 1,
  glassSaturation: 1.4,
  glassBackdropContrast: 1,
  glassBackdropTone: 0,
  glassSheen: 0,
  glassRim: 0.35,
} as const
/** Dark mode scales the white sheen down; a bright sheen on dark glass would wash out light text. */
export const glassDarkSheenScale = 0.25
export const glassMinimumOpacity = 0.25

/** Resting Button tints per mode, as fractions, written as --glass-<color>-tint; hover adds 8 points. */
export const glassTints = {
  primary: { light: 0.18, dark: 0.22 },
  destructive: { light: 0.16, dark: 0.2 },
} as const
/** Points a Button hover adds to the resting tint (`+ 8%` in the stylesheet). */
export const glassHoverTint = 0.08
/** The neutral `foreground` tint secondary and outline Buttons gain on hover (6% in the stylesheet). */
export const glassNeutralHoverTint = 0.06

const tintPairs = (color: keyof typeof glassTints): GlassPairSpec[] => {
  const rest = glassTints[color]
  const hover = (v: number) => Math.round((v + glassHoverTint) * 100) / 100
  return [
    { surface: 'card', text: 'foreground', tint: { color, ...rest } },
    { surface: 'card', text: 'foreground', tint: { color, light: hover(rest.light), dark: hover(rest.dark) } },
  ]
}
const neutralHover: GlassTint = { color: 'foreground', light: glassNeutralHoverTint, dark: glassNeutralHoverTint }

export const glassContrastPairs: readonly GlassPairSpec[] = [
  { surface: 'card', text: 'cardForeground' },
  { surface: 'card', text: 'mutedForeground' },
  { surface: 'popover', text: 'popoverForeground' },
  { surface: 'popover', text: 'mutedForeground' },
  { surface: 'muted', text: 'foreground' },
  { surface: 'muted', text: 'mutedForeground' },
  { surface: 'secondary', text: 'secondaryForeground' },
  { surface: 'background', text: 'foreground' },
  // One-ink Button: foreground on card glass tinted at rest and on hover (+8 points).
  ...tintPairs('primary'),
  ...tintPairs('destructive'),
  // Secondary at rest and ghost on hover: foreground on untinted card glass.
  { surface: 'card', text: 'foreground' },
  // Secondary and outline hover: a 6% foreground tint on card and background glass.
  // Outline glass covers only 60% of the glass opacity; the bound checks it at full
  // coverage until pairs carry a coverage field.
  { surface: 'card', text: 'foreground', tint: neutralHover },
  { surface: 'background', text: 'foreground', tint: neutralHover },
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

const round = (v: number) => Math.round(v * 10000) / 10000

/**
 * The backdrop filter each mode emits, and the channel range it confines the
 * backdrop to. Filter functions work per channel on gamma-encoded sRGB and clamp
 * after every primitive (Filter Effects 1, sections 5 and 13). blur() averages
 * and saturate() is clamped to 0..1, so whatever the backdrop's colour, each
 * channel enters contrast() inside 0..1. contrast(c) maps v to c * v + (1 - c) / 2
 * and brightness(k) maps v to k * v, both increasing, so every channel leaves the
 * chain inside [low, high], the images of 0 and 1. Saturation cannot widen that
 * range; it only moves colours within it.
 */
export function glassBackdrop(
  design: Preset['design'] | undefined,
  mode: 'light' | 'dark',
): GlassBackdrop {
  const d = { ...glassDesignDefaults, ...design }
  if (d.transparency === 'reduced')
    return { saturation: 1, contrast: 1, brightness: 1, sheen: 0, low: 0, high: 1 }
  const contrast = d.glassBackdropContrast
  // Tone pushes the backdrop toward the mode's surfaces: lighter in light
  // mode, darker in dark mode.
  const brightness = round(
    mode === 'light' ? 1 + d.glassBackdropTone : 1 - d.glassBackdropTone,
  )
  const sheen = round(
    mode === 'light' ? d.glassSheen : d.glassSheen * glassDarkSheenScale,
  )
  const transfer = (v: number) =>
    clamp01(clamp01(contrast * v + (1 - contrast) / 2) * brightness)
  return {
    saturation: d.glassSaturation,
    contrast,
    brightness,
    sheen,
    low: transfer(0),
    high: transfer(1),
  }
}

// color-mix(in srgb, surface alpha, transparent) over backdrop channel b, then
// the sheen gradient (white at alpha sheen) on top, as the browser paints them.
const paint = (rgb: Rgb, alpha: number, b: number, sheen: number): Rgb =>
  rgb.map((s) => sheen + (1 - sheen) * (alpha * s + (1 - alpha) * b)) as unknown as Rgb

/**
 * Painted luminance increases with every backdrop channel and with the sheen,
 * so over a backdrop whose channels lie in [low, high] it is smallest over grey
 * low without sheen and largest over grey high under the full sheen.
 *
 * Contrast against the text is V-shaped in the surface luminance: it falls to
 * 1:1 where the surface matches the text and rises on either side. Passing at
 * both ends therefore only proves safety when the text luminance lies outside
 * the [darkest, brightest] interval; inside it, some backdrop makes the surface
 * match the text, so the pair fails.
 */
function bound(
  surface: Color,
  textLum: number,
  alpha: number,
  low: number,
  high: number,
  sheen: number,
) {
  const darkest = luminanceOf(paint(surface.rgb, alpha, low, 0))
  const brightest = luminanceOf(paint(surface.rgb, alpha, high, sheen))
  const overDarkest = ratio(darkest, textLum)
  const overBrightest = ratio(brightest, textLum)
  return {
    overDarkest,
    overBrightest,
    passes:
      overDarkest >= 4.5 &&
      overBrightest >= 4.5 &&
      !(textLum > darkest && textLum < brightest),
  }
}

/**
 * color-mix(in srgb, tint amount, surface): a linear mix of gamma-encoded
 * channels, premultiplied by alpha as CSS does (equal to a plain mix when both
 * colours are opaque).
 */
function mixTint(surface: Color, tint: Color, amount: number): Color {
  const alpha = amount * tint.alpha + (1 - amount) * surface.alpha
  if (alpha === 0) return { rgb: surface.rgb, alpha }
  const rgb = surface.rgb.map(
    (s, i) =>
      (amount * tint.alpha * tint.rgb[i] + (1 - amount) * surface.alpha * s) /
      alpha,
  ) as unknown as Rgb
  return { rgb, alpha }
}

type Resolved = {
  mode: 'light' | 'dark'
  surface: ColorKey
  text: ColorKey
  tint?: { color: ColorKey; amount: number }
  /** The declared coverage, or 1 when the surface is opaque under reduced transparency. */
  coverage: number
  declaredCoverage?: number
  surfaceColor: Color
  textColor: Color
  textLum: number
  backdrop: GlassBackdrop
}

function resolve(
  data: Preset,
  specs: readonly GlassPairSpec[],
): Resolved[] {
  const out: Resolved[] = []
  for (const mode of ['light', 'dark'] as const) {
    const colors = data.modes[mode] as Record<string, string>
    const backdrop = glassBackdrop(data.design, mode)
    const reduced = data.design?.transparency === 'reduced'
    for (const { surface, text, tint, coverage } of specs) {
      const textColor = parseColor(colors[text])
      const base = parseColor(colors[surface])
      const amount = tint?.[mode]
      out.push({
        mode,
        surface,
        text,
        ...(tint && amount !== undefined
          ? { tint: { color: tint.color, amount } }
          : {}),
        coverage: reduced ? 1 : (coverage ?? 1),
        ...(coverage !== undefined && coverage !== 1 ? { declaredCoverage: coverage } : {}),
        surfaceColor:
          tint && amount !== undefined
            ? mixTint(base, parseColor(colors[tint.color]), amount)
            : base,
        textColor,
        textLum: luminanceOf(textColor.rgb),
        backdrop,
      })
    }
  }
  return out
}

// A translucent surface token stacks with the glass opacity: color-mix keeps
// the token's own alpha, so the effective coverage is opacity * coverage * alpha.
const filtered = (r: Resolved, opacity: number) =>
  bound(
    r.surfaceColor,
    r.textLum,
    opacity * r.coverage * r.surfaceColor.alpha,
    r.backdrop.low,
    r.backdrop.high,
    r.backdrop.sheen,
  )
// Nested glass drops its own filter and sees the raw backdrop: any 0..1 pixel.
// Passing here at some coverage also passes the opaque fallback, whose painted
// luminance lies inside the same interval.
const raw = (r: Resolved, opacity: number) =>
  bound(r.surfaceColor, r.textLum, opacity * r.coverage * r.surfaceColor.alpha, 0, 1, r.backdrop.sheen)
// The opaque fallback paints the whole surface token, whatever its glass coverage.
const opaqueFallback = (r: Resolved) =>
  bound(r.surfaceColor, r.textLum, r.surfaceColor.alpha, 0, 1, r.backdrop.sheen)
// Translucent text takes on the backdrop too; it is never bounded.
const opaqueText = (r: Resolved) => r.textColor.alpha >= 1

const steps = (from: number) => {
  const out: number[] = []
  for (let step = Math.round(from * 100); step <= 100; step++) out.push(step / 100)
  return out
}

function nested(resolved: Resolved[], opacity: number) {
  const result = { light: 1, dark: 1 }
  for (const mode of ['light', 'dark'] as const) {
    const pairs = resolved.filter((r) => r.mode === mode)
    const found = steps(0).find((o) => pairs.every((r) => raw(r, o).passes))
    if (found === undefined) return null
    result[mode] = Math.max(opacity, found)
  }
  return result
}

export function glassContrastReport(data: Preset): GlassContrastReport {
  return glassContrastReportFor(data, glassContrastPairs)
}

export function glassContrastReportFor(
  data: Preset,
  pairs: readonly GlassPairSpec[],
): GlassContrastReport {
  const transparency = data.design?.transparency ?? 'auto'
  const configured = data.design?.glassOpacity ?? glassDesignDefaults.glassOpacity
  const opacity = transparency === 'reduced' ? 1 : configured
  const resolved = resolve(data, pairs)
  const nestedOpacity = nested(resolved, opacity)
  const results = resolved.map((r): GlassContrastPair => {
    const glass = filtered(r, opacity)
    const opaque = opaqueFallback(r)
    return {
      mode: r.mode,
      surface: r.surface,
      text: r.text,
      ...(r.tint ? { tint: r.tint } : {}),
      ...(r.declaredCoverage !== undefined ? { coverage: r.declaredCoverage } : {}),
      ratioOverBlack: glass.overDarkest,
      ratioOverWhite: glass.overBrightest,
      ratioOpaque: Math.min(opaque.overDarkest, opaque.overBrightest),
      passes: opaqueText(r) && glass.passes && opaque.passes,
    }
  })
  const lowest = (mode: 'light' | 'dark') => {
    const modePairs = resolved.filter((r) => r.mode === mode)
    if (nestedOpacity === null || !modePairs.every(opaqueText)) return null
    return (
      steps(glassMinimumOpacity).find((o) =>
        modePairs.every((r) => filtered(r, o).passes),
      ) ?? null
    )
  }
  const minimumOpacityByMode = { light: lowest('light'), dark: lowest('dark') }
  const minimumOpacity =
    minimumOpacityByMode.light === null || minimumOpacityByMode.dark === null
      ? null
      : Math.max(minimumOpacityByMode.light, minimumOpacityByMode.dark)
  return {
    opacity,
    transparency,
    backdrop: {
      light: glassBackdrop(data.design, 'light'),
      dark: glassBackdrop(data.design, 'dark'),
    },
    nestedOpacity,
    pairs: results,
    passes: results.every((p) => p.passes),
    minimumOpacity,
    minimumOpacityByMode,
  }
}
