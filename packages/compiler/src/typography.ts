import { FoundationError } from '@ombelle/contracts'
import { fontById, type FontEntry, type FontRole } from '@ombelle/catalog'

export type TypographyDesign = {
  fontFamilyId?: string
  headingFontFamilyId?: string
  monoFontFamilyId?: string
}
export type Typography = {
  /** Value of --font-family. */
  family: string
  /** Value of --font-heading; set only when the preset sets headingFontFamilyId. */
  heading?: string
  /** Value of --font-mono; set only when the preset sets monoFontFamilyId. */
  mono?: string
  /** CSS import lines for the registry fonts in use, deduplicated and sorted. */
  imports: readonly string[]
  /** Pinned Fontsource packages for the fonts in use, deduplicated and sorted by name. */
  dependencies: readonly { name: string; version: string }[]
}

const systemStacks: Record<string, string> = {
  'system-sans': "system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif",
  'system-serif': 'Georgia, serif',
  'system-mono': 'monospace',
}

/**
 * Title slots that take the heading font. Control labels (checkbox option and
 * group titles) and the code block's file title are left out on purpose.
 */
export const headingSlots: readonly string[] = [
  'alert-dialog-title',
  'alert-title',
  'card-title',
  'command-dialog-title',
  'dialog-title',
  'empty-title',
  'form-error-summary-title',
  'item-title',
  'popover-title',
  'sheet-title',
  'stepper-title',
  'toast-title',
]
/**
 * Slots that show code but do not already read --font-mono in the catalog
 * styles (code block, number input, color picker and others do).
 */
export const monoSlots: readonly string[] = ['input-otp-slot', 'kbd', 'kbd-group']

function pick(
  id: string | undefined,
  fallback: string,
  role: FontRole,
  path: string,
  used: Map<string, FontEntry>,
): string {
  const chosen = id ?? fallback
  const system = systemStacks[chosen]
  if (system) return system
  const font = fontById(chosen)
  if (!font)
    throw new FoundationError('INVALID_DATA', `Unknown font ${chosen}`, path)
  if (!font.roles.includes(role))
    throw new FoundationError(
      'INVALID_DATA',
      `${font.label} cannot be used as a ${role} font`,
      path,
    )
  used.set(font.id, font)
  return font.stack
}

export function resolveTypography(design: TypographyDesign): Typography {
  const used = new Map<string, FontEntry>()
  const family = pick(design.fontFamilyId, 'system-sans', 'body', '/design/fontFamilyId', used)
  const heading =
    design.headingFontFamilyId === undefined
      ? undefined
      : pick(design.headingFontFamilyId, '', 'display', '/design/headingFontFamilyId', used)
  const mono =
    design.monoFontFamilyId === undefined
      ? undefined
      : pick(design.monoFontFamilyId, '', 'mono', '/design/monoFontFamilyId', used)
  const imports = [
    ...new Set(
      [...used.values()].flatMap((font) =>
        font.fontsource.imports.map((specifier) => `@import '${specifier}';`),
      ),
    ),
  ].sort()
  const packages = new Map<string, string>()
  for (const font of used.values())
    packages.set(font.fontsource.package, font.fontsource.version)
  return {
    family,
    ...(heading === undefined ? {} : { heading }),
    ...(mono === undefined ? {} : { mono }),
    imports,
    dependencies: [...packages]
      .sort(([a], [b]) => (a < b ? -1 : 1))
      .map(([name, version]) => ({ name, version })),
  }
}

/** Rules that apply the heading and mono fonts; empty unless the preset sets one of them. */
export function fontRuleBlock(typography: Typography): string {
  const rule = (slot: string, token: string) =>
    `[data-slot="${slot}"]{font-family:var(${token})}`
  return [
    ...(typography.heading === undefined ? [] : headingSlots.map((s) => rule(s, '--font-heading'))),
    ...(typography.mono === undefined ? [] : monoSlots.map((s) => rule(s, '--font-mono'))),
  ].join('')
}
