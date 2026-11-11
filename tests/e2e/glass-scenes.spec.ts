import { expect, test } from '@playwright/test'
import fs from 'node:fs/promises'
import { presetBackdrops } from '../../apps/www/src/preset-editor/preview-protocol.js'
import { glassSceneRanges } from '../../apps/www/src/site/glass-backdrops.js'

// Measures the channel range of every glass preview scene, the input of the editors'
// contrast-aware backdrop pick. By default it checks the committed table; with
// OMBELLE_WRITE_GLASS_SCENES=1 (pnpm measure:glass-scenes) it rewrites it.
const write = process.env.OMBELLE_WRITE_GLASS_SCENES === '1'
const tolerance = 0.02
const columns = 32, rows = 20

test('every glass scene matches its measured channel range', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 800 })
  const measured: Record<string, Record<string, { low: number; high: number }>> = {}
  for (const scene of presetBackdrops) {
    measured[scene] = {}
    for (const mode of ['light', 'dark'] as const) {
      await page.goto(`/glass-scene/?scene=${scene}&mode=${mode}`)
      await expect(page.locator('html[data-scene-ready]')).toHaveCount(1)
      const image = await page.screenshot({ animations: 'disabled' })
      measured[scene][mode] = await page.evaluate(async ({ base64, columns, rows }) => {
        const bitmap = new Image()
        bitmap.src = 'data:image/png;base64,' + base64
        await bitmap.decode()
        const canvas = document.createElement('canvas')
        canvas.width = bitmap.naturalWidth
        canvas.height = bitmap.naturalHeight
        const context = canvas.getContext('2d', { willReadFrequently: true })!
        context.drawImage(bitmap, 0, 0)
        let low = 1, high = 0
        for (let row = 0; row < rows; row++)
          for (let column = 0; column < columns; column++) {
            const x = Math.round(canvas.width * (0.1 + 0.8 * column / (columns - 1)))
            const y = Math.round(canvas.height * (0.1 + 0.8 * row / (rows - 1)))
            const [r, g, b] = context.getImageData(Math.min(x, canvas.width - 1), Math.min(y, canvas.height - 1), 1, 1).data
            for (const channel of [r!, g!, b!]) {
              low = Math.min(low, channel / 255)
              high = Math.max(high, channel / 255)
            }
          }
        return { low: Math.round(low * 1e4) / 1e4, high: Math.round(high * 1e4) / 1e4 }
      }, { base64: image.toString('base64'), columns, rows })
    }
  }
  if (write) {
    const body = presetBackdrops.map((scene) =>
      `  ${scene}: { light: { low: ${measured[scene]!.light!.low}, high: ${measured[scene]!.light!.high} }, dark: { low: ${measured[scene]!.dark!.low}, high: ${measured[scene]!.dark!.high} } },`).join('\n')
    const file = 'apps/www/src/site/glass-backdrops.ts'
    const source = await fs.readFile(file, 'utf8')
    const table = /(export const glassSceneRanges[^=]*= \{\r?\n)[\s\S]*?(\r?\n\})/
    expect(table.test(source), 'the table block was not found').toBe(true)
    await fs.writeFile(file, source.replace(table, `$1${body}$2`))
    return
  }
  for (const scene of presetBackdrops)
    for (const mode of ['light', 'dark'] as const)
      for (const end of ['low', 'high'] as const)
        expect.soft(Math.abs(measured[scene]![mode]![end] - glassSceneRanges[scene][mode][end]), `${scene} ${mode} ${end}`)
          .toBeLessThanOrEqual(tolerance)
})
