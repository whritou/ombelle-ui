import { getCatalog, resolveRecipePreset } from '@ombelle/catalog'
import {
  isStyleFamily, recipeColorTokens, styleSupport, validateRecipe,
  type Recipe, type RecipeColorMode, type RecipeColorRole, type StyleFamily,
} from '@ombelle/contracts'

export type EditorDraft = { storageVersion: 1; recipe: Recipe }

export type EditorView = {
  mode: 'light' | 'dark'
  viewport: 'wide' | 'narrow'
  panel: 'preview' | 'customize' | 'code'
  forcedState: 'none' | 'hover' | 'focus' | 'active' | 'disabled' | 'loading'
}

function presetRefFor(family: StyleFamily): Recipe['presetRef'] {
  const preset = getCatalog('0.1.0').presets[family]
  return {
    id: preset.id,
    revision: preset.revision,
    catalogRelease: preset.catalogRelease,
    compilerVersion: preset.compilerVersion,
  }
}

export function createEditorDraft(family: StyleFamily): EditorDraft {
  return {
    storageVersion: 1,
    recipe: validateRecipe({
      schemaVersion: '1.0',
      id: 'button_recipe',
      revision: 1,
      component: 'button',
      presetRef: presetRefFor(family),
      props: { variant: 'default', size: 'default', type: 'button', disabled: false, loading: false },
      content: 'Save changes',
      overrides: {},
    }),
  }
}

export function updateDraftRecipe(draft: EditorDraft, recipe: unknown): EditorDraft {
  const validated = validateRecipe(recipe)
  validated.id = draft.recipe.id
  validated.revision = draft.recipe.revision
  resolveRecipePreset(validated.presetRef)
  return { storageVersion: draft.storageVersion, recipe: validated }
}

export function changeDraftFamily(draft: EditorDraft, family: StyleFamily): EditorDraft {
  return updateDraftRecipe(draft, { ...draft.recipe, presetRef: presetRefFor(family) })
}

/**
 * Puts the content, props and style overrides back to the starting recipe's
 * content and props with no overrides, so the family's own values apply. The
 * style family, recipe id and revision stay.
 */
export function resetDraftRecipe(draft: EditorDraft, start: Recipe): EditorDraft {
  return updateDraftRecipe(draft, {
    ...draft.recipe,
    props: structuredClone(start.props),
    content: start.content,
    overrides: {},
  })
}

/** The style family of a pinned built-in preset reference (`builtin-<family>`). */
export function draftFamily(recipe: Recipe): StyleFamily {
  const family = recipe.presetRef.id.replace(/^builtin-/, '')
  if (!isStyleFamily(family)) throw new Error('Unsupported preset reference')
  return family
}

/** Syntax accepted for recipe colors; the contract also checks OKLCH bounds. */
export const RECIPE_COLOR_PATTERN = /^(?:#[0-9A-Fa-f]{6}|oklch\([0-9.]+%? [0-9.]+ [0-9.]+(?: \/ [0-9.]+%?)?\))$/

/**
 * The color a Button role shows in a mode: the recipe override, or the preset
 * token the selected variant reads for that role.
 */
export function recipeColor(recipe: Recipe, mode: RecipeColorMode, role: RecipeColorRole): { value: string; overridden: boolean } {
  const override = recipe.overrides.colors?.[mode]?.[role]
  if (override !== undefined) return { value: override, overridden: true }
  const token = recipeColorTokens[recipe.props.variant ?? 'default'][role]
  return { value: resolveRecipePreset(recipe.presetRef).modes[mode][token] ?? '', overridden: false }
}

/** Sets (or, with undefined, clears) one color override, dropping empty groups. */
export function withRecipeColor(recipe: Recipe, mode: RecipeColorMode, role: RecipeColorRole, value: string | undefined): Recipe {
  const colors: NonNullable<Recipe['overrides']['colors']> = { ...recipe.overrides.colors }
  const modeColors: Partial<Record<RecipeColorRole, string>> = { ...colors[mode] }
  if (value === undefined) delete modeColors[role]
  else modeColors[role] = value
  if (Object.keys(modeColors).length) colors[mode] = modeColors
  else delete colors[mode]
  const overrides = { ...recipe.overrides }
  if (Object.keys(colors).length) overrides.colors = colors
  else delete overrides.colors
  return { ...recipe, overrides }
}

/** The experimental notice shown beside the Button export and CLI command. */
export function experimentalNotice(family: StyleFamily): string | null {
  return styleSupport('button', family) === 'experimental'
    ? `${family} is experimental for button; see docs/components/liquid-glass.md for limitations`
    : null
}
