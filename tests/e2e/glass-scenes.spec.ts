import { expect, test } from '@playwright/test'
import fs from 'node:fs/promises'
import { presetBackdrops } from '../../apps/www/src/preset-editor/preview-protocol.js'
import { glassSceneRanges } from '../../apps/www/src/site/glass-backdrops.js'

// Measures the luminance range of every glass preview scene, as grey channel values: the input of the editors'
// contrast-aware backdrop pick. By default it checks the committed table; with
// OMBELLE_WRITE_GLASS_SCENES=1 (pnpm measure:glass-scenes) it rewrites it.
const write = process.env.OMBELLE_WRITE_GLASS_SCENES === '1'
const tolerance = 0.02
const columns = 32, rows = 20

test('a surface-scoped recipe halo works when root halo and motion are zero', async ({ page }) => {
  await page.addInitScript(() => {
    document.addEventListener('DOMContentLoaded', () => {
      document.documentElement.style.setProperty('--glass-halo', '0')
      document.documentElement.style.setProperty('--glass-motion', '0')
    })
  })
  await page.goto('/liquid-glass/?mode=light')
  await expect(page.locator('main[data-ready="true"]')).toBeVisible({ timeout: 60000 })
  const button = page.locator('[data-slot="button"]').first()
  await button.evaluate(element => {
    const surface = element as HTMLElement
    surface.style.setProperty('--glass-halo', '0.8')
    surface.style.setProperty('--glass-motion', '0')
  })
  await button.hover()
  await expect(button).toHaveAttribute('data-halo-active', '')
})

test('the glass Tooltip arrow uses the same translucent material opacity', async ({ page }) => {
  await page.goto('/editions/liquid-glass/radix/?mode=light')
  await expect(page.getByTestId('variants-076')).toBeVisible({ timeout: 60000 })
  await page.getByRole('button', { name: 'Project details', exact: true }).hover()
  const arrow = page.locator('[data-slot="tooltip-arrow"]').first()
  await expect(arrow).toBeVisible()
  const alpha = await arrow.evaluate(element => {
    const style = getComputedStyle(element)
    return { fill: style.fill, opacity: style.getPropertyValue('--tooltip-glass-opacity').trim() }
  })
  expect(Number(alpha.opacity)).toBeGreaterThan(0)
  expect(Number(alpha.opacity)).toBeLessThan(1)
  expect(alpha.fill).toContain('/')
})

test('every glass scene matches its measured luminance range', async ({ page }) => {
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
            // The grey whose luminance matches the pixel: a saturated dark pixel stays dark.
            const linear = (c: number) => { const v = c / 255; return v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4 }
            const luminance = 0.2126 * linear(r!) + 0.7152 * linear(g!) + 0.0722 * linear(b!)
            const grey = luminance <= 0.0031308 ? 12.92 * luminance : 1.055 * luminance ** (1 / 2.4) - 0.055
            low = Math.min(low, grey)
            high = Math.max(high, grey)
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
