import { expect, it } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import type { GlassContrastReport } from '@ombelle/compiler'
import type { TokenContrast } from '../contrast'
import { PresetChecks, presetWarningCount } from './preset-checks'

const noop = () => {}
const pair = (
  mode: 'light' | 'dark',
  foreground: string,
  background: string,
  ratio: number | null,
): TokenContrast => ({
  mode,
  foreground,
  background,
  ratio,
  status: ratio === null ? 'not-evaluated' : ratio >= 4.5 ? 'pass' : 'warning',
})
const contrast = [
  pair('light', 'foreground', 'background', 12.3),
  pair('light', 'mutedForeground', 'muted', 3.21),
  pair('dark', 'foreground', 'background', 14),
  pair('dark', 'mutedForeground', 'muted', 6),
]
const failingGlass = { passes: false } as unknown as GlassContrastReport

it('PresetChecks shows pass counts, a warning card with its ratio and an edit button', () => {
  const html = renderToStaticMarkup(
    <PresetChecks contrast={contrast} glassReport={null} onEditToken={noop} />,
  )
  expect(html).toContain('1 / 2 pass')
  expect(html).toContain('2 / 2 pass')
  expect(html).toContain('Muted foreground on muted')
  expect(html).toContain('3.21:1')
  expect(html).toMatch(/<button[^>]*>Edit muted foreground token<\/button>/)
  // Passing pairs stay behind the Show toggle.
  expect(html).toContain('>Show<')
  expect(html).not.toContain('12.30:1')
  expect(html).toContain('4.5:1')
})

it('presetWarningCount adds one for a failing glass bound', () => {
  expect(presetWarningCount(contrast, null)).toBe(1)
  expect(presetWarningCount(contrast, failingGlass)).toBe(2)
  expect(presetWarningCount(contrast, { passes: true } as unknown as GlassContrastReport)).toBe(1)
  expect(presetWarningCount([], null)).toBe(0)
})

it('PresetChecks lists not-evaluated pairs separately from passing pairs', () => {
  const html = renderToStaticMarkup(
    <PresetChecks
      contrast={[
        pair('light', 'foreground', 'background', 12),
        pair('light', 'mutedForeground', 'muted', null),
        pair('dark', 'foreground', 'background', 14),
      ]}
      glassReport={null}
      onEditToken={noop}
    />,
  )
  expect(html).toContain('Not evaluated (1)')
  expect(html).toContain('Light muted foreground/muted: Not evaluated')
  expect(html).toContain('Passing pairs (2)')
  // Light has one pass of two pairs: the unevaluated pair is not counted as a pass.
  expect(html).toContain('1 / 2 pass')
})

it('PresetChecks renders a card for a failing glass bound', () => {
  const report = {
    passes: false,
    opacity: 0.4,
    minimumOpacity: 0.6,
    minimumOpacityByMode: { light: 0.6, dark: 0.6 },
    transparency: 'normal',
    pairs: [{ passes: false }, { passes: true }],
  } as unknown as GlassContrastReport
  const html = renderToStaticMarkup(
    <PresetChecks contrast={contrast} glassReport={report} onEditToken={noop} />,
  )
  expect(html).toContain('Liquid glass contrast bound')
  expect(html).toContain('Contrast bound fails at glass opacity 0.4')
  expect(html).toContain('1 pair is below 4.5:1')
  const passing = renderToStaticMarkup(
    <PresetChecks contrast={contrast} glassReport={{ ...report, passes: true } as GlassContrastReport} onEditToken={noop} />,
  )
  expect(passing).not.toContain('Liquid glass contrast bound')
})
