import { resolveRecipePreset } from '@ombelle/catalog'
import { styleSupport, validatePreset, validateRecipe, type Recipe, type RecipeCompileResult } from '@ombelle/contracts'
import { canonicalize, compileRecipe } from '@ombelle/compiler'

export type PreviewFrameState = {
  recipe: Recipe
  css: string
  mode: 'light' | 'dark'
  viewport: 'wide' | 'narrow'
  forcedState: 'none' | 'hover' | 'focus' | 'active' | 'disabled' | 'loading'
  requestId: number
  /** Simulates prefers-reduced-transparency in the preview; sent only when on. */
  reducedTransparency?: true
}

export type PreviewRender = { type: 'render'; requestId: number; scope: string; state: PreviewFrameState }
export type PreviewAck = { type: 'render-ack'; requestId: number; status: 'applied' | 'rejected' }

function record(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function exactKeys(value: Record<string, unknown>, keys: string[]): boolean {
  return Object.keys(value).length === keys.length && keys.every((key) => key in value)
}

function requestId(value: unknown): value is number {
  return typeof value === 'number' && Number.isSafeInteger(value) && value > 0
}

function hash(value: unknown): value is string {
  return typeof value === 'string' && /^[a-f0-9]{64}$/.test(value)
}

export function isPreviewReady(input: unknown): boolean {
  return record(input) && exactKeys(input, ['type', 'version']) &&
    input.type === 'ombelle-preview-ready' && input.version === 1
}

export function isPreviewInit(input: unknown): boolean {
  return record(input) && exactKeys(input, ['type', 'version']) &&
    input.type === 'ombelle-preview-init' && input.version === 1
}

export function isPreviewAck(input: unknown): input is PreviewAck {
  return record(input) && exactKeys(input, ['type', 'requestId', 'status']) &&
    input.type === 'render-ack' && requestId(input.requestId) &&
    ['applied', 'rejected'].includes(input.status as string)
}

export function acceptPreviewRender(input: unknown, previousRequestId: number): PreviewRender | null {
  if (!record(input) || !exactKeys(input, ['type', 'requestId', 'scope', 'state']) ||
    input.type !== 'render' || !requestId(input.requestId) ||
    input.requestId <= previousRequestId || !hash(input.scope) || !record(input.state)) return null
  const state = input.state
  const keys = ['recipe', 'css', 'mode', 'viewport', 'forcedState', 'requestId']
  if (!(exactKeys(state, keys) || (exactKeys(state, [...keys, 'reducedTransparency']) && state.reducedTransparency === true)) ||
    state.requestId !== input.requestId || typeof state.css !== 'string' ||
    state.css.length === 0 || state.css.length > 100_000 ||
    !state.css.includes(`[data-ombelle-recipe='${input.scope}']`) ||
    !['light', 'dark'].includes(state.mode as string) ||
    !['wide', 'narrow'].includes(state.viewport as string) ||
    !['none', 'hover', 'focus', 'active', 'disabled', 'loading'].includes(state.forcedState as string)) return null
  try {
    const recipe = validateRecipe(state.recipe)
    const preset = resolveRecipePreset(recipe.presetRef)
    if (styleSupport('button', preset.styleFamily) === 'unavailable') return null
  } catch {
    return null
  }
  return input as PreviewRender
}

export function validatePreviewCompileResult(input: unknown): RecipeCompileResult | null {
  if (!record(input) || !exactKeys(input, ['artifacts', 'dependencies', 'recipe', 'preset', 'scope', 'darkSelector', 'provenance']) ||
    !Array.isArray(input.artifacts) || input.artifacts.length !== 4 ||
    !input.artifacts.every((item: unknown) => record(item) && exactKeys(item, ['logicalPath', 'kind', 'content', 'sha256']) &&
      typeof item.logicalPath === 'string' && typeof item.content === 'string' && hash(item.sha256) &&
      ['component', 'style', 'usage', 'utility'].includes(item.kind as string)) ||
    !Array.isArray(input.dependencies) || !input.dependencies.every((item: unknown) => record(item) &&
      exactKeys(item, ['name', 'version']) && typeof item.name === 'string' && typeof item.version === 'string') ||
    !record(input.recipe) || !exactKeys(input.recipe, ['data', 'hash']) || !hash(input.recipe.hash) ||
    !record(input.preset) || !exactKeys(input.preset, ['data', 'hash']) || !hash(input.preset.hash) ||
    !hash(input.scope) || input.darkSelector !== '.dark' || !record(input.provenance) ||
    !exactKeys(input.provenance, ['catalogRelease', 'compilerVersion']) ||
    input.provenance.catalogRelease !== '0.1.0' || input.provenance.compilerVersion !== '0.1.0') return null
  try {
    const recipe = validateRecipe(input.recipe.data)
    const preset = validatePreset(input.preset.data)
    const builtin = resolveRecipePreset(recipe.presetRef)
    if (Object.keys(recipe.props).length !== 5 ||
      !['variant', 'size', 'type', 'disabled', 'loading'].every((key) => key in recipe.props) ||
      preset.id !== builtin.id || preset.revision !== builtin.revision ||
      recipe.presetRef.catalogRelease !== '0.1.0' || recipe.presetRef.compilerVersion !== '0.1.0' ||
      !['component', 'style', 'usage', 'utility'].every((kind) =>
        (input.artifacts as Array<{ kind: string }>).filter((item) => item.kind === kind).length === 1)) return null
  } catch {
    return null
  }
  return input as RecipeCompileResult
}

export async function verifyPreviewCompileResult(input: unknown): Promise<RecipeCompileResult | null> {
  const result = validatePreviewCompileResult(input)
  if (!result) return null
  try {
    const expected = await compileRecipe({ recipe: result.recipe.data, darkSelector: result.darkSelector })
    return canonicalize(expected) === canonicalize(result) ? result : null
  } catch {
    return null
  }
}

export async function verifyPreviewRender(input: unknown, previousRequestId: number): Promise<PreviewRender | null> {
  const message = acceptPreviewRender(input, previousRequestId)
  if (!message) return null
  try {
    const expected = await compileRecipe({ recipe: message.state.recipe })
    const css = expected.artifacts.find((artifact) => artifact.kind === 'style')?.content
    return message.scope === expected.scope && message.state.css === css &&
      canonicalize(message.state.recipe) === canonicalize(expected.recipe.data) ? message : null
  } catch {
    return null
  }
}

/** One Button matrix cell: its variant and size, and the recipe compiled for them. */
export type ButtonMatrixCell = { row: string; column: string | null; current: boolean; scope: string; css: string; recipe: Recipe }
/** The Button's matrix axes: its variant and size enums. */
const buttonAxes = ['variant', 'size']
export type ButtonMatrixRender = {
  type: 'matrix-render'
  requestId: number
  rows: string
  columns: string | null
  cells: ButtonMatrixCell[]
  /** Whether to add the row of forced states for the current cell. */
  states: boolean
  mode: 'light' | 'dark'
  viewport: 'wide' | 'narrow'
  reducedTransparency?: true
}

/** The Button matrix, each cell recompiled and compared as verifyPreviewRender does: 1 to 48 cells, one current. */
export async function verifyButtonMatrixRender(input: unknown, previousRequestId: number): Promise<ButtonMatrixRender | null> {
  const keys = ['type', 'requestId', 'rows', 'columns', 'cells', 'states', 'mode', 'viewport']
  if (!record(input) || !(exactKeys(input, keys) || (exactKeys(input, [...keys, 'reducedTransparency']) && input.reducedTransparency === true)) ||
    input.type !== 'matrix-render' || !requestId(input.requestId) || input.requestId <= previousRequestId ||
    !buttonAxes.includes(input.rows as string) || (input.columns !== null && (!buttonAxes.includes(input.columns as string) || input.columns === input.rows)) ||
    typeof input.states !== 'boolean' ||
    !['light', 'dark'].includes(input.mode as string) || !['wide', 'narrow'].includes(input.viewport as string) ||
    !Array.isArray(input.cells) || input.cells.length < 1 || input.cells.length > 48) return null
  const cells: ButtonMatrixCell[] = []
  for (const cell of input.cells as unknown[]) {
    if (!record(cell) || !exactKeys(cell, ['row', 'column', 'current', 'scope', 'css', 'recipe']) ||
      typeof cell.row !== 'string' || (cell.column !== null && typeof cell.column !== 'string') || (cell.column === null) !== (input.columns === null) ||
      typeof cell.current !== 'boolean' ||
      !hash(cell.scope) || typeof cell.css !== 'string' || cell.css.length === 0 || cell.css.length > 100_000) return null
    try {
      const recipe = validateRecipe(cell.recipe)
      const expected = await compileRecipe({ recipe })
      const css = expected.artifacts.find((artifact) => artifact.kind === 'style')?.content
      if (expected.scope !== cell.scope || css !== cell.css || canonicalize(recipe) !== canonicalize(expected.recipe.data)) return null
      cells.push({ row: cell.row, column: cell.column as string | null, current: cell.current, scope: cell.scope, css: cell.css, recipe })
    } catch {
      return null
    }
  }
  if (cells.filter((cell) => cell.current).length !== 1) return null
  return { type: 'matrix-render', requestId: input.requestId, rows: input.rows as string, columns: input.columns as string | null, cells, states: input.states,
    mode: input.mode as 'light' | 'dark', viewport: input.viewport as 'wide' | 'narrow', ...(input.reducedTransparency === true ? { reducedTransparency: true as const } : {}) }
}
