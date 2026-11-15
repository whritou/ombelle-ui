import { fontControlOptions, fontLabel } from '../../preset-editor/model'

export type FontRoleKey = keyof typeof fontControlOptions

const labels: Record<FontRoleKey, string> = { fontFamilyId: 'Body font', headingFontFamilyId: 'Display font', monoFontFamilyId: 'Code font' }

/**
 * A font picker for one role. The body font is always set; the display and code fonts offer
 * "Default", which leaves the role to the style's system font.
 */
export function FontSelect({ role, value, onChange }: { role: FontRoleKey; value: string | undefined; onChange(id: string | undefined): void }) {
  const label = labels[role]
  return <label className="be-stack">{label}
    <select aria-label={label} value={value ?? ''} onChange={event => onChange(event.target.value || undefined)}>
      {role !== 'fontFamilyId' && <option value="">Default</option>}
      {fontControlOptions[role].map(id => <option key={id} value={id}>{fontLabel(id)}</option>)}
    </select>
  </label>
}
