import type { RecipeColorRole } from '@ombelle/contracts'

/** The computed colours the preview reports for each part, keyed like the CSS properties. */
export type ColorDimension = 'backgroundColor' | 'color' | 'borderColor'
export const colorDimensions: readonly ColorDimension[] = ['backgroundColor', 'color', 'borderColor']
export const colorDimensionFor: Record<RecipeColorRole, ColorDimension> = {
  background: 'backgroundColor', foreground: 'color', border: 'borderColor',
}

/** A measured colour as the preview sends it: uppercase hex, with alpha when not opaque. */
export const measuredColorPattern = /^#[0-9A-F]{6}([0-9A-F]{2})?$/

const channel = (value: number) => Math.round(Math.min(255, Math.max(0, value))).toString(16).padStart(2, '0').toUpperCase()

/**
 * A computed colour in hex. Browsers serialise sRGB colours as rgb(), rgba() or
 * color(srgb …); any other syntax returns null and the preview reads it from a canvas.
 */
export function hexFromComputedColor(value: string): string | null {
  const text = value.trim()
  let red: number, green: number, blue: number, alpha = 1
  const rgb = /^rgba?\(\s*([\d.]+)[,\s]+([\d.]+)[,\s]+([\d.]+)(?:\s*[,/]\s*([\d.]+%?))?\s*\)$/i.exec(text)
  const srgb = /^color\(\s*srgb\s+([\d.]+)\s+([\d.]+)\s+([\d.]+)(?:\s*\/\s*([\d.]+%?))?\s*\)$/i.exec(text)
  if (rgb) [red, green, blue] = [Number(rgb[1]), Number(rgb[2]), Number(rgb[3])]
  else if (srgb) [red, green, blue] = [Number(srgb[1]) * 255, Number(srgb[2]) * 255, Number(srgb[3]) * 255]
  else return null
  const rawAlpha = (rgb ?? srgb)![4]
  if (rawAlpha !== undefined) alpha = rawAlpha.endsWith('%') ? Number(rawAlpha.slice(0, -1)) / 100 : Number(rawAlpha)
  const hex = '#' + channel(red) + channel(green) + channel(blue)
  return alpha >= 1 ? hex : hex + channel(alpha * 255)
}

/**
 * The placeholder of a colour field: what the preview renders, when the field edits the mode
 * the preview shows and a value was measured; the inherited label otherwise.
 */
export function colorPlaceholder(measured: string | undefined, fieldMode: 'light' | 'dark', previewMode: 'light' | 'dark', fallback: string): string {
  return measured && fieldMode === previewMode ? measured : fallback
}
