import { useState } from 'react'
import { RotateCcw } from 'lucide-react'
import type { Recipe, RecipeColorMode, RecipeColorRole, StyleFamily } from '@ombelle/contracts'
import type { CompileDiagnostic } from '../compile-protocol'
import { draftFamily, RECIPE_COLOR_PATTERN, recipeColor, withRecipeColor } from '../model'

type Props = {
  recipe: Recipe
  diagnostic: CompileDiagnostic | null
  onChange: (recipe: Recipe, key: string) => void
  onFamily: (family: StyleFamily) => void
  onDiagnostic: (path: string, message: string) => void
}

const numericFields = [
  { key: 'radiusRem', label: 'Corner radius', min: 0, max: 2, step: 0.1, unit: 'rem' },
  { key: 'borderWidthPx', label: 'Border width', min: 0, max: 4, step: 0.1, unit: 'px' },
  { key: 'minHeightPx', label: 'Minimum height', min: 24, max: 80, step: 1, unit: 'px' },
  { key: 'shadowOffsetXPx', label: 'Shadow X offset', min: -16, max: 16, step: 1, unit: 'px' },
  { key: 'shadowOffsetYPx', label: 'Shadow Y offset', min: -16, max: 16, step: 1, unit: 'px' },
] as const

function FieldError({ diagnostic, path }: { diagnostic: CompileDiagnostic | null; path: string }) {
  return diagnostic?.path === path ? <span className="fieldError" role="alert">{diagnostic.message}</span> : null
}

const colorRoles: readonly { role: RecipeColorRole; label: string }[] = [
  { role: 'background', label: 'Background' },
  { role: 'foreground', label: 'Text' },
  { role: 'border', label: 'Border' },
]
const colorModes: readonly { mode: RecipeColorMode; label: string }[] = [
  { mode: 'light', label: 'Light' },
  { mode: 'dark', label: 'Dark' },
]
const hexByte = (n: number) => n.toString(16).padStart(2, '0')
/** Native color inputs only take #rrggbb, so OKLCH values are converted through a canvas for display. */
function pickerValue(value: string): string {
  if (/^#[0-9a-f]{6}$/i.test(value)) return value.toLowerCase()
  if (typeof document === 'undefined' || typeof CSS === 'undefined' || !CSS.supports('color', value)) return '#000000'
  const context = document.createElement('canvas').getContext('2d', { willReadFrequently: true })
  if (!context) return '#000000'
  context.fillStyle = value
  context.fillRect(0, 0, 1, 1)
  const [r, g, b] = context.getImageData(0, 0, 1, 1).data
  return '#' + [r, g, b].map(hexByte).join('')
}

type ColorProps = Pick<Props, 'recipe' | 'diagnostic' | 'onChange' | 'onDiagnostic'>

function ColorFields({ recipe, diagnostic, onChange, onDiagnostic }: ColorProps) {
  // Text being typed stays local until it is a complete color, then it becomes a recipe edit.
  const [typing, setTyping] = useState<Record<string, string>>({})
  const commit = (mode: RecipeColorMode, role: RecipeColorRole, value: string | undefined) =>
    onChange(withRecipeColor(recipe, mode, role, value), `overrides.colors.${mode}.${role}`)

  return (
    <div className="fieldGroup">
      <h3>Colors</h3>
      <p className="colorHint">Hex such as #1d4ed8 or OKLCH such as oklch(55% 0.2 260). Empty fields use the preset.</p>
      {colorRoles.map(({ role, label }) => (
        <fieldset className="colorRole" key={role}>
          <legend>{label}</legend>
          {colorModes.map(({ mode, label: modeLabel }) => {
            const key = `${mode}-${role}`, path = `/overrides/colors/${mode}/${role}`
            const { value, overridden } = recipeColor(recipe, mode, role)
            const text = typing[key] ?? value
            const name = `${modeLabel} ${label.toLowerCase()}`
            const invalid = diagnostic?.path === path
            return (
              <div className="colorRow" key={mode}>
                <label htmlFor={`color-${key}`}>{modeLabel}</label>
                <span className="colorSwatch" style={{ backgroundColor: value }}>
                  <input type="color" aria-label={`${name} picker`} value={pickerValue(value)}
                    onChange={(event) => commit(mode, role, event.target.value)} />
                </span>
                <input id={`color-${key}`} type="text" className="colorText" aria-label={name} value={text} maxLength={80} spellCheck={false}
                  data-overridden={overridden || undefined} aria-invalid={invalid || undefined}
                  aria-describedby={invalid ? `color-${key}-error` : undefined}
                  onChange={(event) => {
                    const next = event.target.value.trim()
                    setTyping({ ...typing, [key]: event.target.value })
                    if (next === '') commit(mode, role, undefined)
                    else if (RECIPE_COLOR_PATTERN.test(next)) commit(mode, role, next)
                    else onDiagnostic(path, 'Enter a hex color such as #1d4ed8 or an OKLCH color such as oklch(55% 0.2 260).')
                  }}
                  onBlur={() => {
                    const rest = { ...typing }
                    delete rest[key]
                    setTyping(rest)
                  }} />
                <button type="button" className="colorReset" aria-label={`Reset ${name} to preset`} title={`Reset ${name} to preset`}
                  disabled={!overridden}
                  onClick={() => {
                    const rest = { ...typing }
                    delete rest[key]
                    setTyping(rest)
                    commit(mode, role, undefined)
                    // The button disables itself, so keep focus on the field it reset.
                    document.getElementById(`color-${key}`)?.focus()
                  }}>
                  <RotateCcw aria-hidden="true" size={14} />
                </button>
                {invalid && <span id={`color-${key}-error`} className="fieldError colorError" role="alert">{diagnostic.message}</span>}
              </div>
            )
          })}
        </fieldset>
      ))}
    </div>
  )
}

export function PropertiesPanel({ recipe, diagnostic, onChange, onFamily, onDiagnostic }: Props) {
  const family = draftFamily(recipe)
  const changeProp = (key: keyof Recipe['props'], value: string | boolean) =>
    onChange({ ...recipe, props: { ...recipe.props, [key]: value } }, `props.${key}`)
  const changeOverride = (key: keyof Recipe['overrides'], value: number) =>
    onChange({ ...recipe, overrides: { ...recipe.overrides, [key]: value } }, `overrides.${key}`)

  return (
    <section className="properties" aria-labelledby="properties-title">
      <div className="railHeading"><h2 id="properties-title">Customize</h2><p>Changes here become part of the recipe.</p></div>
      <div className="fieldGroup">
        <h3>Foundation</h3>
        <label htmlFor="family">Style family</label>
        <select id="family" value={family} onChange={(event) => onFamily(event.target.value as StyleFamily)}>
          <option value="flat">Flat</option><option value="minimalist">Minimalist</option>
          <option value="neo-brutalism">Neo brutalism</option>
          <option value="liquid-glass">Liquid glass (Experimental)</option>
        </select>
        <FieldError diagnostic={diagnostic} path="/presetRef" />
      </div>
      <div className="fieldGroup">
        <h3>Button</h3>
        <label htmlFor="button-text">Button text</label>
        <input id="button-text" type="text" maxLength={200} value={recipe.content}
          onChange={(event) => onChange({ ...recipe, content: event.target.value }, 'content')} />
        <FieldError diagnostic={diagnostic} path="/content" />
        <label htmlFor="variant">Variant</label>
        <select id="variant" value={recipe.props.variant ?? 'default'} onChange={(event) => changeProp('variant', event.target.value)}>
          {['default', 'secondary', 'outline', 'ghost', 'link', 'destructive'].map((value) => <option key={value} value={value}>{value}</option>)}
        </select>
        <FieldError diagnostic={diagnostic} path="/props/variant" />
        <label htmlFor="size">Size</label>
        <select id="size" value={recipe.props.size ?? 'default'} onChange={(event) => changeProp('size', event.target.value)}>
          {['sm', 'default', 'lg', 'icon'].map((value) => <option key={value} value={value}>{value}</option>)}
        </select>
        <FieldError diagnostic={diagnostic} path="/props/size" />
        <label htmlFor="button-type">Button type</label>
        <select id="button-type" value={recipe.props.type ?? 'button'} onChange={(event) => changeProp('type', event.target.value)}>
          {['button', 'submit', 'reset'].map((value) => <option key={value} value={value}>{value}</option>)}
        </select>
        <FieldError diagnostic={diagnostic} path="/props/type" />
        <div className="checkRow"><label htmlFor="disabled">Disabled</label><input id="disabled" type="checkbox" checked={recipe.props.disabled ?? false} onChange={(event) => changeProp('disabled', event.target.checked)} /></div>
        <div className="checkRow"><label htmlFor="loading">Loading</label><input id="loading" type="checkbox" checked={recipe.props.loading ?? false} onChange={(event) => changeProp('loading', event.target.checked)} /></div>
      </div>
      <ColorFields recipe={recipe} diagnostic={diagnostic} onChange={onChange} onDiagnostic={onDiagnostic} />
      <div className="fieldGroup">
        <h3>Shape and depth</h3>
        {numericFields.map(({ key, label, min, max, step, unit }) => {
          const value = recipe.overrides[key]
          const fieldPath = `/overrides/${key}`
          const update = (raw: string) => {
            const number = Number(raw)
            if (raw === '' || !Number.isFinite(number) || number < min || number > max) {
              onDiagnostic(fieldPath, `Enter a value from ${min} to ${max} ${unit}.`)
              return
            }
            changeOverride(key, number)
          }
          return <div className="numberField" key={key}>
            <label htmlFor={`${key}-range`}>{label} <span>{unit}</span></label>
            <div className="numberPair">
              <input id={`${key}-range`} type="range" min={min} max={max} step={step} value={value ?? min}
                onChange={(event) => update(event.target.value)} />
              <input type="number" aria-label={`${label} value`} min={min} max={max} step={step} value={value ?? ''}
                placeholder="Preset" onChange={(event) => update(event.target.value)} />
            </div>
            <FieldError diagnostic={diagnostic} path={fieldPath} />
          </div>
        })}
      </div>
    </section>
  )
}
