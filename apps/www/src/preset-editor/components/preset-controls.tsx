import { CircleAlert, RotateCcw } from 'lucide-react'
import type { PresetEditorDraft, PresetEditablePath } from '../model'
import {
  colorKeys,
  designControls,
  glassDesignControls,
  presetFieldValue,
} from '../model'
import { browserColor } from '../contrast'
import {
  accentSchemes,
  baseSchemes,
  schemeMatches,
  type ColorScheme,
} from '../schemes'
export const fieldId = (path: string) => 'preset' + path.replaceAll('/', '-')
/** Popover that holds a colour token's light and dark fields. */
export const colorPanelId = (key: string) => 'preset-color-panel-' + key
const human = (key: string) =>
  key.replace(/[A-Z]/g, (c) => ' ' + c.toLowerCase())
const title = (key: string) => {
  const words = human(key)
  return words[0]!.toUpperCase() + words.slice(1)
}
const hex = (n: number) => n.toString(16).padStart(2, '0')
/** Native color pickers only take #rrggbb; OKLCH values are converted for display. */
function pickerValue(value: string) {
  if (/^#[0-9a-f]{6}$/i.test(value)) return value.toLowerCase()
  if (typeof CSS === 'undefined') return '#000000'
  const rgb = browserColor(value)
  return rgb ? '#' + rgb.slice(0, 3).map(hex).join('') : '#000000'
}
/** Opens the colour popover holding `path`, if any, and focuses its field. */
export function revealPresetField(path: string) {
  const color = /^\/modes\/(?:light|dark)\/(\w+)$/.exec(path)
  if (color) {
    const panel = document.getElementById(colorPanelId(color[1]!))
    // The token list lives in a collapsed disclosure; open it first.
    const disclosure = panel?.closest('details')
    if (disclosure && !disclosure.open) disclosure.open = true
    if (panel && !panel.matches(':popover-open')) panel.showPopover()
  }
  document.getElementById(fieldId(path))?.focus()
}
type ControlProps = {
  draft: PresetEditorDraft
  errorPath?: string
  onEdit: (path: PresetEditablePath, value: string) => void
  onReset: (path: PresetEditablePath) => void
}
function ResetButton({ draft, path, label, onReset }: Pick<ControlProps, 'draft' | 'onReset'> & { path: PresetEditablePath; label: string }) {
  return (
    <button
      type="button"
      className="preset-reset"
      aria-label={label}
      title={label}
      // Reset disables its own button, so keep keyboard focus on the field it restored.
      onClick={() => {
        onReset(path)
        document.getElementById(fieldId(path))?.focus()
      }}
      disabled={!Object.hasOwn(draft.edits, path)}
    >
      <RotateCcw aria-hidden="true" size={14} />
    </button>
  )
}
export function ColorControls({ draft, errorPath, onEdit, onReset }: ControlProps) {
  return (
    <ul className="preset-color-list" aria-label="Color tokens">
      {colorKeys.map((key) => {
        const light = presetFieldValue(draft, `/modes/light/${key}`),
          dark = presetFieldValue(draft, `/modes/dark/${key}`)
        const invalid = errorPath === `/modes/light/${key}` || errorPath === `/modes/dark/${key}`
        const edited = Object.hasOwn(draft.edits, `/modes/light/${key}`) || Object.hasOwn(draft.edits, `/modes/dark/${key}`)
        return (
          <li key={key}>
            <button
              type="button"
              className="preset-color-row"
              popoverTarget={colorPanelId(key)}
              aria-label={`${title(key)} colors: light ${light}, dark ${dark}${invalid ? ', invalid' : ''}`}
              data-invalid={invalid || undefined}
            >
              <span className="preset-color-name">
                {title(key)}
                {edited && <span className="preset-edited" title="Customized" />}
              </span>
              {invalid && <CircleAlert aria-hidden="true" size={14} className="preset-color-alert" />}
              <span className="preset-swatch" aria-hidden="true" style={{ backgroundColor: light }} />
              <span className="preset-swatch" aria-hidden="true" style={{ backgroundColor: dark }} />
            </button>
            <div id={colorPanelId(key)} popover="auto" className="preset-popover" aria-label={`${title(key)} colors`} role="dialog">
              <p className="preset-popover-title">{title(key)}</p>
              {(['light', 'dark'] as const).map((mode) => {
                const path: PresetEditablePath = `/modes/${mode}/${key}`,
                  value = mode === 'light' ? light : dark,
                  label = `${mode === 'light' ? 'Light' : 'Dark'} ${human(key)}`
                return (
                  <div className="preset-control" key={mode}>
                    <label htmlFor={fieldId(path)}>{label}</label>
                    <div className="preset-input-row">
                      <span className="preset-swatch preset-picker" style={{ backgroundColor: value }}>
                        <input
                          type="color"
                          tabIndex={-1}
                          aria-hidden="true"
                          value={pickerValue(value)}
                          onChange={(e) => onEdit(path, e.target.value)}
                        />
                      </span>
                      <input
                        id={fieldId(path)}
                        value={value}
                        maxLength={80}
                        spellCheck={false}
                        aria-invalid={errorPath === path || undefined}
                        aria-describedby={errorPath === path ? 'preset-error' : undefined}
                        onChange={(e) => onEdit(path, e.target.value)}
                      />
                      <ResetButton draft={draft} path={path} label={`Reset ${mode} ${human(key)}`} onReset={onReset} />
                    </div>
                  </div>
                )
              })}
              <p className="preset-popover-hint">Hex such as #1d4ed8, or OKLCH such as oklch(55% 0.2 260).</p>
            </div>
          </li>
        )
      })}
    </ul>
  )
}
export function DesignControls({ draft, errorPath, onEdit, onReset }: ControlProps) {
  // Transparency, blur and opacity exist only for liquid glass drafts.
  const designEntries: [
    string,
    (typeof designControls)[keyof typeof designControls] | (typeof glassDesignControls)[keyof typeof glassDesignControls],
  ][] = [
    ...Object.entries(designControls),
    ...(draft.family === 'liquid-glass' ? Object.entries(glassDesignControls) : []),
  ]
  return (
    <div className="preset-design-list">
      {designEntries.map(([key, control]) => {
        const path = `/design/${key}` as PresetEditablePath,
          value = presetFieldValue(draft, path)
        const props = {
          id: fieldId(path),
          value,
          'aria-invalid': errorPath === path || undefined,
          'aria-describedby':
            errorPath === path ? 'preset-error' : 'min' in control ? `${fieldId(path)}-hint` : undefined,
        }
        return (
          <div className="preset-design-row" key={key}>
            <label htmlFor={fieldId(path)}>{control.label}</label>
            <div className="preset-input-row">
              {'options' in control ? (
                <select {...props} onChange={(e) => onEdit(path, e.target.value)}>
                  {control.options.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
              ) : (
                <>
                  <input
                    type="range"
                    className="preset-slider"
                    aria-label={`${control.label} slider`}
                    min={control.min}
                    max={control.max}
                    step={'step' in control ? control.step : key === 'radiusRem' ? 0.05 : 1}
                    // A partially typed or invalid value leaves the thumb at the minimum.
                    value={Number.isFinite(Number(value)) && value !== '' ? Number(value) : control.min}
                    onChange={(e) => onEdit(path, e.target.value)}
                  />
                  <input {...props} className="preset-number" inputMode="decimal" maxLength={80} onChange={(e) => onEdit(path, e.target.value)} />
                </>
              )}
              <ResetButton draft={draft} path={path} label={`Reset ${control.label.toLowerCase()}`} onReset={onReset} />
            </div>
            {'min' in control && (
              <small id={`${fieldId(path)}-hint`}>
                {control.min} to {control.max}
                {'unit' in control ? control.unit : key === 'radiusRem' ? ' rem' : ' px'}
                {'step' in control && control.step < 1 ? `, in steps of ${control.step}` : ''}
              </small>
            )}
          </div>
        )
      })}
    </div>
  )
}
function touchesScheme(draft: PresetEditorDraft, schemes: readonly ColorScheme[]) {
  return schemes.some((scheme) =>
    (['light', 'dark'] as const).some((mode) =>
      Object.keys(scheme[mode]).some((key) =>
        Object.hasOwn(draft.edits, `/modes/${mode}/${key}`),
      ),
    ),
  )
}
/** One-click colour schemes; ColorControls keeps every token editable. */
export function ThemeControls({
  draft,
  onApply,
  onResetGroup,
}: {
  draft: PresetEditorDraft
  onApply: (scheme: ColorScheme, group: 'accent' | 'base') => void
  onResetGroup: (group: 'accent' | 'base') => void
}) {
  const groups = [
    { id: 'accent', label: 'Accent', schemes: accentSchemes },
    { id: 'base', label: 'Base', schemes: baseSchemes },
  ] as const
  return (
    <div className="preset-schemes">
      {groups.map((group) => {
        const active = group.schemes.find((scheme) => schemeMatches(draft, scheme))
        const untouched = !touchesScheme(draft, group.schemes)
        const current = active?.label ?? (untouched ? 'Style default' : 'Custom')
        return (
          <div
            key={group.id}
            role="group"
            aria-label={`${group.label} color`}
            className="preset-scheme-group"
          >
            <span className="preset-scheme-label" aria-hidden="true">
              {group.label}
              <span className="preset-scheme-current">{current}</span>
            </span>
            <div className="preset-scheme-options">
              <button
                type="button"
                className="preset-scheme"
                aria-pressed={!active && untouched}
                aria-label={`Style default ${group.label.toLowerCase()}`}
                title="Style default"
                onClick={() => onResetGroup(group.id)}
              >
                <span className="preset-scheme-dot preset-scheme-default" aria-hidden="true" />
              </button>
              {group.schemes.map((scheme) => (
                <button
                  key={scheme.id}
                  type="button"
                  className="preset-scheme"
                  aria-pressed={active?.id === scheme.id}
                  aria-label={`${scheme.label} ${group.label.toLowerCase()}`}
                  title={scheme.label}
                  onClick={() => onApply(scheme, group.id)}
                >
                  <span
                    className="preset-scheme-dot"
                    aria-hidden="true"
                    style={{ background: scheme.swatch }}
                  />
                </button>
              ))}
            </div>
          </div>
        )
      })}
    </div>
  )
}
