import { FoundationError, type Preset } from '@ombelle/contracts'
import { glassContrastReport } from './glass-contrast.js'

// Internal liquid-glass helpers shared by full-theme and scoped Button compiles.
export function assertGlassContrast(
  data: Parameters<typeof glassContrastReport>[0],
) {
  const report = glassContrastReport(data)
  const failing = report.pairs.find((pair) => !pair.passes)
  if (!failing) return
  const overBlack = failing.ratioOverBlack <= failing.ratioOverWhite
  const worst = overBlack ? failing.ratioOverBlack : failing.ratioOverWhite
  throw new FoundationError(
    'INVALID_DATA',
    'Liquid glass text contrast fails in ' +
      failing.mode +
      ' for ' +
      failing.text +
      ' on ' +
      failing.surface +
      ': ' +
      (Math.floor(worst * 100) / 100).toFixed(2) +
      ':1 over a ' +
      (overBlack ? 'black' : 'white') +
      ' backdrop. ' +
      (report.minimumOpacity === null
        ? 'Raise contrast between ' +
          failing.text +
          ' and ' +
          failing.surface +
          '; no glassOpacity passes.'
        : 'Minimum passing glassOpacity is ' + report.minimumOpacity + '.'),
    '/design/glassOpacity',
  )
}

export function glassTokens(design: Preset['design']): {
  light: Record<string, string>
  dark: Record<string, string>
} {
  const opaque = design.transparency === 'reduced'
  return {
    light: {
      '--glass-blur': opaque ? '0px' : (design.glassBlurPx ?? 12) + 'px',
      '--glass-opacity': opaque ? '1' : String(design.glassOpacity ?? 1),
      '--glass-highlight': 'color-mix(in srgb, white 35%, transparent)',
    },
    dark: {
      '--glass-highlight': 'color-mix(in srgb, white 12%, transparent)',
    },
  }
}
