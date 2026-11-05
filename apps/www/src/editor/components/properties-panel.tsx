import type { ReactNode } from 'react'
import { useState } from 'react'
import { RotateCcw } from 'lucide-react'
import {
  recipeIcons, recipeStateColorKey,
  type Recipe, type RecipeButtonVariant, type RecipeColorKey, type RecipeColorMode, type RecipeColorRole,
  type RecipeIconName, type StyleFamily,
} from '@ombelle/contracts'
import type { CompileDiagnostic } from '../compile-protocol'
import { InspectorSection, SegmentedControl, SliderRow } from '../../editor-shell'
import { RECIPE_COLOR_PATTERN, recipeColor, withRecipeColor, withRecipeIcon, withRecipeOverride } from '../model'
import { FamilyPicker } from './family-picker'
import { designControlLabel, glassControlHints } from '../../preset-editor/model'

type Props = {
  recipe: Recipe
  family: StyleFamily
  onFamily: (family: StyleFamily) => void
  diagnostic: CompileDiagnostic | null
  onChange: (recipe: Recipe, key: string) => void
  onDiagnostic: (path: string, message: string) => void
}

type OverrideKey = 'radiusRem' | 'borderWidthPx' | 'minHeightPx' | 'shadowOffsetXPx' | 'shadowOffsetYPx' |
  'paddingXPx' | 'paddingYPx' | 'gapPx' | 'fontWeight' | 'fontSizePx' | 'letterSpacingEm'
type Slider = { key: OverrideKey; label: string; min: number; max: number; step: number; unit: string }
const spacingSliders: readonly Slider[] = [
  { key: 'paddingXPx', label: 'Horizontal padding', min: 0, max: 48, step: 1, unit: 'px' },
  { key: 'paddingYPx', label: 'Vertical padding', min: 0, max: 24, step: 1, unit: 'px' },
  { key: 'gapPx', label: 'Icon gap', min: 0, max: 24, step: 1, unit: 'px' },
]
const typeSliders: readonly Slider[] = [
  { key: 'fontWeight', label: 'Font weight', min: 300, max: 800, step: 100, unit: '' },
  { key: 'fontSizePx', label: 'Font size', min: 11, max: 24, step: 1, unit: 'px' },
  { key: 'letterSpacingEm', label: 'Letter spacing', min: -0.05, max: 0.2, step: 0.01, unit: 'em' },
]
const iconNames = Object.keys(recipeIcons) as RecipeIconName[]
const iconLabel = (name: string) => name.charAt(0).toUpperCase() + name.slice(1).replaceAll('-', ' ')
const iconPositions = [
  { value: 'start', label: 'Leading' },
  { value: 'end', label: 'Trailing' },
] as const
type ColorState = 'base' | 'hover' | 'pressed'
const colorStates = [
  { value: 'base', label: 'Base' },
  { value: 'hover', label: 'Hover' },
  { value: 'pressed', label: 'Pressed' },
] as const
const colorKey = (state: ColorState, role: RecipeColorRole): RecipeColorKey =>
  state === 'base' ? role : recipeStateColorKey(state, role)
const sliders = [
  { key: 'radiusRem', label: 'Corner radius', min: 0, max: 2, step: 0.1, unit: 'rem' },
  { key: 'borderWidthPx', label: 'Border width', min: 0, max: 4, step: 0.1, unit: 'px' },
  { key: 'minHeightPx', label: 'Minimum height', min: 24, max: 80, step: 1, unit: 'px' },
] as const
const shadows = [
  { key: 'shadowOffsetXPx', axis: 'X', min: -16, max: 16 },
  { key: 'shadowOffsetYPx', axis: 'Y', min: -16, max: 16 },
] as const
const numberPattern = /^-?(\d+\.?\d*|\.\d+)$/

const variants: readonly { value: RecipeButtonVariant; label: string }[] = [
  { value: 'default', label: 'Default' },
  { value: 'secondary', label: 'Secondary' },
  { value: 'outline', label: 'Outline' },
  { value: 'ghost', label: 'Ghost' },
  { value: 'link', label: 'Link' },
  { value: 'destructive', label: 'Destructive' },
]
const sizes = [
  { value: 'sm', label: 'S' },
  { value: 'default', label: 'M' },
  { value: 'lg', label: 'L' },
  { value: 'icon', label: 'Icon' },
] as const
const types = [
  { value: 'button', label: 'button' },
  { value: 'submit', label: 'submit' },
  { value: 'reset', label: 'reset' },
] as const

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

function FieldError({ diagnostic, path }: { diagnostic: CompileDiagnostic | null; path: string }) {
  return diagnostic?.path === path
    ? <span className="fieldError" role="alert" id={`error${path.replaceAll('/', '-')}`}>{diagnostic.message}</span>
    : null
}

/** Six pressed buttons, each with a small sample of the variant's look. */
export function VariantPicker({ value, onChange }: { value: RecipeButtonVariant; onChange(variant: RecipeButtonVariant): void }) {
  return (
    <div role="group" aria-label="Variant" className="be-variants">
      {variants.map((variant) => (
        <button key={variant.value} type="button" className="be-variant" data-variant={variant.value}
          aria-pressed={variant.value === value} onClick={() => onChange(variant.value)}>
          <span className="be-variant-sample" data-variant={variant.value} aria-hidden="true">Aa</span>
          <span>{variant.label}</span>
        </button>
      ))}
    </div>
  )
}

function SwitchRow({ id, label, checked, onChange, describedBy }: {
  id: string; label: string; checked: boolean; onChange(next: boolean): void; describedBy?: string
}) {
  return (
    <div className="be-switch-row">
      <label htmlFor={id}>{label}</label>
      <button id={id} type="button" role="switch" aria-checked={checked} aria-describedby={describedBy} className="be-switch"
        onClick={() => onChange(!checked)} />
    </div>
  )
}

function StackField({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="be-stack">
      <span className="be-stack-label" aria-hidden="true">{label}</span>
      {children}
    </div>
  )
}

type ColorProps = Pick<Props, 'recipe' | 'diagnostic' | 'onChange' | 'onDiagnostic'>

function ColorFields({ recipe, diagnostic, onChange, onDiagnostic, state, family }: ColorProps & { state: ColorState; family: StyleFamily }) {
  // Text being typed stays local until it is a complete color, then it becomes a recipe edit.
  const [typing, setTyping] = useState<Record<string, string>>({})
  const commit = (mode: RecipeColorMode, role: RecipeColorRole, value: string | undefined) => {
    const key = colorKey(state, role)
    onChange(withRecipeColor(recipe, mode, key, value), `overrides.colors.${mode}.${key}`)
  }
  const fallback = state === 'base' ? 'Preset' : 'Family'

  return (
    <div className="be-colors">
      {colorRoles.map(({ role, label: plainLabel }) => {
        const roleLabel = role === 'border' ? designControlLabel('border', family) : plainLabel
        const hint = role === 'border' && family === 'liquid-glass' ? glassControlHints.border : null
        const label = state === 'base' ? roleLabel : `${state === 'hover' ? 'Hover' : 'Pressed'} ${roleLabel.toLowerCase()}`
        return (
        <div className="be-color-role" role="group" aria-labelledby={`color-role-${role}`} key={role}>
          <span id={`color-role-${role}`} className="be-color-role-name">{label}</span>
          {hint && <p id="color-role-border-hint" className="colorHint">{hint}</p>}
          <div className="be-color-chips">
            {colorModes.map(({ mode, label: modeLabel }) => {
              const field = colorKey(state, role)
              const key = `${mode}-${field}`, path = `/overrides/colors/${mode}/${field}`
              const { value, overridden } = recipeColor(recipe, mode, field)
              const text = typing[key] ?? (overridden ? value : '')
              const name = `${modeLabel} ${label.toLowerCase()}`
              const invalid = diagnostic?.path === path
              const describedBy = [invalid ? `color-${key}-error` : undefined, hint ? 'color-role-border-hint' : undefined].filter(Boolean).join(' ') || undefined
              return (
                <div className="be-color-cell" key={mode}>
                  <label htmlFor={`color-${key}`} className="be-chip-mode">{modeLabel}</label>
                  <div className="be-color-chip" data-inherited={overridden ? undefined : 'true'} data-invalid={invalid || undefined}>
                    <span className="colorSwatch" style={{ backgroundColor: value }}>
                      <input type="color" aria-label={`${name} picker`} aria-describedby={hint ? 'color-role-border-hint' : undefined} value={pickerValue(value)}
                        onChange={(event) => commit(mode, role, event.target.value)} />
                    </span>
                    <input id={`color-${key}`} type="text" className="colorText" aria-label={name} value={text}
                      placeholder={fallback} title={overridden ? undefined : state === 'base' ? `Preset: ${value}` : `Family ${state} color, from ${value}`} maxLength={80} spellCheck={false}
                      data-overridden={overridden || undefined} aria-invalid={invalid || undefined}
                      aria-describedby={describedBy}
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
                    {overridden && (
                      <button type="button" className="colorReset" aria-label={`Reset ${mode} ${label.toLowerCase()} to ${fallback.toLowerCase()}`}
                        title={`Reset ${mode} ${label.toLowerCase()} to ${fallback.toLowerCase()}`}
                        onClick={() => {
                          const rest = { ...typing }
                          delete rest[key]
                          setTyping(rest)
                          // This button leaves the page once the value is cleared; hand focus to the field first.
                          document.getElementById(`color-${key}`)?.focus()
                          commit(mode, role, undefined)
                        }}>
                        <RotateCcw aria-hidden="true" size={14} />
                      </button>
                    )}
                  </div>
                  {invalid && <span id={`color-${key}-error`} className="fieldError colorError" role="alert">{diagnostic.message}</span>}
                </div>
              )
            })}
          </div>
        </div>
        )
      })}
    </div>
  )
}

/**
 * Typed text shows only while its error is still reported, or while it is another spelling of the saved
 * value ("1." for 1). Once another edit clears the error, the field shows the recipe's value again.
 */
export function shownNumber(text: string | undefined, current: number | undefined, min: number, max: number, reported: boolean): string {
  const valid = text !== undefined && numberPattern.test(text) && Number(text) >= min && Number(text) <= max
  if (text !== undefined && ((!valid && reported) || (valid && Number(text) === current))) return text
  return current === undefined ? '' : String(current)
}

export function PropertiesPanel({ recipe, family, onFamily, diagnostic, onChange, onDiagnostic }: Props) {
  // Text being typed in a number field stays local until it is a valid value in range.
  const [typing, setTyping] = useState<Partial<Record<OverrideKey, string>>>({})
  const changeProp = (key: keyof Recipe['props'], value: string | boolean) =>
    onChange({ ...recipe, props: { ...recipe.props, [key]: value } }, `props.${key}`)
  const inRange = (raw: string, min: number, max: number) => numberPattern.test(raw) && Number(raw) >= min && Number(raw) <= max
  const display = (key: OverrideKey, min: number, max: number) =>
    shownNumber(typing[key], recipe.overrides[key], min, max, diagnostic?.path === `/overrides/${key}`)
  const update = (key: OverrideKey, raw: string, min: number, max: number, unit: string) => {
    setTyping({ ...typing, [key]: raw })
    if (!inRange(raw, min, max)) {
      onDiagnostic(`/overrides/${key}`, `Enter a value from ${min} to ${max}${unit ? ' ' + unit : ''}.`)
      return
    }
    if (key === 'fontWeight' && Number(raw) % 100 !== 0) {
      onDiagnostic(`/overrides/${key}`, 'Enter a weight in steps of 100, such as 500 or 600.')
      return
    }
    onChange({ ...recipe, overrides: { ...recipe.overrides, [key]: Number(raw) } }, `overrides.${key}`)
  }
  const reset = (key: OverrideKey, focusId: string) => {
    const overrides = { ...recipe.overrides }
    delete overrides[key]
    const rest = { ...typing }
    delete rest[key]
    setTyping(rest)
    // The reset button leaves the page once the override is gone; hand focus to the field first.
    document.getElementById(focusId)?.focus()
    onChange({ ...recipe, overrides }, `overrides.${key}`)
  }
  const glass = family === 'liquid-glass'
  const slider = ({ key, label: plain, min, max, step, unit }: Slider) => {
    const id = `button-${key}`, path = `/overrides/${key}`
    const label = key === 'borderWidthPx' ? designControlLabel(key, family) : plain
    const hint = glass && key === 'borderWidthPx' ? glassControlHints.borderWidthPx : null
    const error = diagnostic?.path === path ? `error${path.replaceAll('/', '-')}` : undefined
    return (
      <div key={key}>
        <SliderRow id={id} label={label} value={display(key, min, max)} min={min} max={max} step={step} unit={unit}
          edited={recipe.overrides[key] !== undefined} invalid={diagnostic?.path === path}
          describedBy={[error, hint ? `${id}-glass-hint` : undefined].filter(Boolean).join(' ') || undefined}
          onChange={(raw) => update(key, raw, min, max, unit)} onReset={() => reset(key, `${id}-number`)} />
        {hint && <p id={`${id}-glass-hint`} className="colorHint">{hint}</p>}
        <FieldError diagnostic={diagnostic} path={path} />
      </div>
    )
  }
  const [colorState, setColorState] = useState<ColorState>('base')
  const icon = recipe.icon
  const iconOnly = icon?.iconOnly ?? false
  const changeIcon = (next: Partial<NonNullable<Recipe['icon']>> | undefined) => onChange(withRecipeIcon(recipe, next), 'icon')

  return (
    <div className="properties">
      <InspectorSection id="inspector-family" title="Style family">
        <FamilyPicker value={family} onChange={onFamily} />
        <FieldError diagnostic={diagnostic} path="/presetRef" />
      </InspectorSection>
      <InspectorSection id="inspector-content" title="Content">
        <div className="be-stack">
          <label htmlFor="button-text" className="be-stack-label">{iconOnly ? 'Accessible label' : 'Button text'}</label>
          <input id="button-text" type="text" maxLength={200} value={recipe.content}
            aria-invalid={diagnostic?.path === '/content' || undefined}
            aria-describedby={iconOnly ? 'button-text-hint' : undefined}
            onChange={(event) => onChange({ ...recipe, content: event.target.value }, 'content')} />
        </div>
        {iconOnly && <p id="button-text-hint" className="colorHint">Icon-only Buttons show no text. Screen readers announce this label.</p>}
        <FieldError diagnostic={diagnostic} path="/content" />
      </InspectorSection>
      <InspectorSection id="inspector-variant" title="Variant">
        <VariantPicker value={recipe.props.variant ?? 'default'} onChange={(variant) => changeProp('variant', variant)} />
        <FieldError diagnostic={diagnostic} path="/props/variant" />
      </InspectorSection>
      <InspectorSection id="inspector-size" title="Size & behavior">
        <StackField label="Size">
          <SegmentedControl label="Size" value={recipe.props.size ?? 'default'} options={sizes}
            onChange={(size) => changeProp('size', size)} />
        </StackField>
        <FieldError diagnostic={diagnostic} path="/props/size" />
        <StackField label="Type">
          <SegmentedControl label="Button type" value={recipe.props.type ?? 'button'} options={types}
            onChange={(type) => changeProp('type', type)} />
        </StackField>
        <FieldError diagnostic={diagnostic} path="/props/type" />
        <SwitchRow id="button-disabled" label="Disabled" checked={recipe.props.disabled ?? false}
          onChange={(next) => changeProp('disabled', next)} />
        <SwitchRow id="button-loading" label="Loading" checked={recipe.props.loading ?? false}
          onChange={(next) => changeProp('loading', next)} />
      </InspectorSection>
      <InspectorSection id="inspector-icon" title="Icon">
        <div className="be-stack">
          <label htmlFor="button-icon" className="be-stack-label">Icon</label>
          <span className="be-icon-select">
            <select id="button-icon" value={icon?.name ?? ''}
              onChange={(event) => changeIcon(event.target.value ? { ...icon, name: event.target.value as RecipeIconName } : undefined)}>
              <option value="">None</option>
              {iconNames.map((name) => <option key={name} value={name}>{iconLabel(name)}</option>)}
            </select>
            {icon && (
              <button type="button" className="colorReset" aria-label="Remove icon" title="Remove icon"
                onClick={() => {
                  document.getElementById('button-icon')?.focus()
                  changeIcon(undefined)
                }}>
                <RotateCcw aria-hidden="true" size={14} />
              </button>
            )}
          </span>
        </div>
        <FieldError diagnostic={diagnostic} path="/icon" />
        {icon && (
          <>
            <StackField label="Position">
              <SegmentedControl label="Icon position" value={icon.position ?? 'start'} options={iconPositions}
                onChange={(position) => changeIcon({ ...icon, position })} />
            </StackField>
            <SwitchRow id="button-icon-only" label="Icon only" checked={iconOnly} describedBy="button-icon-only-hint"
              onChange={(next) => changeIcon({ ...icon, iconOnly: next })} />
            <p id="button-icon-only-hint" className="colorHint">
              {iconOnly ? 'The Content field is the accessible label.' : 'Hides the text and keeps it as the accessible label.'}
            </p>
          </>
        )}
      </InspectorSection>
      <InspectorSection id="inspector-spacing" title="Padding & gap" meta="Text sizes">
        <p className="colorHint">Applies to the S, M and L sizes. The Icon size and icon-only Buttons stay square.</p>
        {spacingSliders.map(slider)}
      </InspectorSection>
      <InspectorSection id="inspector-type" title="Typography">
        {typeSliders.map(slider)}
        <div className="be-uppercase">
          <SwitchRow id="button-uppercase" label="Uppercase" checked={recipe.overrides.uppercase ?? false}
            onChange={(next) => onChange(withRecipeOverride(recipe, 'uppercase', next ? true : undefined), 'overrides.uppercase')} />
        </div>
        <FieldError diagnostic={diagnostic} path="/overrides/uppercase" />
      </InspectorSection>
      <InspectorSection id="inspector-colors" title="Colors" meta="Light and dark">
        <StackField label="State">
          <SegmentedControl label="Color state" value={colorState} options={colorStates} onChange={(state) => setColorState(state as ColorState)} />
        </StackField>
        <p className="colorHint">
          {colorState === 'base'
            ? 'Hex such as #1d4ed8 or OKLCH such as oklch(55% 0.2 260). Empty fields use the preset.'
            : `Colors while the Button is ${colorState === 'hover' ? 'hovered' : 'pressed'}. Empty fields keep the style family's ${colorState} color.`}
        </p>
        <ColorFields key={colorState} state={colorState} family={family} recipe={recipe} diagnostic={diagnostic} onChange={onChange} onDiagnostic={onDiagnostic} />
      </InspectorSection>
      <InspectorSection id="inspector-shape" title="Shape & depth">
        {sliders.map(slider)}
        <span className="be-stack-label" aria-hidden="true">{glass ? 'Glass shadow offset' : 'Shadow offset'}</span>
        <div role="group" aria-label={glass ? 'Glass shadow offset' : 'Shadow offset'} className="be-shadow-row">
          {shadows.map(({ key, axis, min, max }) => {
            const id = `button-${key}`, path = `/overrides/${key}`
            return (
              <div className="be-shadow-field" key={key}>
                <span aria-hidden="true">{axis}</span>
                <input id={id} type="text" inputMode="decimal" maxLength={80} spellCheck={false}
                  aria-label={designControlLabel(key, family)} value={display(key, min, max)} placeholder="Preset"
                  aria-invalid={diagnostic?.path === path || undefined}
                  aria-describedby={[diagnostic?.path === path ? `error${path.replaceAll('/', '-')}` : undefined, glass ? 'button-shadow-hint' : undefined].filter(Boolean).join(' ') || undefined}
                  onChange={(event) => update(key, event.target.value, min, max, 'px')} />
                {recipe.overrides[key] !== undefined && (
                  <button type="button" className="colorReset" aria-label={glass ? `Reset ${designControlLabel(key, family).toLowerCase()}` : `Reset shadow ${axis.toLowerCase()} offset`}
                    onClick={() => reset(key, id)}>
                    <RotateCcw aria-hidden="true" size={14} />
                  </button>
                )}
              </div>
            )
          })}
        </div>
        {glass && <p id="button-shadow-hint" className="colorHint">{glassControlHints.shadowOffsetXPx}</p>}
        {shadows.map(({ key }) => <FieldError key={key} diagnostic={diagnostic} path={`/overrides/${key}`} />)}
      </InspectorSection>
    </div>
  )
}
