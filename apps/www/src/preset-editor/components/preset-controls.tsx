import type { PresetEditorDraft, PresetEditablePath } from '../model'
import {
  colorKeys,
  designControls,
  glassDesignControls,
  presetFieldValue,
} from '../model'
export const fieldId = (path: string) => 'preset' + path.replaceAll('/', '-')
const human = (key: string) =>
  key.replace(/[A-Z]/g, (c) => ' ' + c.toLowerCase())
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
  // Transparency, blur and opacity exist only for liquid glass drafts.
  const designEntries: [
    string,
    (typeof designControls)[keyof typeof designControls] | (typeof glassDesignControls)[keyof typeof glassDesignControls],
  ][] = [
    ...Object.entries(designControls),
    ...(draft.family === 'liquid-glass' ? Object.entries(glassDesignControls) : []),
  ]
  return (
    <>
      {(['light', 'dark'] as const).map((mode) => (
        <details key={mode} open>
          <summary>{mode === 'light' ? 'Light colors' : 'Dark colors'}</summary>
          <div className="preset-control-grid">
            {colorKeys.map((key) => {
              const path: PresetEditablePath = `/modes/${mode}/${key}`,
                value = presetFieldValue(draft, path)
              return (
                <div className="preset-control" key={key}>
                  <label htmlFor={fieldId(path)}>
                    {mode === 'light' ? 'Light' : 'Dark'} {human(key)}
                  </label>
                  <div className="preset-input-row">
                    <span
                      className="preset-swatch"
                      aria-hidden="true"
                      style={{ backgroundColor: value }}
                    />
                    <input
                      id={fieldId(path)}
                      value={value}
                      maxLength={80}
                      aria-invalid={errorPath === path || undefined}
                      aria-describedby={
                        errorPath === path ? 'preset-error' : undefined
                      }
                      onChange={(e) => onEdit(path, e.target.value)}
                    />
                    <button
                      type="button"
                      aria-label={`Reset ${mode} ${human(key)}`}
                      onClick={() => onReset(path)}
                      disabled={!Object.hasOwn(draft.edits, path)}
                    >
                      Reset
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        </details>
      ))}
      <details open>
        <summary>Design tokens</summary>
        <div className="preset-control-grid">
          {designEntries.map(([key, control]) => {
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
                  <button
                    type="button"
                    aria-label={`Reset ${control.label.toLowerCase()}`}
                    onClick={() => onReset(path)}
                    disabled={!Object.hasOwn(draft.edits, path)}
                  >
                    Reset
                  </button>
                </div>
                {'min' in control && (
                  <small>
                    {control.min} to {control.max}
                    {'unit' in control
                      ? control.unit
                      : key === 'radiusRem'
                        ? ' rem'
                        : ' px'}
                    {'step' in control && control.step < 1
                      ? `, in steps of ${control.step}`
                      : ''}
                  </small>
                )}
              </div>
            )
          })}
        </div>
      </details>
    </>
  )
}
