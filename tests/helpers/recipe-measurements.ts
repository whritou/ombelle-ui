import type { Locator, Page } from '@playwright/test'

/**
 * Hash screenshot pixels after dropping the three least-significant RGB bits.
 * This keeps cross-host browser comparisons stable when edge antialiasing
 * differs by a few channel values while preserving the exact PNG hash too.
 */
export async function recipeScreenshotFingerprint(
  page: Page,
  image: Buffer,
): Promise<string> {
  return page.evaluate(async (base64) => {
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
    const normalized = new Uint8Array(pixels.length)
    for (let i = 0; i < pixels.length; i += 4) {
      normalized[i] = pixels[i] & 0xf8
      normalized[i + 1] = pixels[i + 1] & 0xf8
      normalized[i + 2] = pixels[i + 2] & 0xf8
      normalized[i + 3] = pixels[i + 3]
    }
    const digest = await crypto.subtle.digest('SHA-256', normalized)
    return Array.from(new Uint8Array(digest), (byte) =>
      byte.toString(16).padStart(2, '0'),
    ).join('')
  }, image.toString('base64'))
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
