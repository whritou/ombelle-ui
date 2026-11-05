import { FoundationError, type Preset } from '@ombelle/contracts'
import {
  glassBackdrop,
  glassContrastReport,
  glassDesignDefaults,
  glassTints,
} from './glass-contrast.js'

// Internal liquid-glass helpers shared by full-theme and scoped Button compiles.
export function assertGlassContrast(
  data: Parameters<typeof glassContrastReport>[0],
) {
  const report = glassContrastReport(data)
  const failing = report.pairs.find((pair) => !pair.passes)
  if (!failing) return
  const [worst, where] = [
    [failing.ratioOverBlack, 'over the darkest filtered backdrop'],
    [failing.ratioOverWhite, 'over the brightest filtered backdrop'],
    [failing.ratioOpaque, 'on the opaque fallback surface'],
  ].sort((a, b) => (a[0] as number) - (b[0] as number))[0] as [number, string]
  throw new FoundationError(
    'INVALID_DATA',
    'Liquid glass text contrast fails in ' +
      failing.mode +
      ' for ' +
      failing.text +
      ' on ' +
      failing.surface +
      (failing.tint
        ? ' tinted ' + failing.tint.color + ' ' + Math.round(failing.tint.amount * 100) + '%'
        : '') +
      (failing.coverage === undefined
        ? ''
        : ' at ' + Math.round(failing.coverage * 100) + '% coverage') +
      ': ' +
      (Math.floor(worst * 100) / 100).toFixed(2) +
      ':1 ' +
      where +
      '. ' +
      (report.minimumOpacity === null
        ? 'Raise contrast between ' +
          failing.text +
          ' and ' +
          failing.surface +
          '; no glassOpacity passes.'
        : 'Minimum passing glassOpacity is ' + report.minimumOpacity + '.') +
      // A 0.4.x init saved the whole built-in preset, which fails the pairs 0.5.0 adds.
      ' See "Upgrading from 0.4.x" in docs/components/liquid-glass.md.',
    '/design/glassOpacity',
  )
}

export function glassTokens(data: Preset): {
  light: Record<string, string>
  dark: Record<string, string>
} {
  const design = data.design
  const d = { ...glassDesignDefaults, ...design }
  const opaque = design.transparency === 'reduced'
  // Nested glass gets the coverage that holds over a raw backdrop. A preset
  // without one fails assertGlassContrast before tokens are written.
  const nested = glassContrastReport(data).nestedOpacity ?? { light: 1, dark: 1 }
  const mode = (m: 'light' | 'dark') => {
    const backdrop = glassBackdrop(design, m)
    return {
      '--glass-brightness': String(backdrop.brightness),
      '--glass-sheen': String(backdrop.sheen),
      '--glass-nested-opacity': String(nested[m]),
      '--glass-primary-tint': Math.round(glassTints.primary[m] * 100) + '%',
      '--glass-destructive-tint': Math.round(glassTints.destructive[m] * 100) + '%',
    }
  }
  return {
    light: {
      '--glass-blur': opaque ? '0px' : d.glassBlurPx + 'px',
      '--glass-opacity': opaque ? '1' : String(d.glassOpacity),
      '--glass-saturation': opaque ? '1' : String(d.glassSaturation),
      '--glass-contrast': opaque ? '1' : String(d.glassBackdropContrast),
      '--glass-highlight': 'color-mix(in srgb, white ' + Math.round(d.glassRim * 100) + '%, transparent)',
      // Reduced transparency is evaluated opaque, so it is painted opaque: every covered surface reads
      // --glass-inner-opacity before its coverage fallback and every filter reads --glass-inner-filter.
      // Nested glass re-points them to --glass-nested-opacity, which is 1 here. The Skeleton film, a
      // tint over nothing, gets the card behind it from --glass-film-backing.
      ...(opaque
        ? {
            '--glass-inner-opacity': '1',
            '--glass-inner-filter': 'none',
            '--glass-film-backing': '1',
          }
        : {}),
      ...materialTokens(design, opaque),
      ...mode('light'),
    },
    dark: {
      '--glass-highlight': 'color-mix(in srgb, white ' + Math.round(d.glassRim * 34) + '%, transparent)',
      ...mode('dark'),
    },
  }
}

const round4 = (value: number) => String(Math.round(value * 10000) / 10000)

// Material settings are optional; a token is written only when its field is set, so presets
// written before them keep byte-identical tokens. Reduced transparency turns off the effects
// that need a live backdrop (halo, refraction, dispersion) and keeps depth and motion.
function materialTokens(design: Preset['design'], opaque: boolean): Record<string, string> {
  const tokens: Record<string, string> = {}
  const set = (name: string, value: number | undefined, off = false) => {
    if (value !== undefined) tokens[name] = off ? '0' : round4(value)
  }
  set('--glass-refraction-strength', design.glassRefraction === undefined ? undefined : design.glassRefraction / 6.9, opaque)
  set('--glass-refraction-width', design.glassRefractionWidth)
  set('--glass-halo', design.glassHalo, opaque)
  set('--glass-depth', design.glassDepth)
  set('--glass-motion', design.glassMotion)
  set('--glass-dispersion', design.glassDispersion, opaque)
  const contrast = design.glassBackdropContrast
  const drop = contrast === undefined ? 0 : Math.max(0, (contrast - 1) * 0.545)
  if (drop > 0) tokens['--glass-drop'] = round4(drop)
  return tokens
}
