import { RotateCcw } from 'lucide-react'
import type { PresetEditorDraft, PresetEditablePath } from '../model'
import { colorKeys, designControls, presetFieldValue } from '../model'
import { browserColor } from '../contrast'
export const fieldId = (path: string) => 'preset' + path.replaceAll('/', '-')
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
export function PresetControls({
  draft,
  errorPath,
  onEdit,
  onReset,
}: {
  draft: PresetEditorDraft
  errorPath?: string
  onEdit: (path: PresetEditablePath, value: string) => void
  onReset: (path: PresetEditablePath) => void
}) {
  // Reset disables its own button, so keep keyboard focus on the field it restored.
  function reset(path: PresetEditablePath) {
    onReset(path)
    document.getElementById(fieldId(path))?.focus()
  }
  const resetButton = (path: PresetEditablePath, label: string) => (
    <button
      type="button"
      className="preset-reset"
      aria-label={label}
      title={label}
      onClick={() => reset(path)}
      disabled={!Object.hasOwn(draft.edits, path)}
    >
      <RotateCcw aria-hidden="true" size={14} />
    </button>
  )
  return (
    <>
      <section className="preset-card" aria-labelledby="preset-colors-heading">
        <div className="preset-card-head">
          <h3 id="preset-colors-heading">Colors</h3>
          <p>Hex or OKLCH. Every token has a light and a dark value.</p>
        </div>
        <div className="preset-color-table">
          <div className="preset-color-columns" aria-hidden="true">
            <span>Token</span>
            <span>Light</span>
            <span>Dark</span>
          </div>
          {colorKeys.map((key) => (
            <div className="preset-color-row" key={key}>
              <span className="preset-color-name" aria-hidden="true">
                {title(key)}
              </span>
              {(['light', 'dark'] as const).map((mode) => {
                const path: PresetEditablePath = `/modes/${mode}/${key}`,
                  value = presetFieldValue(draft, path),
                  label = `${mode === 'light' ? 'Light' : 'Dark'} ${human(key)}`
                return (
                  <div className="preset-color-field" key={mode}>
                    <label htmlFor={fieldId(path)}>{label}</label>
                    <div className="preset-input-row">
                      <span
                        className="preset-swatch"
                        style={{ backgroundColor: value }}
                      >
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
                        aria-describedby={
                          errorPath === path ? 'preset-error' : undefined
                        }
                        onChange={(e) => onEdit(path, e.target.value)}
                      />
                      {resetButton(path, `Reset ${mode} ${human(key)}`)}
                    </div>
                  </div>
                )
              })}
            </div>
          ))}
        </div>
      </section>
      <section className="preset-card" aria-labelledby="preset-design-heading">
        <div className="preset-card-head">
          <h3 id="preset-design-heading">Design tokens</h3>
          <p>Shape, spacing, depth and motion shared by every component.</p>
        </div>
        <div className="preset-control-grid">
          {Object.entries(designControls).map(([key, control]) => {
            const path = `/design/${key}` as PresetEditablePath,
              value = presetFieldValue(draft, path)
            const props = {
              id: fieldId(path),
              value,
              'aria-invalid': errorPath === path || undefined,
              'aria-describedby':
                errorPath === path ? 'preset-error' : undefined,
            }
            return (
              <div className="preset-control" key={key}>
                <label htmlFor={fieldId(path)}>{control.label}</label>
                <div className="preset-input-row">
                  {'options' in control ? (
                    <select
                      {...props}
                      onChange={(e) => onEdit(path, e.target.value)}
                    >
                      {control.options.map((option) => (
                        <option key={option} value={option}>
                          {option}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <input
                      {...props}
                      inputMode="decimal"
                      maxLength={80}
                      onChange={(e) => onEdit(path, e.target.value)}
                    />
                  )}
                  {resetButton(path, `Reset ${control.label.toLowerCase()}`)}
                </div>
                {'min' in control && (
                  <small>
                    {control.min} to {control.max}
                    {key === 'radiusRem' ? ' rem' : ' px'}
                  </small>
                )}
              </div>
            )
          })}
        </div>
      </section>
    </>
  )
}
