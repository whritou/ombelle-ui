import { describe, expect, it } from 'vitest'
import { offeredGlassPresetOrder, getCatalogPresets } from '@ombelle/catalog/presets'
import { styleFamilies } from '@ombelle/contracts'
import { designValues, exampleCode, familyMeta, glassVars, paletteVars, tweakVars, type LandingPalette } from './landing-theme'

const palette: LandingPalette = {
  name: 'Sample',
  light: ['#fff', '#111', '#fafafa', '#c00', '#fff', '#eee', '#222', '#ddd', '#555', '#333'],
  dark: ['#000', '#eee', '#111', '#f66', '#000', '#222', '#ddd', '#333', '#aaa', '#ccc'],
}

describe('familyMeta', () => {
  it('describes every style family with the design values of its built-in preset', () => {
    const { presets } = getCatalogPresets('0.1.0')
    for (const family of styleFamilies) {
      const { design } = presets[family]
      expect(familyMeta[family].design, family).toEqual({
        radiusPx: (design.radiusRem ?? 0) * 16,
        borderPx: design.borderWidthPx,
        shadowXPx: design.shadowOffsetXPx,
        shadowYPx: design.shadowOffsetYPx,
      })
    }
  })
})

describe('paletteVars', () => {
  it('sets nothing for the style default', () => {
    expect(paletteVars('ombelle', undefined, false)).toEqual({})
  })

  it('reads the dark colours in dark mode', () => {
    expect(paletteVars('ombelle', palette, false)['--bg']).toBe('#fff')
    expect(paletteVars('ombelle', palette, true)['--bg']).toBe('#000')
  })

  it('keeps accent text readable where the primary is a fill colour', () => {
    expect(paletteVars('minimalist', palette, false)['--at']).toBe('#111')
    expect(paletteVars('neo-brutalism', palette, false)['--at']).toBe('#111')
    expect(paletteVars('neo-brutalism', palette, true)['--at']).toBe('#f66')
    expect(paletteVars('papier', palette, false)['--at']).toBe('#c00')
  })

  it('uses a palette border as a divider only in the families without ink borders', () => {
    expect(paletteVars('flat', palette, false)).toMatchObject({ '--cbd': '#333', '--div': '1px solid #333' })
    expect(paletteVars('flat', palette, false)['--bd']).toBeUndefined()
    expect(paletteVars('papier', palette, false)['--bd']).toBe('#333')
  })
})

describe('glassVars', () => {
  it('turns a starting preset into blur and veil opacity', () => {
    expect(glassVars({ name: 'Cristal', blurPx: 9, opacity: 0.4 }, false)).toEqual({ '--cbf': 'blur(9px) saturate(1.6)', '--card': 'rgb(255 255 255 / 0.4)' })
    expect(glassVars({ name: 'Cristal', blurPx: 9, opacity: 0.4 }, true)['--card']).toBe('rgb(30 41 59 / 0.4)')
    expect(glassVars(undefined, false)).toEqual({})
  })

  it('has blur and opacity for every offered starting preset', () => {
    const { startingPresets } = getCatalogPresets('0.1.0')
    for (const id of offeredGlassPresetOrder) {
      expect(startingPresets[id].design.glassBlurPx, id).toBeTypeOf('number')
      expect(startingPresets[id].design.glassOpacity, id).toBeTypeOf('number')
    }
  })
})

describe('tweakVars and designValues', () => {
  it('sets only the group a slider owns', () => {
    expect(tweakVars({})).toEqual({})
    expect(Object.keys(tweakVars({ radiusPx: 6 })).every((key) => key.startsWith('--r'))).toBe(true)
    expect(tweakVars({ shadowPx: 0 })['--bsh']).toBe('none')
    expect(tweakVars({ shadowPx: 3 })['--bsh']).toBe('3px 3px 0 var(--shc)')
  })

  it('reports the preset values, falling back to the family defaults', () => {
    const design = familyMeta.papier.design
    expect(designValues(design, {})).toMatchObject({ radiusRem: 0.125, borderWidthPx: 1, shadowOffsetXPx: 0, shadowOffsetYPx: 2, shadowPx: 2 })
    expect(designValues(design, { radiusPx: 8, shadowPx: 4 })).toMatchObject({ radiusRem: 0.5, shadowOffsetXPx: 4, shadowOffsetYPx: 4 })
  })
})

describe('exampleCode', () => {
  it('has the published shape, is stable for one design and differs between designs', () => {
    expect(exampleCode('ombelle|0|12|1.5|3|3')).toMatch(/^ps_[0-9a-f]{32}@1$/)
    expect(exampleCode('ombelle|0|12|1.5|3|3')).toBe(exampleCode('ombelle|0|12|1.5|3|3'))
    expect(exampleCode('ombelle|0|12|1.5|3|3')).not.toBe(exampleCode('ombelle|0|13|1.5|3|3'))
  })
})
