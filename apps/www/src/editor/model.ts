import { getCatalog, resolveRecipePreset } from '@ombelle/catalog'
import {
  isStyleFamily, recipeColorRoles, recipeColorTokens, styleSupport, validateRecipe,
  type Recipe, type RecipeButtonVariant, type RecipeColorKey, type RecipeColorMode, type RecipeColorRole, type RecipeIcon, type StyleFamily,
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
  const { icon: _icon, ...recipe } = draft.recipe
  return updateDraftRecipe(draft, {
    ...recipe,
    props: structuredClone(start.props),
    content: start.content,
    ...(start.icon ? { icon: structuredClone(start.icon) } : {}),
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

/** The base role a hover or pressed color key recolors. */
export function baseColorRole(key: RecipeColorKey): RecipeColorRole {
  return recipeColorRoles.find((role) => key.toLowerCase().endsWith(role)) ?? 'background'
}

/**
 * The color a Button role shows in a mode: the recipe override, or the preset
 * token the selected variant reads for that role. A hover or pressed key with no
 * override shows its base role's color; the family then applies its own state color.
 */
export function recipeColor(recipe: Recipe, mode: RecipeColorMode, key: RecipeColorKey): { value: string; overridden: boolean } {
  const override = recipe.overrides.colors?.[mode]?.[key]
  if (override !== undefined) return { value: override, overridden: true }
  const role = baseColorRole(key)
  if (role !== key) return { value: recipeColor(recipe, mode, role).value, overridden: false }
  const variant = recipe.props.variant ?? 'default'
  const preset = resolveRecipePreset(recipe.presetRef)
  const token = preset.styleFamily === 'liquid-glass' ? glassColorToken(variant, role) : recipeColorTokens[variant][role]
  return { value: preset.modes[mode][token] ?? '', overridden: false }
}

/**
 * The token one-ink glass renders for a role: every label is `foreground`, secondary is
 * card glass and outline is background glass. Default and destructive show their tint.
 */
function glassColorToken(variant: RecipeButtonVariant, role: RecipeColorRole) {
  if (role === 'foreground') return 'foreground'
  if (role === 'background' && variant === 'secondary') return 'card'
  if (role === 'background' && variant === 'outline') return 'background'
  return recipeColorTokens[variant][role]
}

/** Sets (or, with undefined, clears) one color override, dropping empty groups. */
export function withRecipeColor(recipe: Recipe, mode: RecipeColorMode, key: RecipeColorKey, value: string | undefined): Recipe {
  const colors: NonNullable<Recipe['overrides']['colors']> = { ...recipe.overrides.colors }
  const modeColors: Partial<Record<RecipeColorKey, string>> = { ...colors[mode] }
  if (value === undefined) delete modeColors[key]
  else modeColors[key] = value
  if (Object.keys(modeColors).length) colors[mode] = modeColors
  else delete colors[mode]
  const overrides = { ...recipe.overrides }
  if (Object.keys(colors).length) overrides.colors = colors
  else delete overrides.colors
  return { ...recipe, overrides }
}

/** Sets one style override, or removes it with undefined so the family value applies. */
export function withRecipeOverride<K extends Exclude<keyof Recipe['overrides'], 'colors'>>(
  recipe: Recipe, key: K, value: Recipe['overrides'][K] | undefined,
): Recipe {
  const overrides = { ...recipe.overrides }
  if (value === undefined) delete overrides[key]
  else overrides[key] = value
  return { ...recipe, overrides }
}

/**
 * Sets the icon, or removes it with undefined. Position and icon-only mode are
 * always written out, as the compiler normalizes them.
 */
export function withRecipeIcon(recipe: Recipe, icon: Partial<RecipeIcon> | undefined): Recipe {
  const next = { ...recipe }
  if (icon === undefined || icon.name === undefined) {
    delete next.icon
    return next
  }
  next.icon = { name: icon.name, position: icon.position ?? 'start', iconOnly: icon.iconOnly ?? false }
  return next
}

/** The experimental notice shown beside the Button export and CLI command. */
export function experimentalNotice(family: StyleFamily): string | null {
  return styleSupport('button', family) === 'experimental'
    ? `${family} is experimental for button; see docs/components/liquid-glass.md for limitations`
    : null
}
