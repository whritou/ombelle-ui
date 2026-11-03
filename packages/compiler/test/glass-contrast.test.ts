import { expect, it } from 'vitest'
import { getCatalog } from '@ombelle/catalog'
import type { Preset } from '@ombelle/contracts'
import { contrastRatio } from '../../../tests/helpers/contrast.js'
import {
  glassContrastPairs,
  glassContrastReport,
  relativeLuminance,
} from '../src/glass-contrast.js'

const flat = getCatalog('0.1.0').presets.flat as Preset

function withColors(
  colors: Record<string, string>,
  design: Record<string, unknown> = {},
  modes: readonly ('light' | 'dark')[] = ['light', 'dark'],
): Preset {
  const base = structuredClone(flat) as Preset
  for (const mode of modes) Object.assign(base.modes[mode], colors)
  base.design = { ...base.design, transparency: 'auto', ...design } as Preset['design']
  return base
}

const hex = (h: string) =>
  [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16)) as [
    number,
    number,
    number,
  ]

it('hand-computed pair: white surface over black at 0.8', () => {
  const preset = withColors(
    { card: '#ffffff', cardForeground: '#475569' },
    { glassOpacity: 0.8 },
  )
  const report = glassContrastReport(preset)
  const pair = report.pairs.find(
    (p) =>
      p.mode === 'light' && p.surface === 'card' && p.text === 'cardForeground',
  )!
  expect(pair.ratioOverBlack).toBeCloseTo(
    contrastRatio(hex('#cccccc'), hex('#475569')),
    2,
  )
  expect(pair.ratioOverWhite).toBeCloseTo(
    contrastRatio(hex('#ffffff'), hex('#475569')),
    2,
  )
})

it('threshold: minimumOpacity passes and one step below fails', () => {
  const at = (o: number) =>
    withColors(
      {
        card: '#e8eef5',
        cardForeground: '#5b6676',
        popover: '#e8eef5',
        popoverForeground: '#5b6676',
        mutedForeground: '#5b6676',
      },
      { glassOpacity: o },
      ['light'],
    )
  let x: number | null = null
  for (let i = 60; i <= 100; i++)
    if (glassContrastReport(at(i / 100)).passes) {
      x = i / 100
      break
    }
  const report = glassContrastReport(at(0.8))
  expect(x).toBeGreaterThan(0.6)
  expect(x).not.toBeNull()
  expect(report.minimumOpacity).toBe(x)
  expect(glassContrastReport(at(x!)).passes).toBe(true)
  if (x! > 0.6) expect(glassContrastReport(at(x! - 0.01)).passes).toBe(false)
})

it('returns null minimumOpacity when even opacity 1 fails', () => {
  const report = glassContrastReport(
    withColors({ card: '#808080', cardForeground: '#888888' }),
  )
  expect(report.minimumOpacity).toBeNull()
  expect(report.passes).toBe(false)
})

it('reduced transparency evaluates at opacity 1 and passes for flat', () => {
  const report = glassContrastReport(
    withColors({}, { transparency: 'reduced', glassOpacity: 0.6 }),
  )
  expect(glassContrastReport(flat).passes).toBe(true)
  expect(report.opacity).toBe(1)
  expect(report.transparency).toBe('reduced')
  expect(report.passes).toBe(true)
  expect(new Set(report.pairs.map((p) => p.mode))).toEqual(
    new Set(['light', 'dark']),
  )
})

it('oklch inputs behave like hex', () => {
  expect(
    Math.abs(relativeLuminance('oklch(1 0 0)') - relativeLuminance('#ffffff')),
  ).toBeLessThan(1e-6)
  expect(Math.abs(relativeLuminance('oklch(0 0 0)'))).toBeLessThan(1e-6)
})

it('pair list equals the spec table', () => {
  expect(glassContrastPairs).toEqual([
    ['card', 'cardForeground'],
    ['card', 'mutedForeground'],
    ['popover', 'popoverForeground'],
    ['popover', 'mutedForeground'],
    ['muted', 'foreground'],
    ['muted', 'mutedForeground'],
    ['secondary', 'secondaryForeground'],
    ['background', 'foreground'],
  ])
})
