import { useId } from 'react'
import { defaultGlassPresetId, resolveRecipePreset } from '@ombelle/catalog'
import { componentRecipeFields, defaultRecipeFields, styleSupport, type ComponentRecipe, type RecipeField } from '@ombelle/contracts'
import { siteFamilyOrder } from '../../snapshots/install-command'
import { GlassPresetSelect } from '../../site/glass-preset-select'
import { glassPresetId } from '../../site/glass-presets'
import { catalogPresetRef } from '../catalog-draft'
import { FamilyPicker } from './family-picker'
import { CatalogAppearance } from './catalog-appearance'
import { NumberInput } from '../../generated/ui/components/ui/number-input'
import { Switch } from '../../generated/ui/components/ui/switch'
import { CheckboxOption } from '../../generated/ui/components/ui/checkbox'
import { Field as UiField, FieldControl, FieldLabel } from '../../generated/ui/components/ui/field'
import type { MeasuredParts } from '../catalog-preview-protocol'

export function CatalogProperties({ recipe, measured = {}, previewMode = 'light', update }: {
  recipe: ComponentRecipe; measured?: MeasuredParts; previewMode?: 'light' | 'dark'; update(recipe: ComponentRecipe): void
}) {
  const family = resolveRecipePreset(recipe.presetRef).styleFamily
  const fields = componentRecipeFields(recipe.component)
  const props: Record<string, unknown> = recipe.props
  const content: Record<string, unknown> = recipe.content
  const choices = (content.options ?? content.items ?? content.columns ?? []) as Item[]
  const protectedIds = [props.selection, ...(props.expanded as string[] ?? []), ...(props.numeric as string[] ?? [])]
  function change(group: 'props' | 'content', key: string, value: unknown) {
    const values: Record<string, unknown> = { ...recipe[group], [key]: value }
    if (group === 'content' && key === 'columns' && recipe.component === 'table') {
      values.rows = recipe.content.rows.map(row => ({
        ...row,
        cells: (value as Item[]).map(column => row.cells[recipe.content.columns.findIndex(item => item.id === column.id)] ?? ''),
      }))
    }
    update({ ...recipe, [group]: values } as ComponentRecipe)
  }
  return <div className="properties gap-4 py-4">
    <FamilyPicker value={family} families={siteFamilyOrder.filter(style => styleSupport(recipe.component, style) !== 'unavailable')}
      onChange={style => update({ ...recipe, presetRef: catalogPresetRef(style) })} />
    {family === 'liquid-glass' && <GlassPresetSelect value={glassPresetId(recipe.presetRef.id)}
      onChange={id => update({ ...recipe, presetRef: catalogPresetRef(family, id ?? defaultGlassPresetId) })} />}
    {Object.entries(fields.content).filter(([key]) => recipe.component !== 'separator' || key !== 'label' || !props.decorative).map(([key, field]) =>
      <Field key={key} field={field} value={content[key]} protectedIds={protectedIds}
        update={value => change('content', key, value)}
        createItem={key === 'rows' && recipe.component === 'table' ? () => ({
          cells: recipe.content.columns.map(() => ''),
        }) : undefined} />)}
    {Object.entries(fields.props).map(([key, field]) => {
      if (key === 'selection') return <label key={key} className="be-stack">Initial selection
        <select value={String(props[key] ?? '')} onChange={event => change('props', key, event.target.value)}>
          {recipe.component !== 'tabs' && <option value="">None</option>}
          {choices.map(choice => <option key={choice.id} value={choice.id}>{String(choice.label)}</option>)}
        </select>
      </label>
      if (key === 'expanded' || key === 'numeric') {
        const selected = props[key] as string[]
        return <fieldset key={key}>
          <legend>{field.title}</legend>
          {choices.map(choice => <CheckboxOption key={choice.id} title={String(choice.label)} checked={selected.includes(choice.id)}
            onCheckedChange={checked => change('props', key,
              checked === true ? [...selected, choice.id] : selected.filter(id => id !== choice.id))} />)}
        </fieldset>
      }
      if (key === 'collapsible' && props.type === 'multiple') return null
      return <Field key={key} field={field} value={props[key]} update={value => change('props', key, value)} />
    })}
    <CatalogAppearance recipe={recipe} glass={family === 'liquid-glass'} measured={measured} previewMode={previewMode} update={update} />
  </div>
}

type Item = Record<string, unknown> & { id: string }
/** An integer property: a typed partial number stays in the field and changes nothing until it parses. */
function IntegerField({ field, value, update }: { field: RecipeField; value: unknown; update(value: unknown): void }) {
  const id = useId()
  return <div className="be-stack">
    <label htmlFor={id}>{field.title}</label>
    <NumberInput id={id} value={typeof value === 'number' ? value : null} min={field.minimum} max={field.maximum}
      onValueChange={(next, { text }) => {
        if (text.trim() === '') update(null)
        else if (next !== null) update(next)
      }} />
  </div>
}

function Field({ field, value, update, protectedIds = [], createItem }: {
  field: RecipeField
  value: unknown
  update(value: unknown): void
  protectedIds?: readonly unknown[]
  createItem?: () => Record<string, unknown>
}) {
  if (field.type === 'array' && field.items?.properties) {
    const entries = value as Item[]
    const properties = field.items.properties
    const move = (index: number, offset: number) => {
      const reordered = [...entries]
      const entry = reordered[index]
      reordered[index] = reordered[index + offset]
      reordered[index + offset] = entry
      update(reordered)
    }
    return <fieldset className="grid gap-3">
      <legend>{field.title}</legend>
      {entries.map((entry, index) => <fieldset key={entry.id} className="grid gap-2 rounded-md border border-border p-2">
        <legend>{field.title} {index + 1}</legend>
        {Object.entries(properties).filter(([key]) => key !== 'id').map(([key, property]) =>
          <Field key={key} field={property} value={entry[key]} update={next =>
            update(entries.map(item => item.id === entry.id ? { ...item, [key]: next } : item))} />)}
        <div className="flex flex-wrap gap-1">
          <button type="button" disabled={index === 0} onClick={() => move(index, -1)}>Move up</button>
          <button type="button" disabled={index === entries.length - 1} onClick={() => move(index, 1)}>Move down</button>
          <button type="button" disabled={entries.length <= (field.minItems ?? 0) || protectedIds.includes(entry.id)}
            onClick={() => update(entries.filter(item => item.id !== entry.id))}>Remove</button>
        </div>
        {protectedIds.includes(entry.id) && <p className="text-xs text-muted-foreground">Change the selection before removing this item.</p>}
      </fieldset>)}
      <button type="button" disabled={entries.length >= (field.maxItems ?? 12)} onClick={() => {
        update([...entries, { ...defaultRecipeFields(properties), ...createItem?.(), id: 'item-' + crypto.randomUUID().slice(0, 8) }])
      }}>Add item</button>
    </fieldset>
  }
  if (field.type === 'array' && field.items) {
    const cells = value as string[]
    return <div className="grid gap-2">{cells.map((cell, index) =>
      <Field key={index} field={{ ...field.items, title: `Cell ${index + 1}` }} value={cell}
        update={next => update(cells.map((text, position) => index === position ? next : text))} />)}
    </div>
  }
  if (field.enum) return <label className="be-stack">{field.title}
    <select value={String(value ?? field.default ?? field.enum[0])} onChange={event => update(field.enum?.find(option => String(option) === event.target.value))}>
      {field.enum.map(option => <option key={option} value={String(option)}>{String(option)}</option>)}
    </select>
  </label>
  if (field.type === 'boolean') return <UiField orientation="horizontal">
    <FieldLabel>{field.title}</FieldLabel>
    <FieldControl><Switch size="sm" checked={value === true} onCheckedChange={update} /></FieldControl>
  </UiField>
  if (field.type === 'integer') return <IntegerField field={field} value={value} update={update} />
  if ((field.maxLength ?? 0) > 200) return <label className="be-stack">{field.title}
    <textarea maxLength={field.maxLength} value={String(value ?? '')} onChange={event => update(event.target.value)} />
  </label>
  return <label className="be-stack">{field.title}
    <input type="text" maxLength={field.maxLength} value={String(value ?? '')} onChange={event => update(event.target.value)} />
  </label>
}
