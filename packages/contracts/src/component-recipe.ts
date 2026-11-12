import Ajv2020 from 'ajv/dist/2020.js'
import type { FromSchema } from 'json-schema-to-ts'
import { componentRecipeSchema } from './component-recipe-schema.js'
import { componentRecipeParts } from './component-recipe-appearance.js'
import { FoundationError } from './diagnostics.js'
import { validateRecipe, type Recipe } from './recipe.js'
import { assertColorValue } from './validate.js'

export type ComponentRecipe = FromSchema<typeof componentRecipeSchema>
export type InstallableRecipe = Recipe | ComponentRecipe
export type ComponentRecipeId = ComponentRecipe['component']

export type RecipeField = {
  title?: string
  type?: 'string' | 'boolean' | 'integer' | 'array' | 'object'
  default?: unknown
  enum?: readonly (string | number)[]
  minimum?: number
  maximum?: number
  maxLength?: number
  minItems?: number
  maxItems?: number
  properties?: Readonly<Record<string, RecipeField>>
  items?: RecipeField
}

export const componentRecipeComponents = componentRecipeSchema.oneOf.map(branch => branch.properties.component.const)
export function componentRecipeFields(component: ComponentRecipeId): {
  props: Readonly<Record<string, RecipeField>>
  content: Readonly<Record<string, RecipeField>>
} {
  const branch = componentRecipeSchema.oneOf.find(item => item.properties.component.const === component)!
  return { props: branch.properties.props.properties, content: branch.properties.content.properties }
}

export function defaultRecipeFields(fields: Readonly<Record<string, RecipeField>>): Record<string, unknown> {
  return Object.fromEntries(Object.entries(fields).filter(([, field]) => field.default !== undefined)
    .map(([key, field]) => [key, structuredClone(field.default)]))
}

const check = new Ajv2020({ allErrors: true, strict: true }).compile(componentRecipeSchema)

export function validateComponentRecipe(input: unknown): ComponentRecipe {
  if (!check(input)) {
    const component = input && typeof input === 'object' && 'component' in input ? input.component : null
    const index = componentRecipeComponents.findIndex(id => id === component)
    const error = check.errors!.find(issue => issue.instancePath.startsWith('/appearance')) ??
      check.errors!.find(issue => issue.schemaPath.startsWith(`#/oneOf/${index}/`)) ?? check.errors![0]
    const field = error.keyword === 'additionalProperties' ? error.params.additionalProperty
      : error.keyword === 'required' ? error.params.missingProperty : undefined
    throw new FoundationError('INVALID_DATA', error.message ?? 'Invalid component recipe',
      error.instancePath + (field ? '/' + field : ''))
  }
  const recipe = structuredClone(input as ComponentRecipe)
  Object.assign(recipe, { props: { ...defaultRecipeFields(componentRecipeFields(recipe.component).props), ...recipe.props } })
  validateComposition(recipe)
  for (const [slot, part] of Object.entries(recipe.appearance?.parts ?? {})) {
    const path = '/appearance/parts/' + slot
    if (!componentRecipeParts[recipe.component].some(candidate => candidate.slot === slot))
      throw new FoundationError('INVALID_DATA', 'This part does not belong to the component', path)
    for (const [mode, colors] of Object.entries(part.colors ?? {}))
      for (const [role, value] of Object.entries(colors))
        assertColorValue(value, path + '/colors/' + mode + '/' + role)
  }
  if (new TextEncoder().encode(JSON.stringify(recipe)).byteLength > 65_536)
    throw new FoundationError('INVALID_DATA', 'Recipe exceeds 64 KiB', '/')
  return recipe
}

function validateComposition(recipe: ComponentRecipe): void {
  const reject = (message: string, path: string) => { throw new FoundationError('INVALID_DATA', message, path) }
  function references(items: readonly { id: string }[], selected: readonly string[], path: string) {
    const ids = new Set(items.map(item => item.id))
    if (ids.size !== items.length) reject('Item IDs must be unique', '/content')
    if (selected.some(id => !ids.has(id))) reject('Choose an item present in the recipe', path)
  }
  switch (recipe.component) {
    case 'toggle':
      if (recipe.content.label.trim() === '')
        reject(recipe.props.iconOnly ? 'An icon-only toggle needs a label for its accessible name' : 'A toggle needs a label', '/content/label')
      break
    case 'button-group':
      if (recipe.content.label.trim() === '') reject('Name the button group', '/content/label')
      if ((recipe.props.mode ?? 'split') === 'split' && recipe.content.items.length < 2)
        reject('A split button group needs at least two items', '/content/items')
      break
    case 'scroll-area':
      if (recipe.content.label.trim() === '') reject('Name the scroll area', '/content/label')
      break
    case 'slider': {
      const { min = 0, max = 100, value = 12, mode = 'single', rangeStart = 20, rangeEnd = 80 } = recipe.props
      if (min >= max) reject('Maximum must be greater than minimum', '/props/max')
      if (mode === 'single' && (value < min || value > max)) reject('Value must be within the range', '/props/value')
      if (mode === 'range') {
        if (rangeStart < min || rangeStart > max) reject('Range start must be within the range', '/props/rangeStart')
        if (rangeEnd < min || rangeEnd > max) reject('Range end must be within the range', '/props/rangeEnd')
        if (rangeStart > rangeEnd) reject('Range start must not exceed range end', '/props/rangeStart')
      }
      break
    }
    case 'toggle-group':
      references(recipe.content.items, recipe.props.selection ?? [], '/props/selection')
      if ((recipe.props.type ?? 'single') === 'single' && (recipe.props.selection ?? []).length > 1)
        reject('A single-choice group selects one item', '/props/selection')
      break
    case 'chip':
      references(recipe.content.chips, recipe.props.selection ?? [], '/props/selection')
      break
    case 'tag-input':
      if (recipe.content.tags.length > (recipe.props.max ?? 8)) reject('Starting tags exceed the maximum', '/content/tags')
      references(recipe.content.tags, [], '/content/tags')
      break
    case 'input-otp':
      if ((recipe.props.separatorAfter ?? 3) >= (recipe.props.length ?? 6))
        reject('Place the separator before the last slot', '/props/separatorAfter')
      break
    case 'combobox':
      references(recipe.content.items, recipe.props.selection ?? [], '/props/selection')
      if ((recipe.props.mode ?? 'single') === 'single' && (recipe.props.selection ?? []).length > 1)
        reject('A single combobox selects one item', '/props/selection')
      break
    case 'command':
      if (recipe.content.groups.some(group => group.items.length === 0)) reject('Every group needs a command', '/content/groups')
      break
    case 'context-menu': {
      const { items } = recipe.content
      if (!items.some(item => item.kind !== 'separator')) reject('A menu needs an item', '/content/items')
      if (items[0]?.kind === 'separator' || items.at(-1)?.kind === 'separator')
        reject('A menu cannot start or end with a separator', '/content/items')
      references(items, [], '/content/items')
      break
    }
    case 'calendar': {
      // A real calendar date: 2026-02-30 matches the pattern but is not a day.
      const real = (text: string) => {
        const [year, month, day] = text.split('-').map(Number)
        const date = new Date(Date.UTC(year!, month! - 1, day!))
        return date.getUTCFullYear() === year && date.getUTCMonth() === month! - 1 && date.getUTCDate() === day
      }
      const { mode = 'single', selectedFrom = '2026-11-12', selectedTo } = recipe.props
      if (!real(selectedFrom)) reject('Choose a real date', '/props/selectedFrom')
      if (selectedTo !== undefined) {
        if (mode !== 'range') reject('Only a range has an end date', '/props/selectedTo')
        if (!real(selectedTo)) reject('Choose a real date', '/props/selectedTo')
        if (selectedTo < selectedFrom) reject('The range must not end before it starts', '/props/selectedTo')
      }
      break
    }
    case 'stepper':
      if (recipe.props.current !== undefined && recipe.props.current >= recipe.content.steps.length)
        reject('Choose a step present in the recipe', '/props/current')
      break
    case 'toast':
      if (recipe.content.action && !recipe.content.actionAltText.trim())
        reject('Toast actions require an alternative description', '/content/actionAltText')
      break
    case 'pagination':
      if (recipe.props.page > recipe.props.totalPages)
        reject('Current page must not exceed total pages', '/props/page')
      break
    case 'breadcrumb':
      references(recipe.content.items, [], '/content/items')
      if (recipe.content.items.slice(0, -1).some(item => !item.href))
        reject('Ancestor pages require a link', '/content/items')
      break
    case 'progress':
      if (!recipe.props.indeterminate && recipe.props.value > recipe.props.max)
        reject('Progress cannot exceed its maximum', '/props/value')
      break
    case 'native-select':
    case 'radio-group':
    case 'select':
      references(recipe.content.options, recipe.props.selection ? [recipe.props.selection] : [], '/props/selection')
      break
    case 'tabs':
      references(recipe.content.items, [recipe.props.selection], '/props/selection')
      break
    case 'accordion':
      references(recipe.content.items, recipe.props.expanded, '/props/expanded')
      if (recipe.props.type === 'single' && recipe.props.expanded.length > 1)
        reject('Single expansion accepts at most one item', '/props/expanded')
      break
    case 'dropdown-menu':
      references(recipe.content.items, [], '/content/items')
      break
    case 'table':
      references(recipe.content.columns, recipe.props.numeric, '/props/numeric')
      references(recipe.content.rows, [], '/content/rows')
      if (recipe.content.rows.some(row => row.cells.length !== recipe.content.columns.length))
        reject('Every row must have one cell per column', '/content/rows')
      break
  }
}

export function validateInstallableRecipe(input: unknown): InstallableRecipe {
  const version = input && typeof input === 'object' && 'schemaVersion' in input
    ? input.schemaVersion : undefined
  if (version === '2.0') return validateComponentRecipe(input)
  if (typeof version === 'string' && version !== '1.0')
    throw new FoundationError('UNSUPPORTED_RELEASE', 'Unsupported recipe schema version', '/schemaVersion')
  return validateRecipe(input)
}
