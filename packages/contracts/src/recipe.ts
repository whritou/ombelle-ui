import Ajv2020 from 'ajv/dist/2020.js'
import type { FromSchema } from 'json-schema-to-ts'
import { recipeSchema } from './recipe-schema.js'
import { FoundationError } from './diagnostics.js'
import { assertColorValue } from './validate.js'
import type { Preset } from './types.js'
export type Recipe = FromSchema<typeof recipeSchema>
export type RecipeButtonVariant = NonNullable<Recipe['props']['variant']>
export type RecipeColorMode = 'light' | 'dark'
export type RecipeColorRole = 'background' | 'foreground' | 'border'
export const recipeColorModes = ['light', 'dark'] as const
export const recipeColorRoles = ['background', 'foreground', 'border'] as const
/** Interaction states a recipe can recolor; `pressed` is the CSS :active state. */
export type RecipeColorState = 'hover' | 'pressed'
export const recipeColorStates = ['hover', 'pressed'] as const
/** Every key of one mode's color overrides: the base roles and each state's roles. */
export type RecipeColorKey = keyof NonNullable<
  NonNullable<Recipe['overrides']['colors']>['light']
>
export const recipeStateColorKey = (
  state: RecipeColorState,
  role: RecipeColorRole,
): RecipeColorKey =>
  (state + role[0].toUpperCase() + role.slice(1)) as RecipeColorKey
export const recipeColorKeys: readonly RecipeColorKey[] = [
  ...recipeColorRoles,
  ...recipeColorStates.flatMap((state) =>
    recipeColorRoles.map((role) => recipeStateColorKey(state, role)),
  ),
]
export type RecipeIcon = NonNullable<Recipe['icon']>
export type RecipeIconName = RecipeIcon['name']
/**
 * The reviewed icon set and the lucide-react export each name renders. The
 * recipe schema enum lists the same names; installed recipes that use an icon
 * add the catalog's pinned lucide-react dependency.
 */
export const recipeIcons: Record<RecipeIconName, string> = {
  'arrow-left': 'ArrowLeft',
  'arrow-right': 'ArrowRight',
  check: 'Check',
  'chevron-right': 'ChevronRight',
  download: 'Download',
  'external-link': 'ExternalLink',
  plus: 'Plus',
  search: 'Search',
  send: 'Send',
  settings: 'Settings',
  trash: 'Trash',
  upload: 'Upload',
}
/**
 * The preset color token each recipe color override replaces, by variant.
 * Overrides are written into the scoped light/dark token blocks, so hover and
 * active rules derived from these tokens (for example color-mix on --primary)
 * follow them in both modes. Because families paint ghost/link backgrounds
 * transparent, link text from different tokens and borders from --border,
 * --input or the variant color, the compiler also paints each overridden role
 * on the selected variant from its mapped token: outline/ghost/link `background`,
 * outline/link `color`, and `border-color` for every variant. Once a role is painted,
 * a mode without its own override shows that mode's preset token. Outline and
 * ghost hover/active states keep the family's --accent colors. Liquid glass is
 * one ink: it paints every label from `foreground` and the secondary surface from
 * `card`, so there a mode without its own override keeps that mode's
 * `foreground` (and, for secondary, `card`).
 * Glass outline and ghost `background` overrides replace the colour of the
 * glass surface rather than painting an opaque token over it.
 * A mode without its own override keeps background glass for outline and
 * no surface at rest for ghost.
 */
export const recipeColorTokens: Record<
  RecipeButtonVariant,
  Record<RecipeColorRole, keyof Preset['modes']['light']>
> = {
  default: { background: 'primary', foreground: 'primaryForeground', border: 'border' },
  secondary: { background: 'secondary', foreground: 'secondaryForeground', border: 'border' },
  destructive: { background: 'destructive', foreground: 'destructiveForeground', border: 'border' },
  // Outline buttons sit on a card surface in the kits; families that draw them
  // transparent or from --background still show overrides, painted below.
  outline: { background: 'card', foreground: 'cardForeground', border: 'border' },
  ghost: { background: 'background', foreground: 'foreground', border: 'border' },
  link: { background: 'background', foreground: 'foreground', border: 'border' },
}
export type NormalizedRecipe = Omit<Recipe, 'props' | 'icon'> & {
  props: Required<Recipe['props']>
  icon?: Required<RecipeIcon>
}
/**
 * Expands a validated recipe's defaults: props from the preset's Button
 * defaults, and icon position and mode only when an icon is set, so recipes
 * without one keep their normalized bytes and hash.
 */
export function normalizeRecipe(
  raw: Recipe,
  buttonDefaults?: { variant?: RecipeButtonVariant; size?: Recipe['props']['size'] },
): NormalizedRecipe {
  const { icon, ...rest } = raw
  return {
    ...rest,
    ...(icon ? { icon: { position: 'start', iconOnly: false, ...icon } } : {}),
    props: {
      variant: buttonDefaults?.variant ?? 'default',
      size: buttonDefaults?.size ?? 'default',
      type: 'button',
      disabled: false,
      loading: false,
      ...raw.props,
    },
  }
}
const check = new Ajv2020({ allErrors: true, strict: true }).compile(
  recipeSchema,
)
export function validateRecipe(input: unknown): Recipe {
  if (!check(input)) {
    const e = check.errors![0]
    const suffix =
      e.keyword === 'additionalProperties'
        ? '/' + e.params.additionalProperty
        : e.keyword === 'required'
          ? '/' + e.params.missingProperty
          : ''
    throw new FoundationError(
      'INVALID_DATA',
      e.message ?? 'Invalid recipe',
      e.instancePath + suffix,
    )
  }
  const recipe = input as Recipe
  for (const [pointer, n] of [
    ['/revision', recipe.revision],
    ['/presetRef/revision', recipe.presetRef.revision],
  ] as const)
    if (!Number.isSafeInteger(n))
      throw new FoundationError(
        'INVALID_DATA',
        'Revision must be a safe integer',
        pointer,
      )
  const colors = recipe.overrides.colors
  if (colors)
    for (const mode of recipeColorModes)
      for (const key of recipeColorKeys) {
        const value = colors[mode]?.[key]
        if (value !== undefined)
          assertColorValue(value, `/overrides/colors/${mode}/${key}`)
      }
  if (recipe.icon?.iconOnly && recipe.content.trim() === '')
    throw new FoundationError(
      'INVALID_DATA',
      'An icon-only Button needs content to use as its accessible label',
      '/content',
    )
  return structuredClone(recipe)
}
