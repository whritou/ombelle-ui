import type { Page } from '@playwright/test'

/**
 * The largest per-channel difference between two PNG screenshots of the same size, decoded in the page
 * (Infinity when the sizes differ). Exact equality fails on a 1/255 rounding of gradient stop colours
 * between a development and a production CSS build (retro-futurism's striped Button).
 */
export async function maxPixelDifference(page: Page, a: Buffer, b: Buffer): Promise<number> {
  if (a.equals(b)) return 0
  return page.evaluate(async ([first, second]) => {
    const pixels = async (base64: string) => {
      const bitmap = await createImageBitmap(await (await fetch('data:image/png;base64,' + base64)).blob())
      const canvas = new OffscreenCanvas(bitmap.width, bitmap.height)
      const context = canvas.getContext('2d')!
      context.drawImage(bitmap, 0, 0)
      return context.getImageData(0, 0, bitmap.width, bitmap.height)
    }
    const x = await pixels(first), y = await pixels(second)
    if (x.width !== y.width || x.height !== y.height) return Infinity
    let max = 0
    for (let i = 0; i < x.data.length; i++) max = Math.max(max, Math.abs(x.data[i]! - y.data[i]!))
    return max
  }, [a.toString('base64'), b.toString('base64')] as const)
}
