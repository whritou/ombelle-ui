import type { Recipe, StyleFamily } from '@ombelle/contracts'
import type { CompileDiagnostic } from '../compile-protocol'

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

export function PropertiesPanel({ recipe, diagnostic, onChange, onFamily, onDiagnostic }: Props) {
  const family = recipe.presetRef.id.replace(/^builtin-/, '') as StyleFamily
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
