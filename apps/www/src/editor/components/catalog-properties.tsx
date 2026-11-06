import { defaultGlassPresetId, resolveRecipePreset } from '@ombelle/catalog'
import { styleFamilies, styleSupport, type ComponentRecipe } from '@ombelle/contracts'
import { GlassPresetSelect } from '../../site/glass-preset-select'
import { glassPresetId } from '../../site/glass-presets'
import { catalogPresetRef } from '../catalog-draft'
import { FamilyPicker } from './family-picker'

export function CatalogProperties({ recipe, update }: { recipe: ComponentRecipe; update(recipe: ComponentRecipe): void }) {
  const family = resolveRecipePreset(recipe.presetRef).styleFamily
  return <div className="properties gap-4 py-4">
    <FamilyPicker value={family} families={styleFamilies.filter(style => styleSupport(recipe.component, style) !== 'unavailable')}
      onChange={style => update({ ...recipe, presetRef: catalogPresetRef(style) })} />
    {family === 'liquid-glass' && <GlassPresetSelect value={glassPresetId(recipe.presetRef.id)}
      onChange={id => update({ ...recipe, presetRef: catalogPresetRef(family, id ?? defaultGlassPresetId) })} />}
    <label className="be-stack">Label
      <input type="text" maxLength={200} value={recipe.content.label}
        onChange={event => update({ ...recipe, content: { label: event.target.value } })} />
    </label>
    <label className="be-stack">Variant
      <select value={recipe.props.variant} onChange={event => update({
        ...recipe, props: { variant: event.target.value as ComponentRecipe['props']['variant'] },
      })}>
        {['default', 'secondary', 'outline', 'accent', 'destructive'].map(value =>
          <option key={value} value={value}>{value}</option>)}
      </select>
    </label>
  </div>
}
