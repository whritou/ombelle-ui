import { canonicalize, compileComponentRecipe } from '@ombelle/compiler'
import {
  componentRecipeParts, validateComponentRecipe,
  type ComponentRecipe, type ComponentRecipeCompileResult, type ComponentRecipePart,
} from '@ombelle/contracts'

export type PartDimension = Exclude<keyof ComponentRecipePart, 'colors'>
/** The rendered value of each part dimension, keyed by slot, in the units the recipe stores. */
export type MeasuredParts = Record<string, Partial<Record<PartDimension, number>>>
export type CatalogPreviewMeasure = { type: 'catalog-measure'; requestId: number; parts: MeasuredParts }

const partDimensions: readonly PartDimension[] = [
  'paddingXPx', 'paddingYPx', 'gapPx', 'minHeightPx', 'radiusRem', 'borderWidthPx',
  'shadowOffsetXPx', 'shadowOffsetYPx', 'fontSizePx', 'fontWeight', 'letterSpacingEm',
]

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
  const rem = px(getComputedStyle(document.documentElement).fontSize) || 16
  const parts: MeasuredParts = {}
  for (const part of componentRecipeParts[component]) {
    const element = root.querySelector(`[data-slot="recipe-${part.slot}"]`)
    if (!element) continue
    const style = getComputedStyle(element)
    const fontSize = px(style.fontSize)
    const [shadowX, shadowY] = shadowOffsets(style)
    const values: Partial<Record<PartDimension, number>> = {
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
    parts[part.slot] = values
  }
  return parts
}

export function acceptCatalogMeasure(input: unknown, component: ComponentRecipe['component']): CatalogPreviewMeasure | null {
  if (!record(input) || input.type !== 'catalog-measure' || Object.keys(input).length !== 3 ||
    typeof input.requestId !== 'number' || !Number.isSafeInteger(input.requestId) || input.requestId <= 0 ||
    !record(input.parts)) return null
  const slots = new Set(componentRecipeParts[component].map(part => part.slot))
  const parts: MeasuredParts = {}
  for (const [slot, values] of Object.entries(input.parts)) {
    if (!slots.has(slot) || !record(values)) return null
    const accepted: Partial<Record<PartDimension, number>> = {}
    for (const [key, value] of Object.entries(values)) {
      if (!partDimensions.includes(key as PartDimension) || typeof value !== 'number' || !Number.isFinite(value)) return null
      accepted[key as PartDimension] = value
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
    Object.keys(input).length !== 6 ||
    typeof input.requestId !== 'number' || !Number.isSafeInteger(input.requestId) || input.requestId <= previousRequestId ||
    (input.mode !== 'light' && input.mode !== 'dark') || (input.viewport !== 'wide' && input.viewport !== 'narrow')) return null
  const result = await verifyCatalogCompileResult(input.result, activeComponent)
  return result ? { type: 'catalog-render', component: activeComponent, requestId: input.requestId,
    mode: input.mode, viewport: input.viewport, result } : null
}
