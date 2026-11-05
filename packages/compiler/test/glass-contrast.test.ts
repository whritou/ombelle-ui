import { expect, it } from 'vitest'
import { getCatalog } from '@ombelle/catalog'
import type { Preset } from '@ombelle/contracts'
import { contrastRatio } from '../../../tests/helpers/contrast.js'
import {
  glassBackdrop,
  glassContrastPairs,
  glassContrastReport,
  glassContrastReportFor,
  type GlassPairSpec,
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
  // The card, popover and muted pairs at full coverage: the palette below sets only their colours.
  const pairs = glassContrastPairs.filter((p) => p.coverage === undefined && p.text !== 'destructive')
  const reportAt = (preset: Preset) => glassContrastReportFor(preset, pairs)
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
  for (let i = 25; i <= 100; i++)
    if (reportAt(at(i / 100)).passes) {
      x = i / 100
      break
    }
  const report = reportAt(at(0.8))
  expect(x).toBeGreaterThan(0.6)
  expect(x).not.toBeNull()
  expect(report.minimumOpacity).toBe(x)
  expect(reportAt(at(x!)).passes).toBe(true)
  expect(reportAt(at(x! - 0.01)).passes).toBe(false)
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
    { surface: 'card', text: 'cardForeground' },
    { surface: 'card', text: 'mutedForeground' },
    { surface: 'popover', text: 'popoverForeground' },
    { surface: 'popover', text: 'mutedForeground' },
    { surface: 'muted', text: 'foreground' },
    { surface: 'muted', text: 'mutedForeground' },
    { surface: 'secondary', text: 'secondaryForeground' },
    { surface: 'background', text: 'foreground' },
    { surface: 'card', text: 'foreground', tint: { color: 'primary', light: 0.18, dark: 0.22 } },
    { surface: 'card', text: 'foreground', tint: { color: 'primary', light: 0.26, dark: 0.3 } },
    { surface: 'card', text: 'foreground', tint: { color: 'destructive', light: 0.16, dark: 0.2 } },
    { surface: 'card', text: 'foreground', tint: { color: 'destructive', light: 0.24, dark: 0.28 } },
    { surface: 'card', text: 'foreground' },
    { surface: 'card', text: 'foreground', tint: { color: 'foreground', light: 0.06, dark: 0.06 } },
    { surface: 'background', text: 'foreground', coverage: 0.6 },
    { surface: 'background', text: 'foreground', tint: { color: 'foreground', light: 0.06, dark: 0.06 }, coverage: 0.6 },
    { surface: 'background', text: 'foreground', coverage: 0.55 },
    { surface: 'background', text: 'mutedForeground', coverage: 0.55 },
    { surface: 'card', text: 'destructive' },
  ])
})

const cardPair = (preset: Preset, mode: 'light' | 'dark' = 'light') =>
  glassContrastReport(preset).pairs.find(
    (p) => p.mode === mode && p.surface === 'card' && p.text === 'cardForeground',
  )!

it('surface alpha lowers the effective opacity', () => {
  const translucent = cardPair(
    withColors(
      { card: 'oklch(1 0 0 / 0.5)', cardForeground: '#000000' },
      { glassOpacity: 1 },
    ),
  )
  const equivalent = cardPair(
    withColors(
      { card: '#ffffff', cardForeground: '#000000' },
      { glassOpacity: 0.5 },
    ),
  )
  expect(translucent.ratioOverBlack).toBeCloseTo(equivalent.ratioOverBlack, 3)
  expect(translucent.ratioOverWhite).toBeCloseTo(equivalent.ratioOverWhite, 3)
  expect(translucent.ratioOverBlack).toBeLessThan(6) // opaque white on black text is 21:1
})

it('fails a pair whose text token is translucent', () => {
  const pair = cardPair(
    withColors(
      { card: '#ffffff', cardForeground: 'oklch(0 0 0 / 0.9)' },
      { glassOpacity: 1 },
    ),
  )
  expect(pair.ratioOverBlack).toBeGreaterThan(4.5)
  expect(pair.ratioOverWhite).toBeGreaterThan(4.5)
  expect(pair.passes).toBe(false)
})

it('fails text whose luminance lies between the two composites', () => {
  // A fully transparent black surface spans luminance 0..1; #767676 passes
  // 4.5:1 against both ends yet matches some backdrop in between.
  const pair = cardPair(
    withColors(
      { card: '#000000', cardForeground: '#767676' },
      { glassOpacity: 0 },
    ),
  )
  expect(pair.ratioOverBlack).toBeGreaterThanOrEqual(4.5)
  expect(pair.ratioOverWhite).toBeGreaterThanOrEqual(4.5)
  expect(pair.passes).toBe(false)
})

const glass = getCatalog('0.1.0').presets['liquid-glass'] as Preset

it('maps black and white through contrast() then brightness(), clamped', () => {
  const design = { ...glass.design, glassBackdropContrast: 0.45, glassBackdropTone: 0.4 }
  // contrast(0.45) maps v to 0.45v + 0.275; brightness is 1.4 light, 0.6 dark.
  const light = glassBackdrop(design, 'light')
  expect(light).toMatchObject({ contrast: 0.45, brightness: 1.4, high: 1 }) // 0.725 * 1.4 clamps
  expect(light.low).toBeCloseTo(0.385, 10)
  const dark = glassBackdrop(design, 'dark')
  expect(dark.brightness).toBe(0.6)
  expect(dark.low).toBeCloseTo(0.165, 10)
  expect(dark.high).toBeCloseTo(0.435, 10)
})

it('omitted filter fields keep the raw black and white bound', () => {
  for (const mode of ['light', 'dark'] as const)
    expect(glassBackdrop(flat.design, mode)).toMatchObject({
      contrast: 1,
      brightness: 1,
      sheen: 0,
      low: 0,
      high: 1,
    })
})

it('reduced transparency neutralizes the filter and sheen', () => {
  const report = glassContrastReport({
    ...glass,
    design: { ...glass.design, transparency: 'reduced' },
  })
  expect(report.opacity).toBe(1)
  expect(report.nestedOpacity).toEqual({ light: 1, dark: 1 })
  expect(report.backdrop.light).toMatchObject({ low: 0, high: 1, sheen: 0 })
})

it('built-in palettes reach the documented minimum opacities', () => {
  const report = glassContrastReport(glass)
  expect(report.passes).toBe(true)
  expect(report.minimumOpacityByMode).toEqual({ light: 0.57, dark: 0.4 })
  expect(report.minimumOpacity).toBe(0.57)
  // Nested glass sees a raw backdrop and needs more coverage.
  expect(report.nestedOpacity).toEqual({ light: 0.69, dark: 0.92 })
  // Without compression the same palette needs nearly opaque glass, or no opacity passes at all:
  // over raw black, the field placeholder at 55% coverage never reaches 4.5:1.
  const raw = glassContrastReport({
    ...glass,
    design: { ...glass.design, glassBackdropContrast: 1, glassBackdropTone: 0 },
  })
  expect(raw.minimumOpacity ?? 1).toBeGreaterThanOrEqual(0.7)
})

// Reference chain written from the Filter Effects 1 definitions. blur() only
// averages, so it is skipped; saturate() is the feColorMatrix saturate matrix;
// every primitive clamps to 0..1.
const clamp = (v: number) => Math.min(1, Math.max(0, v))
function filterPixel(
  [r, g, b]: readonly number[],
  { saturation: s, contrast: c, brightness: k }: ReturnType<typeof glassBackdrop>,
) {
  return [
    (0.213 + 0.787 * s) * r + (0.715 - 0.715 * s) * g + (0.072 - 0.072 * s) * b,
    (0.213 - 0.213 * s) * r + (0.715 + 0.285 * s) * g + (0.072 - 0.072 * s) * b,
    (0.213 - 0.213 * s) * r + (0.715 - 0.715 * s) * g + (0.072 + 0.928 * s) * b,
  ].map((v) => clamp(clamp(c * clamp(v) + 0.5 - 0.5 * c) * k))
}
const lum = (rgb: readonly number[]) =>
  rgb
    .map((c) => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4))
    .reduce((sum, c, i) => sum + c * [0.2126, 0.7152, 0.0722][i], 0)
const ratioOf = (a: number, b: number) =>
  (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05)
const unit = (h: string) => hex(h).map((v) => v / 255)

it('saturated backdrops never beat the grey extremes the bound uses', () => {
  // A fixed LCG keeps the sample reproducible.
  let seed = 12345
  const rand = () => (seed = (seed * 1103515245 + 12345) % 2 ** 31) / 2 ** 31
  const corners = [0, 1].flatMap((r) =>
    [0, 1].flatMap((g) => [0, 1].map((b) => [r, g, b])),
  )
  const samples = [
    ...corners,
    ...Array.from({ length: 1500 }, () => [rand(), rand(), rand()]),
  ]
  for (const glassSaturation of [1, 1.8, 2]) {
    const preset = { ...glass, design: { ...glass.design, glassSaturation } }
    const report = glassContrastReport(preset)
    expect(report.passes).toBe(true)
    for (const mode of ['light', 'dark'] as const) {
      const backdrop = glassBackdrop(preset.design, mode)
      const colors = preset.modes[mode] as Record<string, string>
      for (const { surface, text } of glassContrastPairs) {
        const pair = report.pairs.find(
          (p) => p.mode === mode && p.surface === surface && p.text === text,
        )!
        const floor = Math.min(pair.ratioOverBlack, pair.ratioOverWhite)
        const s = unit(colors[surface])
        const t = lum(unit(colors[text]))
        for (const pixel of samples) {
          const filtered = filterPixel(pixel, backdrop)
          for (const v of filtered) {
            expect(v).toBeGreaterThanOrEqual(backdrop.low - 1e-12)
            expect(v).toBeLessThanOrEqual(backdrop.high + 1e-12)
          }
          for (const sheen of [0, backdrop.sheen / 2, backdrop.sheen]) {
            const painted = s.map(
              (v, i) =>
                sheen +
                (1 - sheen) *
                  (report.opacity * v + (1 - report.opacity) * filtered[i]),
            )
            const actual = ratioOf(lum(painted), t)
            expect(actual).toBeGreaterThanOrEqual(floor - 1e-9)
            expect(actual).toBeGreaterThanOrEqual(4.5)
          }
        }
      }
    }
  }
})

it('nested opacity holds over any raw backdrop pixel', () => {
  const report = glassContrastReport(glass)
  for (const mode of ['light', 'dark'] as const) {
    const colors = glass.modes[mode] as Record<string, string>
    const opacity = report.nestedOpacity![mode]
    const { sheen } = report.backdrop[mode]
    for (const { surface, text } of glassContrastPairs) {
      const s = unit(colors[surface])
      const t = lum(unit(colors[text]))
      for (const b of [0, 0.25, 0.5, 0.75, 1])
        for (const sh of [0, sheen]) {
          const painted = s.map((v) => sh + (1 - sh) * (opacity * v + (1 - opacity) * b))
          expect(ratioOf(lum(painted), t)).toBeGreaterThanOrEqual(4.5)
        }
    }
  }
})

const tintedSpec: GlassPairSpec = {
  surface: 'card',
  text: 'foreground',
  tint: { color: 'primary', light: 0.18, dark: 0.22 },
}
const tintedReport = (preset: Preset) =>
  glassContrastReportFor(preset, [...glassContrastPairs, tintedSpec])
const tintedPair = (preset: Preset, mode: 'light' | 'dark') =>
  tintedReport(preset).pairs.find((p) => p.tint !== undefined && p.mode === mode)!

it('tinted pair mixes the tint into the surface before compositing', () => {
  const light = tintedPair(glass, 'light')
  expect(light.tint).toEqual({ color: 'primary', amount: 0.18 })
  expect(light.passes).toBe(true)
  expect(
    Math.min(light.ratioOverBlack, light.ratioOverWhite, light.ratioOpaque),
  ).toBeGreaterThan(6.3)
  const dark = tintedPair(glass, 'dark')
  expect(dark.tint).toEqual({ color: 'primary', amount: 0.22 })
  expect(
    Math.min(dark.ratioOverBlack, dark.ratioOverWhite, dark.ratioOpaque),
  ).toBeGreaterThan(5.0)
})

it('reduced transparency evaluates tinted surfaces opaque', () => {
  const preset = {
    ...glass,
    design: { ...glass.design, transparency: 'reduced' },
  } as Preset
  const pairs = tintedReport(preset).pairs.filter((p) => p.tint !== undefined)
  // The six tinted Button specs plus the extra one, in two modes.
  expect(pairs).toHaveLength(14)
  for (const p of pairs) {
    expect(p.passes).toBe(true)
    expect(Math.abs(p.ratioOverBlack - p.ratioOverWhite)).toBeLessThan(1e-6)
    expect(Math.abs(p.ratioOverBlack - p.ratioOpaque)).toBeLessThan(1e-6)
  }
})

it('coverage scales the glass share of a pair but not its opaque fallback', () => {
  const preset = withColors(
    { card: '#ffffff', cardForeground: '#000000' },
    { glassOpacity: 0.8 },
  )
  const full: GlassPairSpec = { surface: 'card', text: 'cardForeground' }
  const partial: GlassPairSpec = { ...full, coverage: 0.5 }
  const [covered] = glassContrastReportFor(preset, [partial]).pairs
  const [equivalent] = glassContrastReportFor(
    { ...preset, design: { ...preset.design, glassOpacity: 0.4 } },
    [full],
  ).pairs
  expect(covered.coverage).toBe(0.5)
  expect(covered.ratioOverBlack).toBeCloseTo(equivalent.ratioOverBlack, 10)
  expect(covered.ratioOverWhite).toBeCloseTo(equivalent.ratioOverWhite, 10)
  // The fallback paints the surface opaque, whatever its glass coverage.
  expect(covered.ratioOpaque).toBeCloseTo(21, 6)
  // An omitted coverage is full coverage, and the pair carries no coverage field.
  const [plain] = glassContrastReportFor(preset, [full]).pairs
  expect(plain).not.toHaveProperty('coverage')
  expect(glassContrastReportFor(preset, [{ ...full, coverage: 1 }]).pairs[0].ratioOverBlack).toBe(plain.ratioOverBlack)
})

it('coverage raises the minimum opacity but not the nested opacity', () => {
  const preset = withColors(
    { card: '#ffffff', cardForeground: '#000000' },
    { glassOpacity: 0.5 },
  )
  const full = glassContrastReportFor(preset, [{ surface: 'card', text: 'cardForeground' }])
  const half = glassContrastReportFor(preset, [{ surface: 'card', text: 'cardForeground', coverage: 0.5 }])
  // At half coverage, opacity o paints like opacity o / 2 at full coverage.
  expect(full.minimumOpacity).toBeLessThan(0.5)
  expect(Math.abs(half.minimumOpacity! - full.minimumOpacity! * 2)).toBeLessThanOrEqual(0.0100001)
  // Nested, a covered surface paints at the full nested opacity, as its CSS does.
  expect(half.nestedOpacity).toEqual(full.nestedOpacity)
})

it('reduced transparency evaluates covered surfaces opaque', () => {
  const preset = {
    ...glass,
    design: { ...glass.design, transparency: 'reduced' },
  } as Preset
  const report = glassContrastReportFor(preset, [
    { surface: 'background', text: 'mutedForeground', coverage: 0.55 },
  ])
  expect(report.passes).toBe(true)
  for (const p of report.pairs) {
    expect(Math.abs(p.ratioOverBlack - p.ratioOpaque)).toBeLessThan(1e-6)
    expect(Math.abs(p.ratioOverWhite - p.ratioOpaque)).toBeLessThan(1e-6)
  }
})
