import type { Preset } from '@ombelle/contracts'
export type TokenContrast = { mode: 'light' | 'dark'; foreground: string; background: string; ratio: number | null; status: 'pass' | 'warning' | 'not-evaluated' }
export function contrastRatio(foreground: readonly [number, number, number], background: readonly [number, number, number]): number {
  const luminance = (rgb: readonly number[]) => {
    if (rgb.length !== 3 || rgb.some((c) => !Number.isFinite(c) || c < 0 || c > 255)) throw new Error('Expected opaque sRGB channels in 0..255')
    const linear = rgb.map((c) => { const s = c / 255; return s <= 0.04045 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4 })
    return linear[0] * 0.2126 + linear[1] * 0.7152 + linear[2] * 0.0722
  }
  const a = luminance(foreground), b = luminance(background)
  return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05)
}
const pairs = [['foreground', 'background'], ['cardForeground', 'card'], ['popoverForeground', 'popover'], ['primaryForeground', 'primary'], ['secondaryForeground', 'secondary'], ['mutedForeground', 'muted'], ['accentForeground', 'accent'], ['destructiveForeground', 'destructive']] as const
export function measurePresetContrast(preset: Preset, convert: (color: string) => readonly [number, number, number, number] | null): TokenContrast[] {
  return (['light', 'dark'] as const).flatMap((mode) => pairs.map(([foreground, background]) => {
    let ratio: number | null = null
    try {
      const f = convert(preset.modes[mode][foreground]!), b = convert(preset.modes[mode][background]!)
      if (f?.[3] === 1 && b?.[3] === 1) ratio = contrastRatio([f[0], f[1], f[2]], [b[0], b[1], b[2]])
    } catch { /* An unsupported conversion is never counted as a pass. */ }
    return { mode, foreground, background, ratio, status: ratio === null ? 'not-evaluated' as const : ratio >= 4.5 ? 'pass' as const : 'warning' as const }
  }))
}
export function browserColor(color: string): readonly [number, number, number, number] | null {
  if (!CSS.supports('color', color)) return null
  const context = document.createElement('canvas').getContext('2d', { willReadFrequently: true })
  if (!context) return null
  context.clearRect(0, 0, 1, 1); context.fillStyle = color; context.fillRect(0, 0, 1, 1)
  const [r, g, b, a] = context.getImageData(0, 0, 1, 1).data
  return [r, g, b, a / 255]
}
