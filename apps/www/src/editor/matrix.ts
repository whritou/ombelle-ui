import { componentRecipeFields, type ComponentRecipe, type Recipe } from '@ombelle/contracts'

export type MatrixComponent = ComponentRecipe['component'] | 'button'
export type MatrixAxis = { prop: string; values: readonly (string | number)[] }
export type MatrixCell<R> = { row: string | number; column: string | number | null; recipe: R; current: boolean }

/** The most cells one matrix renders: each is its own compile and specimen. */
export const matrixCellLimit = 48
/** The Button's extra row: its current variant and size in each forced state. */
export const buttonStateRow = ['hover', 'focus', 'active', 'disabled', 'loading'] as const

// The Button uses its v1 recipe schema; these match its variant and size enums.
const buttonVariants = ['default', 'secondary', 'outline', 'ghost', 'link', 'destructive', 'link-destructive'] as const satisfies readonly NonNullable<Recipe['props']['variant']>[]
const buttonSizes = ['sm', 'default', 'lg', 'icon'] as const satisfies readonly NonNullable<Recipe['props']['size']>[]
const buttonDefaults: Record<string, string> = { variant: 'default', size: 'default' }

/** Every enum prop of the component, in schema order: the axes a matrix can use. */
export function matrixEnums(component: MatrixComponent): MatrixAxis[] {
  if (component === 'button') return [{ prop: 'variant', values: buttonVariants }, { prop: 'size', values: buttonSizes }]
  return Object.entries(componentRecipeFields(component).props)
    .filter(([, field]) => field.enum?.length)
    .map(([prop, field]) => ({ prop, values: field.enum! }))
}

/** Rows: variant, else the first enum. Columns: size, else appearance, else the second enum. */
export function matrixAxes(component: MatrixComponent): { rows: MatrixAxis; columns: MatrixAxis | null } | null {
  const enums = matrixEnums(component)
  if (!enums.length) return null
  const rows = enums.find((axis) => axis.prop === 'variant') ?? enums[0]!
  const rest = enums.filter((axis) => axis !== rows)
  const columns = rest.find((axis) => axis.prop === 'size') ?? rest.find((axis) => axis.prop === 'appearance') ?? rest[0] ?? null
  return { rows, columns }
}

/**
 * The axes the reader chose, by prop name: rows (null for the default), columns (undefined for
 * the default, null for none). Columns never repeat the rows axis.
 */
export function resolveMatrixAxes(enums: MatrixAxis[], defaults: ReturnType<typeof matrixAxes>, rowsProp: string | null, columnsProp: string | null | undefined): { rows: MatrixAxis | null; columns: MatrixAxis | null } {
  const byProp = (prop: string | undefined) => enums.find((axis) => axis.prop === prop)
  const rows = byProp(rowsProp ?? undefined) ?? byProp(defaults?.rows.prop) ?? null
  if (columnsProp === null) return { rows, columns: null }
  const chosen = columnsProp === undefined ? undefined : byProp(columnsProp)
  const fallback = enums.find((axis) => axis.prop !== rows?.prop && axis.prop === defaults?.columns?.prop)
    ?? enums.find((axis) => axis.prop !== rows?.prop && (axis.prop === 'size' || axis.prop === 'appearance'))
    ?? enums.find((axis) => axis.prop !== rows?.prop) ?? null
  return { rows, columns: chosen && chosen.prop !== rows?.prop ? chosen : fallback }
}

/** A prop as the inspector shows it: the recipe's value, else the schema default, else the first allowed value. */
export function propValue(recipe: { props: Record<string, unknown> }, prop: string, component: MatrixComponent): string | number {
  const value = recipe.props[prop]
  if (typeof value === 'string' || typeof value === 'number') return value
  if (component === 'button') return buttonDefaults[prop] ?? ''
  const field = componentRecipeFields(component).props[prop]
  return (field?.default as string | number | undefined) ?? field?.enum?.[0] ?? ''
}

/**
 * One recipe per cell, in row order: the current recipe with every edit kept and only the
 * two axis props set. Stops at the cell limit; total says how many the axes make.
 */
export function matrixCells<R extends { props: Record<string, unknown> }>(recipe: R, rows: MatrixAxis, columns: MatrixAxis | null, component: MatrixComponent): { cells: MatrixCell<R>[]; total: number } {
  const columnValues: readonly (string | number | null)[] = columns ? columns.values : [null]
  const currentRow = propValue(recipe, rows.prop, component)
  const currentColumn = columns ? propValue(recipe, columns.prop, component) : null
  const cells: MatrixCell<R>[] = []
  for (const row of rows.values) for (const column of columnValues) {
    if (cells.length === matrixCellLimit) break
    const props = { ...recipe.props, [rows.prop]: row, ...(columns && column !== null ? { [columns.prop]: column } : {}) }
    cells.push({ row, column, recipe: { ...recipe, props }, current: row === currentRow && column === currentColumn })
  }
  // Past the cap, the inspector's own cell still shows: it takes the last place.
  const total = rows.values.length * columnValues.length
  if (total > matrixCellLimit && !cells.some((cell) => cell.current) && rows.values.includes(currentRow) && columnValues.includes(currentColumn)) {
    const props = { ...recipe.props, [rows.prop]: currentRow, ...(columns && currentColumn !== null ? { [columns.prop]: currentColumn } : {}) }
    cells[cells.length - 1] = { row: currentRow, column: currentColumn, recipe: { ...recipe, props }, current: true }
  }
  return { cells, total }
}
