import { canonicalize, compileComponentRecipe } from '@ombelle/compiler'
import { colorDimensions, hexFromComputedColor, measuredColorPattern, type ColorDimension } from './measured-color'
import {
  componentRecipeParts, validateComponentRecipe,
  type ComponentRecipe, type ComponentRecipeCompileResult, type ComponentRecipePart,
} from '@ombelle/contracts'

export type PartDimension = Exclude<keyof ComponentRecipePart, 'colors'>
/** One part's rendered dimensions, in the units the recipe stores, and its computed colours in hex. */
export type MeasuredPart = Partial<Record<PartDimension, number>> & Partial<Record<ColorDimension, string>>
/** The rendered value of each part, keyed by slot. */
export type MeasuredParts = Record<string, MeasuredPart>
export type CatalogPreviewMeasure = { type: 'catalog-measure'; requestId: number; parts: MeasuredParts }

const partDimensions: readonly PartDimension[] = [
  'paddingXPx', 'paddingYPx', 'gapPx', 'minHeightPx', 'radiusRem', 'borderWidthPx',
  'shadowOffsetXPx', 'shadowOffsetYPx', 'fontSizePx', 'fontWeight', 'letterSpacingEm',
]

/** One measured value: a finite number for a dimension, an uppercase hex for a colour. */
function acceptValue(key: string, value: unknown): boolean {
  if (partDimensions.includes(key as PartDimension)) return typeof value === 'number' && Number.isFinite(value)
  if (colorDimensions.includes(key as ColorDimension)) return typeof value === 'string' && measuredColorPattern.test(value)
  return false
}

const px = (text: string) => {
  const value = parseFloat(text)
  return Number.isFinite(value) ? value : 0
}

/** The first box-shadow's offsets, ignoring its colour. 'none' draws no offset. */
function shadowOffsets(style: CSSStyleDeclaration): [number, number] {
  const x = style.getPropertyValue('--shadow-x').trim()
  const y = style.getPropertyValue('--shadow-y').trim()
  if (x || y) return [px(x), px(y)]
  const first = style.boxShadow.replace(/[a-z-]+\([^)]*\)/gi, '').split(',')[0] ?? ''
  const lengths = first.match(/-?[\d.]+px/g) ?? []
  return [px(lengths[0] ?? '0'), px(lengths[1] ?? '0')]
}

/** Reads each part's computed style in the preview so the editor can show the preset's values. */
export function measureCatalogParts(root: ParentNode, component: ComponentRecipe['component']): MeasuredParts {
  const parts: MeasuredParts = {}
  for (const part of componentRecipeParts[component]) {
    const element = root.querySelector(`[data-slot="recipe-${part.slot}"]`)
    if (element) parts[part.slot] = measurePart(element)
  }
  return parts
}

/** A computed colour in hex, through a 1 × 1 canvas for syntaxes other than sRGB. */
function measuredHex(value: string): string | undefined {
  const parsed = hexFromComputedColor(value)
  if (parsed) return parsed
  const context = document.createElement('canvas').getContext('2d', { willReadFrequently: true })
  if (!context) return undefined
  context.clearRect(0, 0, 1, 1)
  context.fillStyle = value
  context.fillRect(0, 0, 1, 1)
  const [red, green, blue, alpha] = context.getImageData(0, 0, 1, 1).data
  return hexFromComputedColor(`rgba(${red}, ${green}, ${blue}, ${alpha! / 255})`) ?? undefined
}

/** One rendered element's dimensions, in the units the recipe stores, and its colours in hex. */
export function measurePart(element: Element): MeasuredPart {
  const rem = px(getComputedStyle(document.documentElement).fontSize) || 16
  const style = getComputedStyle(element)
  const fontSize = px(style.fontSize)
  const [shadowX, shadowY] = shadowOffsets(style)
  const values: MeasuredPart = {
    paddingXPx: px(style.paddingInlineStart || style.paddingLeft),
    paddingYPx: px(style.paddingBlockStart || style.paddingTop),
    gapPx: px(style.columnGap) || px(style.rowGap),
    minHeightPx: px(style.minHeight),
    borderWidthPx: style.borderTopStyle === 'none' ? 0 : px(style.borderTopWidth),
    shadowOffsetXPx: shadowX,
    shadowOffsetYPx: shadowY,
    fontSizePx: fontSize,
    fontWeight: px(style.fontWeight),
    letterSpacingEm: style.letterSpacing === 'normal' || !fontSize ? 0 : px(style.letterSpacing) / fontSize,
  }
  // A percentage radius has no rem equivalent.
  if (!style.borderTopLeftRadius.includes('%')) values.radiusRem = px(style.borderTopLeftRadius) / rem
  const colors: Record<ColorDimension, string> = { backgroundColor: style.backgroundColor, color: style.color, borderColor: style.borderTopColor }
  for (const key of colorDimensions) {
    const hex = measuredHex(colors[key])
    if (hex) values[key] = hex
  }
  return values
}

/** The Button preview reports its specimen under the 'button' slot, in the catalog measure shape. */
export function acceptButtonMeasure(input: unknown): { requestId: number; values: MeasuredPart } | null {
  if (!record(input) || input.type !== 'catalog-measure' || Object.keys(input).length !== 3 ||
    typeof input.requestId !== 'number' || !Number.isSafeInteger(input.requestId) || input.requestId <= 0 ||
    !record(input.parts) || Object.keys(input.parts).length !== 1 || !record(input.parts.button)) return null
  const values: MeasuredPart = {}
  for (const [key, value] of Object.entries(input.parts.button)) {
    if (!acceptValue(key, value)) return null
    ;(values as Record<string, unknown>)[key] = value
  }
  return { requestId: input.requestId, values }
}

export function acceptCatalogMeasure(input: unknown, component: ComponentRecipe['component']): CatalogPreviewMeasure | null {
  if (!record(input) || input.type !== 'catalog-measure' || Object.keys(input).length !== 3 ||
    typeof input.requestId !== 'number' || !Number.isSafeInteger(input.requestId) || input.requestId <= 0 ||
    !record(input.parts)) return null
  const slots = new Set(componentRecipeParts[component].map(part => part.slot))
  const parts: MeasuredParts = {}
  for (const [slot, values] of Object.entries(input.parts)) {
    if (!slots.has(slot) || !record(values)) return null
    const accepted: MeasuredPart = {}
    for (const [key, value] of Object.entries(values)) {
      if (!acceptValue(key, value)) return null
      ;(accepted as Record<string, unknown>)[key] = value
    }
    parts[slot] = accepted
  }
  return { type: 'catalog-measure', requestId: input.requestId, parts }
}

export type CatalogPreviewRender = {
  type: 'catalog-render'
  component: ComponentRecipe['component']
  requestId: number
  result: ComponentRecipeCompileResult
  mode: 'light' | 'dark'
  viewport: 'wide' | 'narrow'
  /** Simulates prefers-reduced-transparency in the preview; sent only when on. */
  reducedTransparency?: true
}

function record(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === 'object' && !Array.isArray(value)
}

export async function verifyCatalogCompileResult(input: unknown, component: ComponentRecipe['component']): Promise<ComponentRecipeCompileResult | null> {
  if (!record(input) || !record(input.recipe)) return null
  try {
    const recipe = validateComponentRecipe(input.recipe.data)
    if (recipe.component !== component || input.darkSelector !== '.dark') return null
    const expected = await compileComponentRecipe({ recipe })
    return canonicalize(expected) === canonicalize(input) ? expected : null
  } catch {
    return null
  }
}

export async function verifyCatalogPreviewRender(input: unknown, activeComponent: ComponentRecipe['component'], previousRequestId: number): Promise<CatalogPreviewRender | null> {
  if (!record(input) || input.type !== 'catalog-render' || input.component !== activeComponent ||
    Object.keys(input).length !== (Object.hasOwn(input, 'reducedTransparency') ? 7 : 6) ||
    (Object.hasOwn(input, 'reducedTransparency') && input.reducedTransparency !== true) ||
    typeof input.requestId !== 'number' || !Number.isSafeInteger(input.requestId) || input.requestId <= previousRequestId ||
    (input.mode !== 'light' && input.mode !== 'dark') || (input.viewport !== 'wide' && input.viewport !== 'narrow')) return null
  const result = await verifyCatalogCompileResult(input.result, activeComponent)
  return result ? { type: 'catalog-render', component: activeComponent, requestId: input.requestId,
    mode: input.mode, viewport: input.viewport, result, ...(input.reducedTransparency === true ? { reducedTransparency: true as const } : {}) } : null
}

/** One matrix cell: its axis values and the compile of the recipe with those props. */
export type CatalogMatrixCell = { row: string | number; column: string | number | null; current: boolean; result: ComponentRecipeCompileResult }
export type CatalogMatrixRender = {
  type: 'catalog-matrix-render'
  component: ComponentRecipe['component']
  requestId: number
  rows: string
  columns: string | null
  cells: CatalogMatrixCell[]
  mode: 'light' | 'dark'
  viewport: 'wide' | 'narrow'
  reducedTransparency?: true
}

const axisValue = (value: unknown): value is string | number => typeof value === 'string' || (typeof value === 'number' && Number.isFinite(value))
const exactKeys = (value: Record<string, unknown>, keys: string[]) => Object.keys(value).length === keys.length && keys.every((key) => Object.hasOwn(value, key))

/** The matrix message, with every cell's compile verified as a single render is: 1 to 48 cells, one current. */
export async function verifyCatalogMatrixRender(input: unknown, activeComponent: ComponentRecipe['component'], previousRequestId: number): Promise<CatalogMatrixRender | null> {
  const keys = ['type', 'component', 'requestId', 'rows', 'columns', 'cells', 'mode', 'viewport']
  if (!record(input) || !(exactKeys(input, keys) || (exactKeys(input, [...keys, 'reducedTransparency']) && input.reducedTransparency === true)) ||
    input.type !== 'catalog-matrix-render' || input.component !== activeComponent ||
    typeof input.requestId !== 'number' || !Number.isSafeInteger(input.requestId) || input.requestId <= previousRequestId ||
    typeof input.rows !== 'string' || (input.columns !== null && typeof input.columns !== 'string') ||
    (input.mode !== 'light' && input.mode !== 'dark') || (input.viewport !== 'wide' && input.viewport !== 'narrow') ||
    !Array.isArray(input.cells) || input.cells.length < 1 || input.cells.length > 48) return null
  const cells: CatalogMatrixCell[] = []
  for (const cell of input.cells as unknown[]) {
    if (!record(cell) || !exactKeys(cell, ['row', 'column', 'current', 'result']) || !axisValue(cell.row) ||
      (cell.column !== null && !axisValue(cell.column)) || typeof cell.current !== 'boolean') return null
    const result = await verifyCatalogCompileResult(cell.result, activeComponent)
    if (!result) return null
    cells.push({ row: cell.row, column: cell.column as string | number | null, current: cell.current, result })
  }
  if (cells.filter((cell) => cell.current).length !== 1) return null
  return { type: 'catalog-matrix-render', component: activeComponent, requestId: input.requestId, rows: input.rows, columns: input.columns as string | null,
    cells, mode: input.mode, viewport: input.viewport, ...(input.reducedTransparency === true ? { reducedTransparency: true as const } : {}) }
}
