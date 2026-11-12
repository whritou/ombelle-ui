'use client'
import * as React from 'react'
import { cn } from './utils.js'
import './color-picker.css'

// color-math:start
/** sRGB channels from 0 to 255, unrounded. */
export type Rgb = { r: number; g: number; b: number }
/** Hue 0–360, saturation and value 0–100. */
export type Hsv = { h: number; s: number; v: number }
/** Lightness 0–1, chroma 0 and up, hue 0–360. */
export type Oklch = { l: number; c: number; h: number }
export type ColorFormat = 'oklch' | 'hex' | 'rgb'

const numberPattern = String.raw`[+-]?(?:\d+(?:\.\d*)?|\.\d+)`
const hexPattern = /^#(?:[0-9a-f]{3}|[0-9a-f]{6})$/i
const rgbPattern = new RegExp(String.raw`^rgb\(\s*(${numberPattern})(?:\s*,\s*|\s+)(${numberPattern})(?:\s*,\s*|\s+)(${numberPattern})\s*\)$`, 'i')
const oklchPattern = new RegExp(String.raw`^oklch\(\s*(${numberPattern})(%?)\s+(${numberPattern})\s+(${numberPattern})\s*\)$`, 'i')

const toLinear = (channel: number) => {
  const c = channel / 255
  return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4
}
const fromLinear = (c: number) => 255 * (c <= 0.0031308 ? 12.92 * c : 1.055 * Math.sign(c) * Math.abs(c) ** (1 / 2.4) - 0.055)
const wrapHue = (h: number) => ((h % 360) + 360) % 360

export function rgbToOklch({ r, g, b }: Rgb): Oklch {
  const [lr, lg, lb] = [toLinear(r), toLinear(g), toLinear(b)]
  const l = Math.cbrt(0.4122214708 * lr + 0.5363325363 * lg + 0.0514459929 * lb)
  const m = Math.cbrt(0.2119034982 * lr + 0.6806995451 * lg + 0.1073969566 * lb)
  const s = Math.cbrt(0.0883024619 * lr + 0.2817188376 * lg + 0.6299787005 * lb)
  const L = 0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s
  const A = 1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s
  const B = 0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s
  const c = Math.hypot(A, B)
  return { l: L, c, h: c < 1e-4 ? 0 : wrapHue((Math.atan2(B, A) * 180) / Math.PI) }
}

function oklchToLinear({ l, c, h }: Oklch): [number, number, number] {
  const A = c * Math.cos((h * Math.PI) / 180), B = c * Math.sin((h * Math.PI) / 180)
  const l3 = (l + 0.3963377774 * A + 0.2158037573 * B) ** 3
  const m3 = (l - 0.1055613458 * A - 0.0638541728 * B) ** 3
  const s3 = (l - 0.0894841775 * A - 1.291485548 * B) ** 3
  return [
    4.0767416621 * l3 - 3.3077115913 * m3 + 0.2309699292 * s3,
    -1.2684380046 * l3 + 2.6097574011 * m3 - 0.3413193965 * s3,
    -0.0041960863 * l3 - 0.7034186147 * m3 + 1.707614701 * s3,
  ]
}
const inside = (channels: number[]) => channels.every(c => c >= -1e-6 && c <= 1 + 1e-6)

/** The sRGB colour of an OKLCH value; outside sRGB, chroma is reduced at the same lightness and hue. */
export function oklchToRgb(color: Oklch): { rgb: Rgb; inGamut: boolean } {
  const l = Math.min(1, Math.max(0, color.l))
  let linear = oklchToLinear({ ...color, l })
  const inGamut = inside(linear) && l === color.l
  if (!inside(linear)) {
    let low = 0, high = color.c
    for (let i = 0; i < 24; i++) {
      const mid = (low + high) / 2
      if (inside(oklchToLinear({ l, c: mid, h: color.h }))) low = mid
      else high = mid
    }
    linear = oklchToLinear({ l, c: low, h: color.h })
  }
  const [r, g, b] = linear.map(c => Math.min(255, Math.max(0, fromLinear(c))))
  return { rgb: { r: r!, g: g!, b: b! }, inGamut }
}

export function rgbToHsv({ r, g, b }: Rgb): Hsv {
  const max = Math.max(r, g, b), min = Math.min(r, g, b), d = max - min
  let h = 0
  if (d > 0) {
    if (max === r) h = ((g - b) / d) % 6
    else if (max === g) h = (b - r) / d + 2
    else h = (r - g) / d + 4
  }
  return { h: wrapHue(h * 60), s: max === 0 ? 0 : (d / max) * 100, v: (max / 255) * 100 }
}

export function hsvToRgb({ h, s, v }: Hsv): Rgb {
  const value = (v / 100) * 255, chroma = value * (s / 100)
  const f = (n: number) => {
    const k = (n + wrapHue(h) / 60) % 6
    return value - chroma * Math.max(0, Math.min(k, 4 - k, 1))
  }
  return { r: f(5), g: f(3), b: f(1) }
}

/** Reads #rgb, #rrggbb, rgb(r g b), rgb(r, g, b) and oklch(L C H) with L as 0–100% or 0–1; anything else is null. */
export function parseColor(text: string): { rgb: Rgb; oklch: Oklch; inGamut: boolean } | null {
  const value = text.trim()
  if (hexPattern.test(value)) {
    const digits = value.length === 4 ? [...value.slice(1)].map(d => d + d).join('') : value.slice(1)
    const rgb = { r: parseInt(digits.slice(0, 2), 16), g: parseInt(digits.slice(2, 4), 16), b: parseInt(digits.slice(4, 6), 16) }
    return { rgb, oklch: rgbToOklch(rgb), inGamut: true }
  }
  const r = rgbPattern.exec(value)
  if (r) {
    const commas = value.slice(4, -1).match(/,/g)?.length ?? 0
    const channels = [r[1], r[2], r[3]].map(Number)
    if ((commas !== 0 && commas !== 2) || channels.some(c => c < 0 || c > 255)) return null
    const rgb = { r: channels[0]!, g: channels[1]!, b: channels[2]! }
    return { rgb, oklch: rgbToOklch(rgb), inGamut: true }
  }
  const o = oklchPattern.exec(value)
  if (o) {
    const oklch = { l: Number(o[1]) / (o[2] ? 100 : 1), c: Number(o[3]), h: wrapHue(Number(o[4])) }
    if (oklch.l < 0 || oklch.l > 1 || oklch.c < 0) return null
    return { ...oklchToRgb(oklch), oklch }
  }
  return null
}

const trim = (n: number, digits: number) => String(Number(n.toFixed(digits)) || 0)

/** Hex as lowercase #rrggbb, RGB as rgb(r g b), OKLCH with L and C to 3 decimals and H to 1. */
export function formatColor(rgb: Rgb, format: ColorFormat): string {
  const [r, g, b] = [rgb.r, rgb.g, rgb.b].map(c => Math.round(Math.min(255, Math.max(0, c))))
  if (format === 'hex') return '#' + [r, g, b].map(c => c!.toString(16).padStart(2, '0')).join('')
  if (format === 'rgb') return `rgb(${r} ${g} ${b})`
  const { l, c, h } = rgbToOklch(rgb)
  const chroma = trim(c, 3)
  return `oklch(${trim(l, 3)} ${chroma} ${chroma === '0' ? '0' : trim(wrapHue(Number(h.toFixed(1))), 1)})`
}

const luminance = ({ r, g, b }: Rgb) => 0.2126 * toLinear(r) + 0.7152 * toLinear(g) + 0.0722 * toLinear(b)

/** The WCAG 2 contrast ratio of two colours, from 1 to 21. */
export function contrastRatio(a: Rgb, b: Rgb): number {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x)
  return Math.round(((hi! + 0.05) / (lo! + 0.05)) * 1000) / 1000
}

export function contrastLevel(ratio: number): 'AAA' | 'AA' | 'AA large' | 'Fails' {
  return ratio >= 7 ? 'AAA' : ratio >= 4.5 ? 'AA' : ratio >= 3 ? 'AA large' : 'Fails'
}

/** The picker state for a value; a colour without hue (grey, black, white) keeps previousHue. */
export function colorStateFromValue(value: string, previousHue: number): { hsv: Hsv; rgb: Rgb } | null {
  const parsed = parseColor(value)
  if (!parsed) return null
  const hsv = rgbToHsv(parsed.rgb)
  if (hsv.s < 0.01 || hsv.v < 0.01) hsv.h = previousHue
  return { hsv, rgb: parsed.rgb }
}
// color-math:end

/** Scaffold: replaced by the Color Picker in the next commit. */
export function ColorPicker({ className, ...props }: React.ComponentProps<'div'>) {
  return <div {...props} data-slot="color-picker" className={cn(className)} />
}
