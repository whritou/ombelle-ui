import { fontRuleBlock, resolveTypography } from '@ombelle/compiler'
import { presetFontIds } from './font-loaders'

export { fontLoaders, loadPresetFonts, presetFontIds, recipeFontIds } from './font-loaders'

/**
 * Audit pages only: the styles that put `<body>,<heading>,<mono>` (registry ids, empty for unset)
 * on every specimen, and the fonts to load for them. Recipe CSS pins its own --font-family, so
 * the override is !important, and slots match by suffix because recipe slots carry a prefix.
 * Rules use the compiler's own specificity and are rendered after specimen styles.
 */
export function auditFontStyles(list: string): { css: string; ids: string[] } {
  const [body, heading, mono] = list.split(',').map((id) => id.trim() || undefined)
  const design = { fontFamilyId: body, headingFontFamilyId: heading, monoFontFamilyId: mono }
  const typography = resolveTypography(design)
  const declarations = [
    `--font-family:${typography.family} !important`,
    ...(typography.heading ? [`--font-heading:${typography.heading} !important`] : []),
    ...(typography.mono ? [`--font-mono:${typography.mono} !important`] : []),
  ].join(';')
  const rules = fontRuleBlock(typography).replaceAll('[data-slot="', '[data-slot$="')
  return { css: `:root,[data-ombelle-recipe]{${declarations}}` + rules, ids: presetFontIds(design) }
}
