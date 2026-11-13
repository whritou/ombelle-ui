import { describe, expect, it } from 'vitest'
import * as math from '../src/templates/color-picker.js'
import { isParsableColor } from '../../contracts/src/color-syntax.js'

const hexes = ['#000000', '#ffffff', '#1d4ed8', '#ff0000', '#00ff00', '#0000ff', '#808080', '#123456', '#abcdef', '#fedcba',
  '#c0ffee', '#bada55', '#7f7f7f', '#010203', '#fefefe', '#e11d48', '#16a34a', '#f59e0b', '#0ea5e9', '#6d28d9']

describe('colour maths', () => {
  it.each(hexes)('writes %s back unchanged after parsing', hex => {
    const parsed = math.parseColor(hex)!
    expect(math.formatColor(parsed.rgb, 'hex')).toBe(hex)
    expect(math.formatColor(math.hsvToRgb(math.rgbToHsv(parsed.rgb)), 'hex')).toBe(hex)
  })

  it.each([[0.55, 0.22, 6], [0.7, 0.18, 6], [0.62, 0.12, 75], [0.55, 0.15, 250], [0.55, 0.13, 150], [0.5, 0.1, 300], [0.8, 0.05, 200]])(
    'keeps oklch(%s %s %s) within the last written digit', (l, c, h) => {
      const { rgb, inGamut } = math.oklchToRgb({ l, c, h })
      expect(inGamut).toBe(true)
      const back = math.rgbToOklch(rgb)
      expect(Math.abs(back.l - l)).toBeLessThanOrEqual(0.001)
      expect(Math.abs(back.c - c)).toBeLessThanOrEqual(0.001)
      expect(Math.abs(back.h - h)).toBeLessThanOrEqual(0.1)
    })

  it('parses every accepted form and nothing else', () => {
    for (const text of ['#1d4ed8', '#ABC', 'rgb(29 78 216)', 'rgb(29, 78, 216)', 'oklch(55% 0.22 6)', 'oklch(0.55 0.22 6)', '  oklch(0.7 0.18 6) '])
      expect(math.parseColor(text), text).not.toBeNull()
    for (const text of ['red', '#12345', 'rgb(1 2)', 'rgb(1, 2 3)', 'rgb(256 0 0)', 'hsl(0 0% 0%)', 'oklch(1 2)', 'oklch(120% 0.1 3)', 'transparent', ''])
      expect(math.parseColor(text), text).toBeNull()
    expect(math.parseColor('#abc')!.rgb).toEqual({ r: 170, g: 187, b: 204 })
    expect(math.parseColor('oklch(55% 0.22 6)')!.oklch).toEqual({ l: 0.55, c: 0.22, h: 6 })
  })

  it('agrees with the contracts parser', () => {
    for (const text of ['#1d4ed8', '#abc', '#ABCDEF', 'rgb(29 78 216)', 'rgb(29, 78, 216)', 'oklch(55% 0.22 6)', 'oklch(0.55 0.22 6)', 'oklch(0.97 0.004 350 / 14%)', 'oklch(0.5 0.1 20 / 0.4)',
      'red', '#12345', 'rgb(1 2)', 'rgb(300 0 0)', 'rgb(1, 2 3)', 'hsl(0 0% 0%)', 'oklch(1 2)', 'oklch(140% 0.1 20)', '', 'oklch(0.7 0.4 150)'])
      expect(math.parseColor(text) !== null, text).toBe(isParsableColor(text))
  })

  it('writes each format', () => {
    const rgb = { r: 29, g: 78, b: 216 }
    expect(math.formatColor(rgb, 'hex')).toBe('#1d4ed8')
    expect(math.formatColor(rgb, 'rgb')).toBe('rgb(29 78 216)')
    expect(math.formatColor(math.parseColor('oklch(0.55 0.22 6)')!.rgb, 'oklch')).toBe('oklch(0.55 0.22 6)')
    expect(math.formatColor(math.parseColor('oklch(0.7 0.18 6)')!.rgb, 'oklch')).toBe('oklch(0.7 0.18 6)')
    expect(math.formatColor({ r: 255, g: 255, b: 255 }, 'oklch')).toBe('oklch(1 0 0)')
    expect(math.formatColor({ r: 0, g: 0, b: 0 }, 'oklch')).toBe('oklch(0 0 0)')
  })

  it('measures WCAG 2 contrast and names its level', () => {
    const black = { r: 0, g: 0, b: 0 }, white = { r: 255, g: 255, b: 255 }
    expect(math.contrastRatio(black, white)).toBe(21)
    expect(math.contrastRatio(white, black)).toBe(21)
    const primary = math.parseColor('oklch(0.55 0.22 6)')!.rgb, foreground = math.parseColor('oklch(0.99 0 0)')!.rgb
    // The board prints 5.1:1; WCAG 2 luminance of these two colours gives 5.3 (the site's contrast.ts agrees).
    expect(math.contrastRatio(primary, foreground).toFixed(1)).toBe('5.3')
    expect([7, 6.99, 4.5, 4.49, 3, 2.99].map(math.contrastLevel)).toEqual(['AAA', 'AA', 'AA', 'AA large', 'AA large', 'Fails'])
  })

  it('flags an oklch value outside sRGB and clips it to a nearby in-gamut colour', () => {
    const parsed = math.parseColor('oklch(0.7 0.4 150)')!
    expect(parsed.inGamut).toBe(false)
    expect(parsed.oklch).toEqual({ l: 0.7, c: 0.4, h: 150 })
    for (const channel of Object.values(parsed.rgb)) expect(channel).toBeGreaterThanOrEqual(0), expect(channel).toBeLessThanOrEqual(255)
    const clipped = math.rgbToOklch(parsed.rgb)
    expect(Math.abs(clipped.h - 150)).toBeLessThan(2)
    expect(Math.abs(clipped.l - 0.7)).toBeLessThan(0.01)
  })

  it('keeps the previous hue when the colour has none', () => {
    expect(math.colorStateFromValue('#000000', 214)!.hsv.h).toBe(214)
    expect(math.colorStateFromValue('#ffffff', 37)!.hsv.h).toBe(37)
    expect(math.colorStateFromValue('#808080', 120)!.hsv.h).toBe(120)
    expect(Math.round(math.colorStateFromValue('#ff0000', 214)!.hsv.h)).toBe(0)
    expect(math.colorStateFromValue('nope', 10)).toBeNull()
  })

  it('maps HSV corners', () => {
    expect(math.hsvToRgb({ h: 0, s: 100, v: 100 })).toEqual({ r: 255, g: 0, b: 0 })
    expect(math.hsvToRgb({ h: 240, s: 100, v: 50 })).toEqual({ r: 0, g: 0, b: 127.5 })
    expect(math.rgbToHsv({ r: 0, g: 255, b: 0 })).toEqual({ h: 120, s: 100, v: 100 })
  })
})

describe('alpha, kept but not edited', () => {
  it('reads an OKLCH or RGB alpha and writes it back in every format but hex', () => {
    expect(math.parseColor('oklch(0.97 0.004 350 / 14%)')!.alpha).toBeCloseTo(0.14)
    expect(math.parseColor('oklch(0.97 0.004 350 / 0.5)')!.alpha).toBe(0.5)
    expect(math.parseColor('rgb(29 78 216 / 50%)')!.alpha).toBe(0.5)
    expect(math.parseColor('#1d4ed8')!.alpha).toBe(1)
    expect(math.parseColor('oklch(0.5 0.1 20 / 140%)')).toBeNull()
    const rgb = { r: 29, g: 78, b: 216 }
    expect(math.formatColor(rgb, 'oklch', 0.14)).toBe('oklch(0.488 0.217 264.4 / 14%)')
    expect(math.formatColor(rgb, 'rgb', 0.5)).toBe('rgb(29 78 216 / 50%)')
    expect(math.formatColor(rgb, 'oklch', 1)).toBe('oklch(0.488 0.217 264.4)')
  })
})

describe('contrast level and its printed ratio agree', () => {
  it('judges the level on the unrounded ratio and never prints a ratio above the level it reaches', () => {
    expect(math.contrastLevel(4.4996)).toBe('AA large')
    expect(math.formatRatio(4.46)).toBe('4.4')
    expect(math.formatRatio(21)).toBe('21.0')
  })
})
