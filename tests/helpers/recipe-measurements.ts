import type { Locator, Page } from '@playwright/test'

export const recipeScreenshotBlockSize = 4

export type NormalizedRecipeScreenshot = {
  width: number
  height: number
  pixels: string
}

export function normalizeRecipeScreenshotPixels(
  pixels: ArrayLike<number>,
  width: number,
  height: number,
): { width: number; height: number; pixels: Uint8Array } {
  if (
    !Number.isInteger(width) ||
    !Number.isInteger(height) ||
    width <= 0 ||
    height <= 0 ||
    pixels.length !== width * height * 4
  )
    throw Error('Invalid screenshot pixel dimensions')

  const normalizedWidth = Math.ceil(width / recipeScreenshotBlockSize)
  const normalizedHeight = Math.ceil(height / recipeScreenshotBlockSize)
  const normalized = new Uint8Array(normalizedWidth * normalizedHeight * 4)
  for (let blockY = 0; blockY < normalizedHeight; blockY++) {
    for (let blockX = 0; blockX < normalizedWidth; blockX++) {
      const target = (blockY * normalizedWidth + blockX) * 4
      let count = 0
      const totals = [0, 0, 0, 0]
      for (
        let y = blockY * recipeScreenshotBlockSize;
        y < Math.min(height, (blockY + 1) * recipeScreenshotBlockSize);
        y++
      ) {
        for (
          let x = blockX * recipeScreenshotBlockSize;
          x < Math.min(width, (blockX + 1) * recipeScreenshotBlockSize);
          x++
        ) {
          const source = (y * width + x) * 4
          for (let channel = 0; channel < 4; channel++)
            totals[channel] += pixels[source + channel]
          count++
        }
      }
      for (let channel = 0; channel < 4; channel++)
        normalized[target + channel] = Math.round(totals[channel] / count)
    }
  }
  return {
    width: normalizedWidth,
    height: normalizedHeight,
    pixels: normalized,
  }
}

/**
 * Capture a compact 4x4 averaged image for tolerant cross-host comparison.
 * The exact PNG hash remains separate as run evidence.
 */
export async function recipeScreenshotEvidence(
  page: Page,
  image: Buffer,
): Promise<NormalizedRecipeScreenshot> {
  const source = await page.evaluate(async (base64) => {
    const bitmap = new Image()
    bitmap.src = 'data:image/png;base64,' + base64
    await bitmap.decode()
    const canvas = document.createElement('canvas')
    canvas.width = bitmap.naturalWidth
    canvas.height = bitmap.naturalHeight
    const context = canvas.getContext('2d', { willReadFrequently: true })
    if (!context) throw Error('Unable to read screenshot pixels')
    context.drawImage(bitmap, 0, 0)
    const pixels = context.getImageData(0, 0, canvas.width, canvas.height).data
    return {
      width: canvas.width,
      height: canvas.height,
      pixels: Array.from(pixels),
    }
  }, image.toString('base64'))
  const normalized = normalizeRecipeScreenshotPixels(
    source.pixels,
    source.width,
    source.height,
  )
  return {
    width: source.width,
    height: source.height,
    pixels: Buffer.from(normalized.pixels).toString('base64'),
  }
}

export async function recipeStyles(
  button: Locator,
): Promise<Record<string, string>> {
  return button.evaluate((el) => {
    const s = getComputedStyle(el)
    return {
      color: s.color,
      background: s.backgroundColor,
      border: s.border,
      borderRadius: s.borderRadius,
      minHeight: s.minHeight,
      fontFamily: s.fontFamily,
      fontSize: s.fontSize,
      lineHeight: s.lineHeight,
      boxShadow: s.boxShadow,
      padding: s.padding,
    }
  })
}
export async function recipeDom(element: Locator): Promise<unknown> {
  return element.evaluate((root) => {
    function visit(n: Node): unknown {
      if (n.nodeType === 3) return n.textContent
      if (!(n instanceof Element)) return null
      return {
        tag: n.tagName.toLowerCase(),
        attributes: Object.fromEntries(
          Array.from(n.attributes)
            .sort((a, b) => a.name.localeCompare(b.name))
            .map((a) => [a.name, a.value]),
        ),
        children: Array.from(n.childNodes)
          .filter((n) => [1, 3].includes(n.nodeType))
          .map(visit),
      }
    }
    return visit(root)
  })
}
