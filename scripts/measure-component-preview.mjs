// Measures how long the component-page playground takes to become ready and to react to switches.
// Usage: node scripts/measure-component-preview.mjs <origin> <id...>
// Prints JSON: { id, firstReadyMs, familySwitchMs: Record<family, number>, modeSwitchMs, modeFrameMs: number[] | null, preloadState }[]
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
  const panel = document.querySelector('[data-state="active"][role="tabpanel"]')
  const root = panel?.querySelector('[data-preview-family]') ?? panel ?? document.body
  const nodes = [document.documentElement, ...root.querySelectorAll('button, [role="menuitem"], p, h1, h2, h3, input')].slice(0, 6)
  return nodes.map((el) => {
    const c = getComputedStyle(el)
    return [c.backgroundColor, c.color, c.borderRadius, c.fontFamily, c.borderTopWidth, c.borderTopColor, c.boxShadow, c.fontWeight].join('|')
  }).join('//')
})()`
// The preview frame is chosen explicitly: the iframe whose title ends in "preview" (iframe renderer), else the
// page itself, fingerprinting the active tabpanel's stage `[data-preview-family]` (inline renderer).
const fingerprint = async (page) => {
  try {
    const iframes = page.locator('iframe[title$="preview"]')
    const frame = (await iframes.count()) > 0 ? await (await iframes.first().elementHandle()).contentFrame() : null
    return await (frame ?? page.mainFrame()).evaluate(fingerprintSource)
  } catch { return '' }
}
// Labels as rendered by the family toggle: familyLabels in apps/www/src/site/components/playground.tsx.
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
      const deadline = performance.now() + timeout
      while (performance.now() < deadline) {
        const now = await fingerprint(page)
        // An empty fingerprint is a detached or not-yet-loaded frame, not a change.
        if (now !== '' && now !== before) return
        await page.waitForTimeout(5)
      }
      throw new Error('preview never changed')
    }
    const start = performance.now()
    await page.goto(`${origin}/components/${id}`, { waitUntil: 'commit' })
    await readyText(/^Ombelle · /)
    const firstReadyMs = Math.round(performance.now() - start)
    await cdp.send('Network.setCacheDisabled', { cacheDisabled: false })

    // OMBELLE_PREVIEW_WARM_MS=3000 waits for the idle preload of the other families' sheets and fonts before switching.
    await page.waitForTimeout(Number(process.env.OMBELLE_PREVIEW_WARM_MS) || 0)
    const preloadState = await page.evaluate(() => ({
      preloadLinks: document.querySelectorAll('link[rel="preload"][as="style"]').length,
      fontFilesFetched: performance.getEntriesByType('resource').filter((e) => /\.(woff2?|ttf|otf)(\?|$)/.test(e.name)).length,
      fontsLoaded: [...document.fonts].filter((f) => f.status === 'loaded').length,
    }))
    const familySwitchMs = {}
    const familyGroup = page.locator('[aria-label="Style family"]')
    for (const label of families) {
      const before = await fingerprint(page)
      const target = familyGroup.locator('button, [role="radio"]').filter({ hasText: new RegExp(`^${label}$`) })
      // OMBELLE_PREVIEW_HOVER_MS=150 hovers the family's button first, as a reader does before clicking; the time starts at the click.
      const hoverMs = Number(process.env.OMBELLE_PREVIEW_HOVER_MS) || 0
      if (hoverMs) { await target.hover(); await page.waitForTimeout(hoverMs) }
      const t = performance.now()
      await target.click()
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

    // modeFrameMs: measured inside the page, so it has no polling or CDP overhead. From the click until the stage's
    // `data-preview-mode` has changed AND the next animation frame has fired (first frame, not paint). 4 toggles; null for
    // renderers without a stage (the iframe path).
    const modeFrameMs = await page.evaluate(() => new Promise((resolve) => {
      const stage = document.querySelector('[data-state="active"][role="tabpanel"] [data-preview-family]')
      const group = document.querySelector('[aria-label="Preview mode"]')
      if (!stage || !group) return resolve(null)
      const button = (label) => [...group.querySelectorAll('button, [role="radio"]')].find((el) => el.textContent?.trim() === label)
      const samples = []
      const toggle = (labels) => {
        const label = labels.shift()
        if (!label) return resolve(samples)
        const before = stage.getAttribute('data-preview-mode')
        const start = performance.now()
        button(label).click()
        const wait = () => {
          if (stage.getAttribute('data-preview-mode') === before) return requestAnimationFrame(wait)
          requestAnimationFrame(() => { samples.push(Math.round((performance.now() - start) * 10) / 10); setTimeout(() => toggle(labels), 250) })
        }
        wait()
      }
      toggle(['Light', 'Dark', 'Light', 'Dark'])
    }))

    // Which sheets and fonts the idle preload had fetched when the switches started (see OMBELLE_PREVIEW_WARM_MS).
    results.push({ id, firstReadyMs, familySwitchMs, modeSwitchMs, modeFrameMs, preloadState })
    await context.close()
  }
} finally {
  await browser.close()
}
console.log(JSON.stringify(results, null, 2))
