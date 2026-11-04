import { useState } from 'react'
import { CircleAlert, RotateCcw } from 'lucide-react'
import { styleFamilies, type StyleFamily } from '@ombelle/contracts'
import { ControlRow, SegmentedControl, SliderRow } from '../../editor-shell'
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
export const tokenToggleId = 'preset-token-toggle'
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
    // Tokens that are neither edited nor warned sit behind "Show all"; expand first.
    if (!document.getElementById(colorPanelId(color[1]!)))
      document.getElementById(tokenToggleId)?.click()
    const panel = document.getElementById(colorPanelId(color[1]!))
    if (panel && !panel.matches(':popover-open')) panel.showPopover()
  }
  // Numeric rows focus the exact value field, not the slider.
  const field =
    document.getElementById(fieldId(path) + '-number') ??
    document.getElementById(fieldId(path))
  // Identity fields live in a closed dialog; open it so they can take focus.
  const dialog = field?.closest('dialog')
  if (dialog && !dialog.open) dialog.showModal()
  field?.focus()
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
export const familyNames: Record<StyleFamily, string> = {
  flat: 'Flat',
  minimalist: 'Minimalist',
  'neo-brutalism': 'Neo-brutalism',
  'liquid-glass': 'Liquid glass',
}
/** One pressed button per style family, each with a small sample of its look. */
export function FamilyPicker({
  value,
  onChange,
}: {
  value: StyleFamily
  onChange(family: StyleFamily): void
}) {
  return (
    <div role="group" aria-label="Style family" className="preset-families">
      {styleFamilies.map((family) => (
        <button
          key={family}
          type="button"
          className="preset-family"
          data-family={family}
          aria-pressed={family === value}
          onClick={() => onChange(family)}
        >
          <span className="preset-family-sample" aria-hidden="true">
            <i />
            <i />
          </span>
          <span className="preset-family-name">{familyNames[family]}</span>
          {family === 'liquid-glass' && <span className="preset-family-tag">Beta</span>}
        </button>
      ))}
    </div>
  )
}
const baseTokens: readonly string[] = ['background', 'foreground', 'primary', 'mutedForeground', 'border']
/** The five core tokens plus anything edited or warned; "Show all" reveals the rest. */
export function TokenList({
  draft,
  errorPath,
  onEdit,
  onReset,
  warnings,
}: ControlProps & { warnings: ReadonlySet<string> }) {
  const [all, setAll] = useState(false)
  const isEdited = (key: string) =>
    Object.hasOwn(draft.edits, `/modes/light/${key}`) || Object.hasOwn(draft.edits, `/modes/dark/${key}`)
  const visible = colorKeys.filter(
    (key) => all || baseTokens.includes(key) || isEdited(key) || warnings.has(key),
  )
  return (
    <>
      <ul className="preset-color-list" aria-label="Color tokens">
        {visible.map((key) => {
          const light = presetFieldValue(draft, `/modes/light/${key}`),
            dark = presetFieldValue(draft, `/modes/dark/${key}`)
          const invalid = errorPath === `/modes/light/${key}` || errorPath === `/modes/dark/${key}`
          const edited = isEdited(key)
          const warned = warnings.has(key)
          return (
            <li key={key}>
              <button
                type="button"
                className="preset-color-row"
                popoverTarget={colorPanelId(key)}
                aria-label={`${title(key)} colors: light ${light}, dark ${dark}${invalid ? ', invalid' : ''}${warned ? ', contrast warning' : ''}`}
                data-invalid={invalid || undefined}
                data-warning={warned || undefined}
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
      <button
        type="button"
        id={tokenToggleId}
        className="preset-token-toggle"
        aria-expanded={all}
        onClick={() => setAll((open) => !open)}
      >
        {all ? 'Show fewer tokens' : `Show all ${colorKeys.length} tokens`}
      </button>
    </>
  )
}
const optionLabels: Record<string, string> = {
  'system-sans': 'Sans',
  'system-serif': 'Serif',
  'system-mono': 'Mono',
  comfortable: 'Comfortable',
  compact: 'Compact',
  full: 'Full',
  reduced: 'Reduced',
  auto: 'Auto',
}
const shapeKeys: readonly string[] = ['fontFamilyId', 'radiusRem', 'density', 'borderWidthPx']
/**
 * Design values. `section` splits them for the inspector: "shape" is type, corners,
 * density and borders; "depth" is shadow, motion and the glass material. Omit it for all.
 */
export function DesignControls({
  draft,
  errorPath,
  onEdit,
  onReset,
  section,
}: ControlProps & { section?: 'shape' | 'depth' }) {
  // Transparency and the glass material settings exist only for liquid glass drafts.
  const designEntries: [
    string,
    (typeof designControls)[keyof typeof designControls] | (typeof glassDesignControls)[keyof typeof glassDesignControls],
  ][] = [
    ...Object.entries(designControls),
    ...(draft.family === 'liquid-glass' ? Object.entries(glassDesignControls) : []),
  ]
  const shown = designEntries.filter(
    ([key]) => !section || (section === 'shape') === shapeKeys.includes(key),
  )
  const shadowField = (key: 'shadowOffsetXPx' | 'shadowOffsetYPx', axis: 'X' | 'Y') => {
    const path = `/design/${key}` as PresetEditablePath
    return (
      <div className="preset-shadow-field">
        <label htmlFor={fieldId(path)}>
          <span className="preset-sr">Shadow </span>
          {axis}
          <span className="preset-sr"> offset</span>
        </label>
        <input
          id={fieldId(path)}
          inputMode="decimal"
          maxLength={80}
          spellCheck={false}
          value={presetFieldValue(draft, path)}
          aria-invalid={errorPath === path || undefined}
          aria-describedby={errorPath === path ? 'preset-error' : undefined}
          onChange={(e) => onEdit(path, e.target.value)}
        />
        <ResetButton
          draft={draft}
          path={path}
          label={`Reset shadow ${axis.toLowerCase()} offset`}
          onReset={onReset}
        />
      </div>
    )
  }
  return (
    <div className="preset-design-list">
      {shown.map(([key, control]) => {
        const path = `/design/${key}` as PresetEditablePath,
          value = presetFieldValue(draft, path)
        const edited = Object.hasOwn(draft.edits, path)
        if (key === 'shadowOffsetYPx') return null
        if (key === 'shadowOffsetXPx')
          return (
            <div key={key} role="group" aria-label="Shadow offset" className="preset-shadow-row">
              {shadowField('shadowOffsetXPx', 'X')}
              {shadowField('shadowOffsetYPx', 'Y')}
            </div>
          )
        if ('options' in control)
          return (
            <div key={key} className="preset-choice">
              <ControlRow label={control.label} edited={edited}>
              <div className="preset-segmented-field" id={fieldId(path)} tabIndex={-1}>
                <SegmentedControl
                  label={control.label}
                  value={value}
                  options={control.options.map((option) => ({
                    value: option,
                    label: optionLabels[option] ?? option,
                  }))}
                  onChange={(next) => onEdit(path, next)}
                />
                <ResetButton draft={draft} path={path} label={`Reset ${control.label.toLowerCase()}`} onReset={onReset} />
              </div>
              </ControlRow>
            </div>
          )
        const hintId = `${fieldId(path)}-hint`
        return (
          <div key={key}>
            <SliderRow
              id={fieldId(path)}
              label={control.label}
              value={value}
              min={control.min}
              max={control.max}
              step={'step' in control ? control.step : key === 'radiusRem' ? 0.05 : 1}
              unit={'unit' in control ? control.unit.trim() : key === 'radiusRem' ? 'rem' : 'px'}
              edited={edited}
              invalid={errorPath === path}
              describedBy={errorPath === path ? 'preset-error' : hintId}
              onChange={(next) => onEdit(path, next)}
              onReset={() => {
                onReset(path)
                document.getElementById(fieldId(path))?.focus()
              }}
            />
            <small id={hintId} hidden>
              {control.min} to {control.max}
              {'unit' in control ? control.unit : key === 'radiusRem' ? ' rem' : ' px'}
              {'step' in control && control.step < 1 ? `, in steps of ${control.step}` : ''}
            </small>
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
/** One-click colour schemes; TokenList keeps every token editable. */
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
