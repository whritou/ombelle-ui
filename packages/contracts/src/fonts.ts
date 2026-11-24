import { FoundationError } from './diagnostics.js'
import { presetSchema } from './preset-schema.js'
/** The three built-in font stacks; every other font id comes from the catalog's font registry. */
export const systemFontIds = ['system-sans', 'system-serif', 'system-mono'] as const

export type PresetTypography = {
  fontFamilyId?: string
  headingFontFamilyId?: string
  monoFontFamilyId?: string
}

const system: readonly string[] = systemFontIds

/**
 * True when a preset's own design uses anything an older release cannot read:
 * a heading or mono font, or a body font outside the system ids.
 */
export function usesExtendedTypography(design: PresetTypography | undefined): boolean {
  if (!design) return false
  if (design.headingFontFamilyId !== undefined || design.monoFontFamilyId !== undefined)
    return true
  return design.fontFamilyId !== undefined && !system.includes(design.fontFamilyId)
}

/** The schema version a preset must declare: 1.1 only when it uses extended typography. */
export function presetSchemaVersion(design: PresetTypography | undefined): '1.0' | '1.1' {
  return usesExtendedTypography(design) ? '1.1' : '1.0'
}

export type FontRoleField = 'fontFamilyId' | 'headingFontFamilyId' | 'monoFontFamilyId'
const roleIds = (field: FontRoleField): readonly string[] =>
  (presetSchema.properties.design.properties[field] as { enum: readonly string[] }).enum
/**
 * Refuses a font id that the preset schema does not allow for that role (CMP-04, CMP-05). The preset schema's
 * per-role enums are the font registry; a test in the catalog keeps them in agreement.
 */
export function assertFontForRole(id: string, field: FontRoleField, path: string): void {
  if (!roleIds(field).includes(id))
    throw new FoundationError('INVALID_DATA',
      field === 'fontFamilyId' ? 'Unknown body font' : field === 'headingFontFamilyId' ? 'Unknown heading font' : 'Unknown mono font',
      path)
}
