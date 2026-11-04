/** Resolves CSS colour strings to sRGB so parity checks ignore how a pipeline serialises a colour. */
export type Srgba = { rgb: [number, number, number]; alpha: number }
const clamp01 = (v: number) => Math.min(1, Math.max(0, v))
const encode = (v: number) => (v <= 0.0031308 ? 12.92 * v : 1.055 * v ** (1 / 2.4) - 0.055)
const toRgb = (lin: number[]): [number, number, number] =>
  lin.map((v) => clamp01(encode(clamp01(v))) * 255) as [number, number, number]
const num = (s: string, percentScale = 1) =>
  s === 'none' ? 0 : s.endsWith('%') ? (Number(s.slice(0, -1)) / 100) * percentScale : Number(s)
const alphaOf = (s: string | undefined) => (s === undefined ? 1 : clamp01(num(s)))
const args = (body: string) => {
  const [main, alpha] = body.split('/').map((s) => s.trim())
  return { parts: main.replace(/,/g, ' ').trim().split(/\s+/), alpha }
}

export function resolveColor(value: string): Srgba {
  const v = value.trim().toLowerCase()
  if (v === 'transparent') return { rgb: [0, 0, 0], alpha: 0 }
  const hex = /^#([0-9a-f]{3,8})$/.exec(v)
  if (hex) {
    const h = hex[1].length <= 4 ? [...hex[1]].map((c) => c + c).join('') : hex[1]
    const n = (i: number) => parseInt(h.slice(i, i + 2), 16)
    return { rgb: [n(0), n(2), n(4)], alpha: h.length === 8 ? n(6) / 255 : 1 }
  }
  const fn = /^([a-z-]+)\((.*)\)$/.exec(v)
  if (!fn) throw new Error('Unsupported colour: ' + value)
  const { parts, alpha } = args(fn[2])
  const a = alphaOf(alpha ?? (fn[1] === 'rgba' ? parts[3] : undefined))
  switch (fn[1]) {
    case 'rgb':
    case 'rgba':
      return { rgb: [0, 1, 2].map((i) => num(parts[i], 255)) as Srgba['rgb'], alpha: a }
    case 'oklch':
    case 'oklab': {
      const L = num(parts[0])
      let A: number, B: number
      if (fn[1] === 'oklch') {
        const C = num(parts[1], 0.4), h = (num(parts[2]) * Math.PI) / 180
        A = C * Math.cos(h); B = C * Math.sin(h)
      } else { A = num(parts[1], 0.4); B = num(parts[2], 0.4) }
      const l = (L + 0.3963377774 * A + 0.2158037573 * B) ** 3
      const m = (L - 0.1055613458 * A - 0.0638541728 * B) ** 3
      const s = (L - 0.0894841775 * A - 1.291485548 * B) ** 3
      return {
        rgb: toRgb([
          4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s,
          -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s,
          -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s,
        ]),
        alpha: a,
      }
    }
    case 'lab':
    case 'lch': {
      const L = num(parts[0], 100)
      let A: number, B: number
      if (fn[1] === 'lch') {
        const C = num(parts[1], 150), h = (num(parts[2]) * Math.PI) / 180
        A = C * Math.cos(h); B = C * Math.sin(h)
      } else { A = num(parts[1], 125); B = num(parts[2], 125) }
      const fy = (L + 16) / 116, fx = fy + A / 500, fz = fy - B / 200
      const f = (t: number) => (t ** 3 > 216 / 24389 ? t ** 3 : (116 * t - 16) / (24389 / 27))
      // D50 white point.
      const X = f(fx) * 0.3457 / 0.3585, Y = f(fy), Z = f(fz) * (1 - 0.3457 - 0.3585) / 0.3585
      // D50 XYZ -> D65 (Bradford) -> linear sRGB.
      const x = 0.9554734527042182 * X - 0.023098536874261423 * Y + 0.0632593086610217 * Z
      const y = -0.028369706963208136 * X + 1.0099954580058226 * Y + 0.021041398966943008 * Z
      const z = 0.012314001688319899 * X - 0.020507696433477912 * Y + 1.3303659366080753 * Z
      return {
        rgb: toRgb([
          3.2409699419045226 * x - 1.537383177570094 * y - 0.4986107602930034 * z,
          -0.9692436362808796 * x + 1.8759675015077202 * y + 0.04155505740717559 * z,
          0.05563007969699366 * x - 0.20397695888897652 * y + 1.0569715142428786 * z,
        ]),
        alpha: a,
      }
    }
    case 'color': {
      if (parts[0] === 'srgb')
        return { rgb: [1, 2, 3].map((i) => clamp01(num(parts[i])) * 255) as Srgba['rgb'], alpha: a }
      if (parts[0] === 'srgb-linear') return { rgb: toRgb([1, 2, 3].map((i) => num(parts[i]))), alpha: a }
      throw new Error('Unsupported colour space: ' + value)
    }
  }
  throw new Error('Unsupported colour: ' + value)
}

/** Equal when every sRGB channel is within `channel` (of 255) and alpha within `alpha`. */
export function colorsClose(a: string, b: string, channel = 1, alpha = 0.01): boolean {
  const x = resolveColor(a), y = resolveColor(b)
  return x.rgb.every((c, i) => Math.abs(c - y.rgb[i]) <= channel) && Math.abs(x.alpha - y.alpha) <= alpha
}

const colorToken = /#[0-9a-fA-F]{3,8}\b|\b(?:rgba?|oklch|oklab|lab|lch|color)\((?:[^()]|\([^()]*\))*\)/g
/** Splits a CSS value into a template with colour slots and the colours found in it. */
export function splitColors(value: string): { template: string; colors: string[] } {
  const colors: string[] = []
  const template = value.replace(colorToken, (m) => (colors.push(m), '<color>'))
  return { template, colors }
}

/**
 * Deep-compares two values. Strings are compared exactly except for the colours inside them,
 * which are compared as sRGB within tolerance. Returns the paths that differ.
 */
export function colorParityDiff(a: unknown, b: unknown, path = '$'): string[] {
  if (typeof a === 'string' && typeof b === 'string') {
    if (a === b) return []
    const x = splitColors(a), y = splitColors(b)
    if (x.template !== y.template || x.colors.length !== y.colors.length) return [`${path}: ${a} != ${b}`]
    return x.colors.flatMap((c, i) => {
      try {
        return colorsClose(c, y.colors[i]) ? [] : [`${path}: ${c} != ${y.colors[i]}`]
      } catch {
        return c === y.colors[i] ? [] : [`${path}: ${c} != ${y.colors[i]}`]
      }
    })
  }
  if (Array.isArray(a) && Array.isArray(b))
    return a.length !== b.length
      ? [`${path}: length ${a.length} != ${b.length}`]
      : a.flatMap((v, i) => colorParityDiff(v, b[i], `${path}[${i}]`))
  if (a && b && typeof a === 'object' && typeof b === 'object') {
    const ka = Object.keys(a), kb = Object.keys(b)
    if (ka.length !== kb.length || ka.some((k) => !(k in b))) return [`${path}: keys differ`]
    return ka.flatMap((k) => colorParityDiff((a as any)[k], (b as any)[k], `${path}.${k}`))
  }
  return Object.is(a, b) ? [] : [`${path}: ${String(a)} != ${String(b)}`]
}

/** Vitest/Playwright-friendly assertion: throws listing every difference. */
export function expectColorParity(actual: unknown, expected: unknown): void {
  const diff = colorParityDiff(actual, expected)
  if (diff.length) throw new Error('Parity differences (colours compared in sRGB):\n' + diff.slice(0, 20).join('\n'))
}
