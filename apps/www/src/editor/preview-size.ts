/**
 * The editor preview reports how tall its content is, so the page can size the frame to it
 * instead of scrolling inside a fixed 20rem box. The sandbox sends a bare number; the page
 * accepts it only in this exact shape and bounds it.
 */
export type PreviewSize = { type: 'preview-size'; blockSize: number }

const maximumReported = 20000
const minimumFrame = 320
const maximumFrame = 2000

export function previewSizeMessage(blockSize: number): PreviewSize {
  return { type: 'preview-size', blockSize: Math.ceil(blockSize) }
}

export function acceptPreviewSize(input: unknown): number | null {
  if (typeof input !== 'object' || input === null || Array.isArray(input)) return null
  const keys = Object.keys(input)
  const data = input as Record<string, unknown>
  if (keys.length !== 2 || data.type !== 'preview-size' || typeof data.blockSize !== 'number') return null
  const size = data.blockSize
  return Number.isFinite(size) && size > 0 && size <= maximumReported ? size : null
}

/** The frame's height in pixels: the reported content, between 20rem and 2000px. */
export function previewFrameHeight(blockSize: number | null): number {
  if (blockSize === null) return minimumFrame
  return Math.min(maximumFrame, Math.max(minimumFrame, Math.ceil(blockSize)))
}

/**
 * The preview stage's content height: its padding plus its tallest in-flow child. Fixed and
 * absolute children (toast viewports, glass backdrops) are left out, and so is the stage's own
 * min-height, so a taller frame never reports a taller content.
 */
export function stageContentBlockSize(stage: HTMLElement): number {
  const style = getComputedStyle(stage)
  const padding = parseFloat(style.paddingBlockStart) + parseFloat(style.paddingBlockEnd)
  let tallest = 0
  for (const child of Array.from(stage.children) as HTMLElement[]) {
    const position = getComputedStyle(child).position
    if (position === 'fixed' || position === 'absolute') continue
    tallest = Math.max(tallest, child.getBoundingClientRect().height)
  }
  return padding + tallest
}
