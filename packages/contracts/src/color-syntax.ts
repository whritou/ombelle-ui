// Mirrors the parser in the Color Picker template; a catalog test keeps the two in agreement.
const number = String.raw`[+-]?(?:\d+(?:\.\d*)?|\.\d+)`
const hex = /^#(?:[0-9a-f]{3}|[0-9a-f]{6})$/i
const rgb = new RegExp(String.raw`^rgb\(\s*(${number})(?:\s*,\s*|\s+)(${number})(?:\s*,\s*|\s+)(${number})\s*\)$`, 'i')
const oklch = new RegExp(String.raw`^oklch\(\s*(${number})(%?)\s+(${number})\s+(${number})\s*\)$`, 'i')

/** True for #rgb, #rrggbb, rgb(r g b), rgb(r, g, b) and oklch(L C H) with L as 0–100% or 0–1. */
export function isParsableColor(text: string): boolean {
  const value = text.trim()
  if (hex.test(value)) return true
  const r = rgb.exec(value)
  if (r) {
    const separators = value.slice(4, -1).match(/,/g)?.length ?? 0
    return (separators === 0 || separators === 2) && [r[1], r[2], r[3]].every(c => Number(c) >= 0 && Number(c) <= 255)
  }
  const o = oklch.exec(value)
  if (o) {
    const l = Number(o[1]) / (o[2] ? 100 : 1)
    return l >= 0 && l <= 1 && Number(o[3]) >= 0
  }
  return false
}
