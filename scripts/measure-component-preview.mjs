// Measures how long the component-page playground takes to become ready and to react to switches.
// Usage: node scripts/measure-component-preview.mjs <origin> <id...>
// Prints JSON: { id, firstReadyMs, familySwitchMs: Record<family, number>, modeSwitchMs }[]
// Relies only on the role="status" line (`<Family label> · <mode>` once ready) and the toggle groups
// labelled "Style family" and "Preview mode" (a role=group of buttons today; role=radio items also match), so it measures both the iframe and the inline renderer.
import { chromium } from '@playwright/test'

const [origin, ...ids] = process.argv.slice(2)
if (!origin || ids.length === 0) {
  console.error('Usage: node scripts/measure-component-preview.mjs <origin> <id...>')
  process.exit(2)
}
// The status line is derived from the selected family/mode, so it flips before the preview repaints.
// Switch timings therefore wait for the status line AND for the rendered preview to change: a fingerprint
// of computed styles of the first controls inside the preview (the sandboxed iframe's frame when one
// exists, otherwise the page's preview panel). Both the iframe and the inline renderer expose that.
const fingerprintSource = `(() => {
  const root = document.querySelector('[data-state="active"][role="tabpanel"]') ?? document.body
  const nodes = [document.documentElement, ...root.querySelectorAll('button, [role="menuitem"], p, h1, h2, h3, input')].slice(0, 6)
  return nodes.map((el) => {
    const c = getComputedStyle(el)
    return [c.backgroundColor, c.color, c.borderRadius, c.fontFamily, c.borderTopWidth, c.borderTopColor, c.boxShadow, c.fontWeight].join('|')
  }).join('//')
})()`
const fingerprint = async (page) => {
  const frame = page.frames().find((candidate) => candidate !== page.mainFrame())
  try { return await (frame ?? page.mainFrame()).evaluate(fingerprintSource) } catch { return '' }
}
const families = ['Papier', 'Organic', 'Retro futurism', 'Minimalist', 'Flat', 'Neo-Brutalism']
const timeout = 60000

const browser = await chromium.launch({ channel: process.env.OMBELLE_BROWSER_CHANNEL || undefined })
const results = []
try {
  for (const id of ids) {
    const context = await browser.newContext({ viewport: { width: 1100, height: 800 }, reducedMotion: 'reduce' })
    const page = await context.newPage()
    const cdp = await context.newCDPSession(page)
    await cdp.send('Network.enable')
    await cdp.send('Network.setCacheDisabled', { cacheDisabled: true })
    const readyText = (pattern) => page.waitForFunction(
      (source) => [...document.querySelectorAll('[role="status"]')].some((el) => new RegExp(source).test(el.textContent ?? '')),
      pattern.source, { timeout, polling: 'raf' })

    const changed = async (before) => {
      const deadline = Date.now() + timeout
      while (Date.now() < deadline) {
        if ((await fingerprint(page)) !== before) return
        await page.waitForTimeout(5)
      }
      throw new Error('preview never changed')
    }
    const start = Date.now()
    await page.goto(`${origin}/components/${id}`, { waitUntil: 'commit' })
    await readyText(/^Ombelle · /)
    const firstReadyMs = Date.now() - start
    await cdp.send('Network.setCacheDisabled', { cacheDisabled: false })

    const familySwitchMs = {}
    const familyGroup = page.locator('[aria-label="Style family"]')
    for (const label of families) {
      const before = await fingerprint(page)
      const t = performance.now()
      await familyGroup.locator('button, [role="radio"]').filter({ hasText: new RegExp(`^${label}$`) }).click()
      await readyText(new RegExp(`^${label} · `))
      await changed(before)
      familySwitchMs[label] = Math.round(performance.now() - t)
    }

    const modeBefore = await fingerprint(page)
    const t = performance.now()
    await page.locator('[aria-label="Preview mode"]').locator('button, [role="radio"]').filter({ hasText: /^Dark$/ }).click()
    await readyText(/· dark$/)
    await changed(modeBefore)
    const modeSwitchMs = Math.round(performance.now() - t)

    results.push({ id, firstReadyMs, familySwitchMs, modeSwitchMs })
    await context.close()
  }
} finally {
  await browser.close()
}
console.log(JSON.stringify(results, null, 2))
