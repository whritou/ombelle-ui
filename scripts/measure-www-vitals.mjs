// Throttled phone page loads of the site: FCP, LCP, CLS, total blocking time and transfer per route.
// Profile (Lighthouse "mobile"): 412 x 823 viewport, 150 ms RTT, 1.6 Mbit/s down, 750 kbit/s up, 4x CPU slowdown, cold cache.
// Usage: node scripts/measure-www-vitals.mjs <origin> [out.json] [runs]
//   ROUTES=/,/components   routes to load (default below; add a published code with ROUTES)
//   CHANNEL=msedge         browser channel (default msedge; 'chromium' uses Playwright's bundled browser)
// The numbers vary with the machine; compare runs from one machine. Medians are printed per route.
import fs from 'node:fs'
import { chromium } from '@playwright/test'

const origin = process.argv[2]
if (!origin) throw new Error('Usage: node scripts/measure-www-vitals.mjs <origin> [out.json] [runs]')
const out = process.argv[3]
const runs = Number(process.argv[4] ?? 3)
const routes = process.env.ROUTES ? process.env.ROUTES.split(',') : [
  '/', '/components', '/components/button', '/blocks', '/blocks/login-01', '/editor/preset', '/editor/component/button',
]
const network = { offline: false, latency: 150, downloadThroughput: (1.6 * 1024 * 1024) / 8, uploadThroughput: (750 * 1024) / 8 }
const channel = process.env.CHANNEL ?? 'msedge'

const browser = await chromium.launch(channel === 'chromium' ? {} : { channel })
const results = []
for (const route of routes) {
  for (let run = 0; run < runs; run++) {
    const context = await browser.newContext({ viewport: { width: 412, height: 823 }, deviceScaleFactor: 1.75, isMobile: true, hasTouch: true })
    const page = await context.newPage()
    const cdp = await context.newCDPSession(page)
    await cdp.send('Network.enable')
    await cdp.send('Network.setCacheDisabled', { cacheDisabled: true })
    await cdp.send('Network.emulateNetworkConditions', network)
    await cdp.send('Emulation.setCPUThrottlingRate', { rate: 4 })
    const bytes = {}
    const types = new Map()
    const workers = []
    cdp.on('Network.responseReceived', (e) => types.set(e.requestId, { type: e.type, url: e.response.url }))
    cdp.on('Network.loadingFinished', (e) => {
      const t = types.get(e.requestId)
      if (!t) return
      bytes[t.type] = (bytes[t.type] ?? 0) + e.encodedDataLength
      bytes.total = (bytes.total ?? 0) + e.encodedDataLength
    })
    page.on('worker', (worker) => workers.push(new URL(worker.url()).pathname))
    await page.addInitScript(() => {
      window.__v = { lcp: 0, lcpEl: '', cls: 0, shifts: [], longTasks: [], fcp: 0 }
      new PerformanceObserver((l) => { for (const e of l.getEntries()) { window.__v.lcp = e.startTime; window.__v.lcpEl = (e.element?.tagName ?? '') + (e.url ? ' ' + e.url.slice(-60) : '') } }).observe({ type: 'largest-contentful-paint', buffered: true })
      new PerformanceObserver((l) => {
        for (const e of l.getEntries()) {
          if (e.hadRecentInput) continue
          window.__v.cls += e.value
          window.__v.shifts.push([Math.round(e.startTime), +e.value.toFixed(3), (e.sources ?? []).map((s) => (s.node?.nodeName ?? '?') + (s.node?.getAttribute?.('data-slot') ? '[' + s.node.getAttribute('data-slot') + ']' : '')).join(' ')])
        }
      }).observe({ type: 'layout-shift', buffered: true })
      new PerformanceObserver((l) => { for (const e of l.getEntries()) window.__v.longTasks.push([e.startTime, e.duration]) }).observe({ type: 'longtask', buffered: true })
      new PerformanceObserver((l) => { for (const e of l.getEntries()) if (e.name === 'first-contentful-paint') window.__v.fcp = e.startTime }).observe({ type: 'paint', buffered: true })
    })
    const response = await page.goto(origin + route, { waitUntil: 'load', timeout: 180000 })
    await page.waitForTimeout(8000)
    const v = await page.evaluate(() => ({ ...window.__v }))
    const tbt = v.longTasks.filter(([start]) => start >= v.fcp).reduce((sum, [, duration]) => sum + Math.max(0, duration - 50), 0)
    const row = {
      route, run, status: response.status(), fcp: Math.round(v.fcp), lcp: Math.round(v.lcp), lcpEl: v.lcpEl, cls: +v.cls.toFixed(3), shifts: v.shifts,
      tbt: Math.round(tbt), kb: Math.round((bytes.total ?? 0) / 1024), jsKb: Math.round((bytes.Script ?? 0) / 1024), fontKb: Math.round((bytes.Font ?? 0) / 1024), workers,
    }
    results.push(row)
    console.log(JSON.stringify(row))
    await context.close()
  }
}
await browser.close()

const median = (values) => [...values].sort((a, b) => a - b)[Math.floor(values.length / 2)]
console.log('\n| Route | FCP | LCP | CLS | TBT | Transfer | JS | Fonts | Workers |\n| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |')
for (const route of routes) {
  const rows = results.filter((row) => row.route === route)
  const s = (key) => median(rows.map((row) => row[key]))
  console.log(`| \`${route}\` | ${(s('fcp') / 1000).toFixed(1)} s | ${(s('lcp') / 1000).toFixed(1)} s | ${s('cls').toFixed(2)} | ${(s('tbt') / 1000).toFixed(1)} s | ${s('kb')} KB | ${s('jsKb')} KB | ${s('fontKb')} KB | ${median(rows.map((row) => row.workers.length))} |`)
}
if (out) fs.writeFileSync(out, JSON.stringify(results, null, 2))
