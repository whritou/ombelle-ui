import { useMemo, useState } from 'react'
import { RotateCcw } from 'lucide-react'
import { resolveRecipePreset } from '@ombelle/catalog'
import {
  componentRecipePartFields, componentRecipeParts,
  type ComponentRecipe, type ComponentRecipeAppearance, type ComponentRecipePart,
  type RecipeColorMode, type RecipeColorRole,
} from '@ombelle/contracts'
import { InspectorSection, SegmentedControl, SliderRow } from '../../editor-shell'
import { ColorPicker } from '../../generated/ui/components/ui/color-picker'
import { designControlLabel, glassDesignControls } from '../../preset-editor/model'
import type { MeasuredParts } from '../catalog-preview-protocol'
import { colorDimensionFor, colorPlaceholder } from '../measured-color'

const spacing = [
  ['paddingXPx', 'Horizontal padding', 1, 'px'],
  ['paddingYPx', 'Vertical padding', 1, 'px'],
  ['gapPx', 'Gap', 1, 'px'],
  ['minHeightPx', 'Minimum height', 1, 'px'],
] as const
const shape = [
  ['radiusRem', 'Corner radius', 0.05, 'rem'],
  ['borderWidthPx', 'Border width', 0.1, 'px'],
  ['shadowOffsetXPx', 'Shadow X', 1, 'px'],
  ['shadowOffsetYPx', 'Shadow Y', 1, 'px'],
] as const
const typography = [
  ['fontSizePx', 'Font size', 1, 'px'],
  ['fontWeight', 'Font weight', 100, ''],
  ['letterSpacingEm', 'Letter spacing', 0.01, 'em'],
] as const
const colorRoles = [
  ['background', 'Background'], ['foreground', 'Text'], ['border', 'Border'],
] as const
const modes = [{ value: 'light', label: 'Light' }, { value: 'dark', label: 'Dark' }] as const
const { transparency, ...glassSliders } = glassDesignControls
type Glass = NonNullable<ComponentRecipeAppearance['glass']>

function setOptional<T, K extends keyof T>(record: T, key: K, value: T[K] | undefined): T {
  const next = { ...record }
  if (value === undefined) delete next[key]
  else next[key] = value
  return next
}

/**
 * The preset's value rounded to the slider's precision, as the empty field's placeholder.
 * It is not clamped: a rendered 'auto' minimum height reads 0 even where an override must be at least 24.
 */
function shown(value: number | undefined, step: number): string | undefined {
  if (value === undefined || !Number.isFinite(value)) return undefined
  const decimals = step.toString().split('.')[1]?.length ?? 0
  return String(Number(value.toFixed(decimals)))
}

function CatalogSlider({ id, label, min, max, step, unit, value, baseline, hint, change }: {
  id: string; label: string; min: number; max: number; step: number; unit: string
  value?: number; baseline?: number; hint?: string; change(value: number | undefined): void
}) {
  const [typing, setTyping] = useState<{ raw: string; value: number | undefined }>()
  const raw = typing?.value === value ? typing?.raw ?? '' : value?.toString() ?? ''
  const valid = (text: string) => /^-?(?:\d+\.?\d*|\.\d+)$/.test(text) && Number(text) >= min &&
    Number(text) <= max && (step !== 100 || Number(text) % 100 === 0)
  const invalid = raw !== '' && !valid(raw)
  return <div>
    <SliderRow id={id} label={label} min={min} max={max} step={step} unit={unit.trim()}
      value={raw} placeholder={shown(baseline, step)} edited={value !== undefined || invalid} invalid={invalid}
      describedBy={invalid ? id + '-error' : hint ? id + '-hint' : undefined}
      onChange={text => {
        const next = text === '' ? undefined : valid(text) ? Number(text) : value
        setTyping({ raw: text, value: next })
        if (next !== value) change(next)
      }}
      onReset={() => {
        setTyping(undefined)
        document.getElementById(id + '-number')?.focus()
        if (value !== undefined) change(undefined)
      }} />
    {hint && <p id={id + '-hint'} className="colorHint">{hint}</p>}
    {invalid && <p id={id + '-error'} className="fieldError" role="alert">
      {step === 100 ? 'Enter a weight from 300 to 800 in steps of 100.' : `Enter a value from ${min} to ${max}.`}
    </p>}
  </div>
}

export function CatalogAppearance({ recipe, glass, measured = {}, previewMode = 'light', update }: {
  recipe: ComponentRecipe; glass: boolean; measured?: MeasuredParts
  /** The preview's mode: measured colours fill only that mode's empty fields. */
  previewMode?: RecipeColorMode
  update(recipe: ComponentRecipe): void
}) {
  const parts = componentRecipeParts[recipe.component]
  const [slot, setSlot] = useState(parts[0].slot)
  const [mode, setMode] = useState<RecipeColorMode>('light')
  const part = parts.find(candidate => candidate.slot === slot) ?? parts[0]
  const appearance = recipe.appearance ?? {}
  const values = appearance.parts?.[part.slot] ?? {}
  const material = appearance.glass ?? {}
  const rendered = measured[part.slot] ?? {}
  const presetDesign = useMemo(() => {
    try { return resolveRecipePreset(recipe.presetRef).design as Record<string, unknown> } catch { return {} }
  }, [recipe.presetRef])
  const updateAppearance = (next: ComponentRecipeAppearance) => {
    const nextRecipe = { ...recipe }
    if (Object.keys(next).length) nextRecipe.appearance = next
    else delete nextRecipe.appearance
    update(nextRecipe)
  }
  const updatePart = (next: ComponentRecipePart) => {
    const parts = setOptional(appearance.parts ?? {}, part.slot, Object.keys(next).length ? next : undefined)
    updateAppearance(setOptional(appearance, 'parts', Object.keys(parts).length ? parts : undefined))
  }
  const updateColor = (role: RecipeColorRole, value: string) => {
    const palette = setOptional(values.colors?.[mode] ?? {}, role, value || undefined)
    const colors = setOptional(values.colors ?? {}, mode, Object.keys(palette).length ? palette : undefined)
    updatePart(setOptional(values, 'colors', Object.keys(colors).length ? colors : undefined))
  }
  const updateGlass = <K extends keyof Glass>(key: K, value: Glass[K]) => {
    const next = setOptional(material, key, value)
    updateAppearance(setOptional(appearance, 'glass', Object.keys(next).length ? next : undefined))
  }
  const dimensions = part.kind === 'text' ? typography
    : part.kind === 'layout' ? spacing
      : part.kind === 'mark' ? [...shape.slice(0, 2), spacing[3]]
        : [...spacing, ...shape, ...typography]
  const roles = part.kind === 'text' ? colorRoles.filter(([key]) => key === 'foreground')
    : part.kind === 'mark' ? colorRoles.filter(([key]) => key !== 'foreground') : colorRoles

  return <>
    <InspectorSection id="catalog-appearance" title="Appearance">
      {parts.length > 1 && <label className="be-stack">Part to style
        <select value={part.slot} onChange={event => setSlot(event.target.value)}>
          {parts.map(item => <option key={item.slot} value={item.slot}>{item.label}</option>)}
        </select>
      </label>}
      {part.kind !== 'layout' && <div className="be-colors">
        <SegmentedControl<RecipeColorMode> label="Color mode" value={mode} options={modes} onChange={setMode} />
        {roles.map(([role, label]) => {
          const value = values.colors?.[mode]?.[role] ?? ''
          const id = `catalog-color-${role}`
          return <div className="be-color-role" key={role}>
            <label htmlFor={id} className="be-color-role-name">{label}</label>
            <div className="be-color-chip" data-inherited={value === '' || undefined}>
              <ColorPicker id={id} label={label} value={value} placeholder={colorPlaceholder(rendered[colorDimensionFor[role]], mode, previewMode, 'Preset')}
                onValueChange={next => updateColor(role, next)} onInvalid={text => updateColor(role, text.trim())} />
              {value && <button type="button" className="colorReset" aria-label={`Reset ${label.toLowerCase()} color`}
                onClick={() => { document.getElementById(id)?.focus(); updateColor(role, '') }}>
                <RotateCcw aria-hidden="true" size={14} />
              </button>}
            </div>
          </div>
        })}
      </div>}
      {dimensions.map(([key, label, step, unit]) => {
        const { minimum, maximum } = componentRecipePartFields[key]
        const name = key === 'borderWidthPx' || key === 'shadowOffsetXPx' || key === 'shadowOffsetYPx'
          ? designControlLabel(key, glass ? 'liquid-glass' : 'flat') : label
        return <CatalogSlider key={part.slot + key} id={`catalog-part-${key}`} label={name}
          min={minimum} max={maximum} step={step} unit={unit} value={values[key]} baseline={rendered[key]}
          change={value => updatePart(setOptional(values, key, value))} />
      })}
    </InspectorSection>
    {glass && <InspectorSection id="catalog-glass" title="Liquid Glass material">
      <label className="be-stack">{transparency.label}
        <select value={material.transparency ?? ''} onChange={event => {
          const value = event.target.value
          updateGlass('transparency', value === 'auto' || value === 'reduced' ? value : undefined)
        }}>
          <option value="">Preset</option>
          {transparency.options.map(value => <option key={value} value={value}>{value === 'auto' ? 'Auto' : 'Reduced'}</option>)}
        </select>
      </label>
      {(Object.entries(glassSliders) as [Exclude<keyof Glass, 'transparency'>, (typeof glassSliders)[keyof typeof glassSliders]][])
        .map(([key, { label, min, max, step, unit, hint }]) => <CatalogSlider key={key}
          id={`catalog-glass-${key}`} label={label} min={min} max={max} step={step} unit={unit}
          hint={hint} value={material[key]} change={value => updateGlass(key, value)}
          // Material settings a preset leaves out read as 0.
          baseline={typeof presetDesign[key] === 'number' ? presetDesign[key] : 0} />)}
    </InspectorSection>}
  </>
}
