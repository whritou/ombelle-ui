import { describe, expect, it } from 'vitest'
import { getCatalog } from '@ombelle/catalog'
import { styleFamilies, validateRecipe } from '@ombelle/contracts'
import {
  baseColorRole, changeDraftFamily, createEditorDraft, draftFamily, experimentalNotice, recipeColor, resetDraftRecipe, updateDraftRecipe, withRecipeColor,
  withRecipeIcon, withRecipeOverride,
  type EditorView,
} from './model.js'
import { serializeRecipe } from './storage.js'

describe('Button editor model', () => {
  it.each(styleFamilies)('creates a valid %s draft with the exact built-in preset', (family) => {
    const draft = createEditorDraft(family)
    const catalog = getCatalog('0.1.0')
    const preset = family === 'liquid-glass' ? catalog.startingPresets['builtin-liquid-glass-cristal'] : catalog.presets[family]
    expect(draft).toEqual({
      storageVersion: 1,
      recipe: {
        schemaVersion: '1.0', id: 'button_recipe', revision: 1, component: 'button',
        presetRef: { id: preset.id, revision: preset.revision, catalogRelease: '0.1.0', compilerVersion: '0.1.0' },
        props: { variant: 'default', size: 'default', type: 'button', disabled: false, loading: false },
        content: 'Save changes', overrides: {},
      },
    })
    expect(validateRecipe(draft.recipe)).toEqual(draft.recipe)
  })

  it('changes only the exact preset reference when family changes', () => {
    const original = createEditorDraft('flat')
    const next = changeDraftFamily(original, 'neo-brutalism')
    expect(next.recipe.presetRef).toEqual({
      id: 'builtin-neo-brutalism', revision: 1, catalogRelease: '0.1.0', compilerVersion: '0.1.0',
    })
    expect({ ...next.recipe, presetRef: original.recipe.presetRef }).toEqual(original.recipe)
    expect(original.recipe.presetRef.id).toBe('builtin-flat')
  })

  it('validates a liquid-glass draft and labels it experimental', () => {
    const draft = changeDraftFamily(createEditorDraft('flat'), 'liquid-glass')
    expect(draft.recipe.presetRef.id).toBe('builtin-liquid-glass-cristal')
    expect(validateRecipe(draft.recipe)).toEqual(draft.recipe)
    expect(draftFamily(draft.recipe)).toBe('liquid-glass')
    expect(experimentalNotice('liquid-glass')).toBe(
      'liquid-glass is experimental for button; see docs/components/liquid-glass.md for limitations',
    )
    expect(experimentalNotice('flat')).toBeNull()
    expect(draftFamily(createEditorDraft('minimalist').recipe)).toBe('minimalist')
  })

  it('rejects recipe updates outside the recipe schema', () => {
    const draft = createEditorDraft('flat')
    expect(() => updateDraftRecipe(draft, { ...draft.recipe, content: '' })).toThrow()
    expect(draft.recipe.content).toBe('Save changes')
  })

  it('rejects a schema-valid reference that is not a pinned built-in preset', () => {
    const draft = createEditorDraft('flat')
    expect(() => updateDraftRecipe(draft, {
      ...draft.recipe,
      presetRef: { ...draft.recipe.presetRef, id: 'unknown' },
    })).toThrow()
  })

  it('preserves the existing recipe ID and revision through updates and export', () => {
    const initial = createEditorDraft('flat')
    const draft = { ...initial, recipe: { ...initial.recipe, id: 'saved_recipe', revision: 3 } }
    const updated = updateDraftRecipe(draft, {
      ...draft.recipe, id: 'replacement_recipe', revision: 4, content: 'Updated label',
    })
    expect(updated.recipe).toMatchObject({ id: 'saved_recipe', revision: 3, content: 'Updated label' })
    expect(JSON.parse(serializeRecipe(updated))).toMatchObject({ id: 'saved_recipe', revision: 3 })
    expect(draft.recipe).toMatchObject({ id: 'saved_recipe', revision: 3, content: 'Save changes' })
  })

  it('keeps presentation state outside recipe data', () => {
    const draft = createEditorDraft('flat')
    const before = JSON.stringify(draft.recipe)
    const view: EditorView = { mode: 'light', viewport: 'wide', panel: 'preview', forcedState: 'none' }
    const darkNarrowFocus: EditorView = { ...view, mode: 'dark', viewport: 'narrow', forcedState: 'focus' }
    expect(darkNarrowFocus).toMatchObject({ mode: 'dark', viewport: 'narrow', forcedState: 'focus' })
    expect(JSON.stringify(draft.recipe)).toBe(before)
    expect(Object.keys(draft)).toEqual(['storageVersion', 'recipe'])
  })
  it('round-trips a forced active state without touching recipe data', () => {
    const draft = createEditorDraft('flat')
    const before = JSON.stringify(draft.recipe)
    const view: EditorView = { mode: 'light', viewport: 'wide', panel: 'preview', forcedState: 'active' }
    expect(JSON.parse(JSON.stringify(view))).toEqual(view)
    expect(view.forcedState).toBe('active')
    expect(JSON.stringify(draft.recipe)).toBe(before)
  })
  it('reads color overrides with the variant preset token as fallback', () => {
    const draft = createEditorDraft('flat')
    const preset = getCatalog('0.1.0').presets.flat
    expect(recipeColor(draft.recipe, 'light', 'background')).toEqual({ value: preset.modes.light.primary, overridden: false })
    const outline = { ...draft.recipe, props: { ...draft.recipe.props, variant: 'outline' as const } }
    expect(recipeColor(outline, 'dark', 'foreground')).toEqual({ value: preset.modes.dark.foreground, overridden: false })
    expect(recipeColor(outline, 'dark', 'border')).toEqual({ value: preset.modes.dark.border, overridden: false })
    const colored = withRecipeColor(outline, 'dark', 'foreground', '#123456')
    expect(recipeColor(colored, 'dark', 'foreground')).toEqual({ value: '#123456', overridden: true })
    expect(recipeColor(colored, 'light', 'foreground').overridden).toBe(false)
  })
  it('reads glass fallbacks from what one-ink glass renders', () => {
    const draft = createEditorDraft('liquid-glass')
    const preset = getCatalog('0.1.0').startingPresets['builtin-liquid-glass-cristal']
    const as = (variant: 'default' | 'secondary' | 'destructive' | 'outline') => ({ ...draft.recipe, props: { ...draft.recipe.props, variant } })
    for (const variant of ['default', 'secondary', 'destructive', 'outline'] as const)
      for (const mode of ['light', 'dark'] as const)
        expect(recipeColor(as(variant), mode, 'foreground'), variant + ' ' + mode).toEqual({ value: preset.modes[mode].foreground, overridden: false })
    // Default and destructive keep their tint colour; secondary is card glass and outline background glass.
    expect(recipeColor(as('default'), 'dark', 'background').value).toBe(preset.modes.dark.primary)
    expect(recipeColor(as('secondary'), 'dark', 'background').value).toBe(preset.modes.dark.card)
    expect(recipeColor(as('outline'), 'light', 'background').value).toBe(preset.modes.light.background)
  })

  it('sets and clears color overrides without leaving empty groups', () => {
    const draft = createEditorDraft('neo-brutalism')
    const set = withRecipeColor(withRecipeColor(draft.recipe, 'light', 'background', '#ff0000'), 'dark', 'border', 'oklch(0.5 0.1 20)')
    expect(set.overrides).toEqual({ colors: { light: { background: '#ff0000' }, dark: { border: 'oklch(0.5 0.1 20)' } } })
    expect(updateDraftRecipe(draft, set).recipe.overrides).toEqual(set.overrides)
    const cleared = withRecipeColor(withRecipeColor(set, 'light', 'background', undefined), 'dark', 'border', undefined)
    expect(cleared.overrides).toEqual({})
    expect(draft.recipe.overrides).toEqual({})
    expect(() => updateDraftRecipe(draft, withRecipeColor(draft.recipe, 'light', 'border', 'oklch(0.5 0.9 20)')))
      .toThrow(expect.objectContaining({ path: '/overrides/colors/light/border' }))
  })
  it('resets content, props and overrides but keeps the family and identity', () => {
    const start = createEditorDraft('flat').recipe
    const edited = updateDraftRecipe(changeDraftFamily(createEditorDraft('flat'), 'ombelle'), {
      ...changeDraftFamily(createEditorDraft('flat'), 'ombelle').recipe,
      id: 'rc_mine', revision: 4, content: 'Ship it',
      props: { ...start.props, variant: 'outline', size: 'lg' },
      overrides: { radiusRem: 0.25, colors: { light: { background: '#336699' } } },
    })
    const reset = resetDraftRecipe(edited, start)
    expect(reset.recipe.content).toBe(start.content)
    expect(reset.recipe.props).toEqual(start.props)
    expect(reset.recipe.overrides).toEqual({})
    expect(draftFamily(reset.recipe)).toBe('ombelle')
    expect([reset.recipe.id, reset.recipe.revision]).toEqual([edited.recipe.id, edited.recipe.revision])
  })
  it('reads hover and pressed colors with the base role as fallback', () => {
    const draft = createEditorDraft('flat')
    const preset = getCatalog('0.1.0').presets.flat
    expect(baseColorRole('hoverBackground')).toBe('background')
    expect(baseColorRole('pressedForeground')).toBe('foreground')
    expect(baseColorRole('border')).toBe('border')
    expect(recipeColor(draft.recipe, 'light', 'hoverBackground')).toEqual({ value: preset.modes.light.primary, overridden: false })
    const base = withRecipeColor(draft.recipe, 'dark', 'foreground', '#abcdef')
    expect(recipeColor(base, 'dark', 'pressedForeground')).toEqual({ value: '#abcdef', overridden: false })
    const hover = withRecipeColor(base, 'dark', 'hoverForeground', '#123456')
    expect(recipeColor(hover, 'dark', 'hoverForeground')).toEqual({ value: '#123456', overridden: true })
    expect(updateDraftRecipe(draft, hover).recipe.overrides.colors).toEqual({ dark: { foreground: '#abcdef', hoverForeground: '#123456' } })
    expect(withRecipeColor(withRecipeColor(hover, 'dark', 'hoverForeground', undefined), 'dark', 'foreground', undefined).overrides).toEqual({})
  })
  it('sets and removes layout and type overrides', () => {
    const draft = createEditorDraft('ombelle')
    const set = withRecipeOverride(withRecipeOverride(draft.recipe, 'paddingXPx', 18), 'uppercase', true)
    expect(updateDraftRecipe(draft, set).recipe.overrides).toEqual({ paddingXPx: 18, uppercase: true })
    expect(withRecipeOverride(set, 'paddingXPx', undefined).overrides).toEqual({ uppercase: true })
    expect(() => updateDraftRecipe(draft, withRecipeOverride(draft.recipe, 'fontWeight', 450)))
      .toThrow(expect.objectContaining({ path: '/overrides/fontWeight' }))
    expect(() => updateDraftRecipe(draft, withRecipeOverride(draft.recipe, 'gapPx', 30)))
      .toThrow(expect.objectContaining({ path: '/overrides/gapPx' }))
  })
  it('writes icons with explicit position and mode, and removes them', () => {
    const draft = createEditorDraft('flat')
    const icon = withRecipeIcon(draft.recipe, { name: 'search' })
    expect(icon.icon).toEqual({ name: 'search', position: 'start', iconOnly: false })
    const only = withRecipeIcon(icon, { ...icon.icon, iconOnly: true })
    expect(updateDraftRecipe(draft, only).recipe.icon).toEqual({ name: 'search', position: 'start', iconOnly: true })
    expect(() => updateDraftRecipe(draft, { ...only, content: ' ' })).toThrow(expect.objectContaining({ path: '/content' }))
    expect(withRecipeIcon(only, undefined)).not.toHaveProperty('icon')
  })
  it('reset removes the icon and every new override', () => {
    const draft = createEditorDraft('flat')
    const edited = updateDraftRecipe(draft, withRecipeIcon(withRecipeOverride(
      withRecipeColor(draft.recipe, 'light', 'pressedBackground', '#000000'), 'letterSpacingEm', 0.1), { name: 'plus', iconOnly: true }))
    const reset = resetDraftRecipe(edited, draft.recipe).recipe
    expect(reset).not.toHaveProperty('icon')
    expect(reset.overrides).toEqual({})
  })
})

it('leaving liquid glass drops the glass material overrides the other families cannot show', () => {
  const glass = changeDraftFamily(createEditorDraft('flat'), 'liquid-glass')
  const tuned = updateDraftRecipe(glass, { ...glass.recipe, overrides: { ...glass.recipe.overrides, radiusRem: 1, glassHalo: 0.9, glassDepth: 0.4 } })
  const flat = changeDraftFamily(tuned, 'flat')
  expect(flat.recipe.overrides).toEqual({ radiusRem: 1 })
  // Staying in glass keeps them.
  expect(changeDraftFamily(tuned, 'liquid-glass').recipe.overrides).toMatchObject({ glassHalo: 0.9, glassDepth: 0.4 })
})
