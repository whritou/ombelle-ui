import { describe, expect, it } from 'vitest'
import { glassHaloSelector } from '../src/glass-recipes.js'
import {
  applyGlassPointer,
  clearGlassPointer,
  glassRimMapPixels,
  glassSurfaceFor,
  haloSelector,
} from '../src/templates/liquid-glass-filter.js'

// A minimal element: the helpers only use these members.
const fakeSurface = (rect = { left: 0, top: 0, width: 200, height: 100 }) => {
  const style = new Map<string, string>()
  const attrs = new Set<string>()
  return {
    style: {
      setProperty: (k: string, v: string) => void style.set(k, v),
      removeProperty: (k: string) => void style.delete(k),
    },
    setAttribute: (k: string) => void attrs.add(k),
    removeAttribute: (k: string) => void attrs.delete(k),
    getBoundingClientRect: () => rect,
    style_: style,
    attrs,
  }
}

describe('LiquidGlassFilter rim map', () => {
  const at = (pixels: Uint8ClampedArray, x: number, y: number) => pixels.slice((y * 192 + x) * 4, (y * 192 + x) * 4 + 4)
  it('is neutral inside and displaced at the rim', () => {
    const pixels = glassRimMapPixels(192, 23, 0.13)
    expect([...at(pixels, 96, 96)].slice(0, 2)).toEqual([128, 128])
    expect(at(pixels, 0, 96)[0]).toBeGreaterThan(200)
    expect(at(pixels, 191, 96)[0]).toBeLessThan(56)
  })
  it('is neutral everywhere at width 0', () => {
    const pixels = glassRimMapPixels(192, 23, 0)
    for (let i = 0; i < pixels.length; i += 4) expect([pixels[i], pixels[i + 1]]).toEqual([128, 128])
  })
})

describe('LiquidGlassFilter pointer', () => {
  it('lights the halo surfaces the catalog declares', () => {
    expect(haloSelector).toBe(glassHaloSelector)
  })
  it('tracks the pointer on a glass surface and clears it', () => {
    const el = fakeSurface()
    applyGlassPointer(el, 50, 25, false)
    expect(el.style_.get('--pointer-x')).toBe('25%')
    expect(el.style_.get('--pointer-y')).toBe('25%')
    expect(el.attrs.has('data-halo-active')).toBe(true)
    clearGlassPointer(el)
    expect(el.style_.size).toBe(0)
    expect(el.attrs.size).toBe(0)
  })
  it('writes no pointer position under reduced motion', () => {
    const el = fakeSurface()
    applyGlassPointer(el, 50, 25, true)
    expect(el.style_.size).toBe(0)
    expect(el.attrs.has('data-halo-active')).toBe(true)
  })
  it('finds no surface for targets outside glass or without closest()', () => {
    expect(glassSurfaceFor(null)).toBe(null)
    expect(glassSurfaceFor({} as EventTarget)).toBe(null)
    expect(glassSurfaceFor({ closest: () => null } as unknown as EventTarget)).toBe(null)
  })
  it('clearing a surface that has gone does not throw', () => {
    expect(() => clearGlassPointer(null)).not.toThrow()
  })
})
