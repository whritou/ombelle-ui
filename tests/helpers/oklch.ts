/** Parses '#rrggbb' or 'oklch(L C H[ / A])' to opaque-or-alpha sRGB (0..255 channels). */
export type Rgba = { rgb: [number, number, number]; alpha: number }
const clamp01 = (v: number) => Math.min(1, Math.max(0, v))
const encode = (v: number) => (v <= 0.0031308 ? 12.92 * v : 1.055 * v ** (1 / 2.4) - 0.055)
export function parseColor(value: string): Rgba {
  if (/^#[0-9a-f]{6}$/i.test(value))
    return { rgb: [1, 3, 5].map((i) => parseInt(value.slice(i, i + 2), 16)) as Rgba['rgb'], alpha: 1 }
  const m = /^oklch\(([^\s/)]+) ([^\s/)]+) ([^\s/)]+)(?: \/ ([^\s)]+))?\)$/.exec(value)
  if (!m) throw new Error('Unsupported colour: ' + value)
  const num = (s: string) => (s.endsWith('%') ? Number(s.slice(0, -1)) / 100 : Number(s))
  const L = num(m[1]), C = Number(m[2]), h = (Number(m[3]) * Math.PI) / 180
  const a = C * Math.cos(h), b = C * Math.sin(h)
  const l = (L + 0.3963377774 * a + 0.2158037573 * b) ** 3
  const mm = (L - 0.1055613458 * a - 0.0638541728 * b) ** 3
  const s = (L - 0.0894841775 * a - 1.291485548 * b) ** 3
  const lin = [
    4.0767416621 * l - 3.3077115913 * mm + 0.2309699292 * s,
    -1.2684380046 * l + 2.6097574011 * mm - 0.3413193965 * s,
    -0.0041960863 * l - 0.7034186147 * mm + 1.707614701 * s,
  ]
  return {
    rgb: lin.map((v) => Math.round(clamp01(encode(clamp01(v))) * 255)) as Rgba['rgb'],
    alpha: m[4] === undefined ? 1 : clamp01(num(m[4])),
  }
}
/** Opaque sRGB of `value` composited over an opaque `backdrop` colour string. */
export function compositeOver(value: string, backdrop: string): [number, number, number] {
  const top = parseColor(value), bottom = parseColor(backdrop)
  return top.rgb.map((c, i) => Math.round(c * top.alpha + bottom.rgb[i] * (1 - top.alpha))) as [number, number, number]
}
