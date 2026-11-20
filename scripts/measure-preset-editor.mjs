// Measures how long the preset editor's preview takes to become ready and to react to edits.
// Usage: node scripts/measure-preset-editor.mjs <origin> [--runs N]
// Prints JSON: { firstReadyMs, tokenEditMs: number[], tokenInputMs: number[], tokenFrameMs: number[], familySwitchMs: Record<family, number>, familyConfirmed, sceneSwitchMs,
//   modeSwitchMs, workerCompileMs: number[], iframeApplyMs: number[], tokensApplyMs: number[], iframePhases, medians,
//   channels, runs }
// Method as scripts/measure-component-preview.mjs: Playwright chromium, cache disabled for the first load, reduced
// motion, 1100x800. "Ready" is the `Preview ready` status line (`data-status="ready"`). Edits and switches are timed
// from the input until a computed-style fingerprint inside the preview iframe ("Global preset gallery") changes.
import { chromium } from '@playwright/test'

const args = process.argv.slice(2)
const origin = args.find((arg) => /^https?:/.test(arg))
const runsAt = args.indexOf('--runs')
const runs = runsAt >= 0 ? Number(args[runsAt + 1]) : 5
if (!origin || !Number.isInteger(runs) || runs < 1) {
  console.error('Usage: node scripts/measure-preset-editor.mjs <origin> [--runs N]')
  process.exit(2)
}
const timeout = 60000
// Labels as rendered by the family picker (apps/www/src/editor/components/family-picker.tsx). Liquid glass is excluded.
const families = ['Papier', 'Organic', 'Retro futurism', 'Minimalist', 'Flat', 'Neo-brutalism']

// Records, with the absolute clock (timeOrigin + now), every worker request and response in the page, every
// `preset-render` / `preset-tokens` post and its ack on the editor's MessagePorts, and, inside the iframe, when each
// message arrived, every SHA-256 digest and when each ack was posted. Request ids restart at 1 on every new channel
// (the editor opens one per `ready` handshake), so each side keys its records by port as well as by request id.
function instrument() {
  const clock = () => performance.timeOrigin + performance.now()
  const store = (window.__m = { worker: [], render: [], received: [], acks: [], digests: [], handshakes: [], inputs: [], frames: [] })
  const top = window === window.top
  const seen = new WeakSet()
  const watch = (target, onMessage) => {
    if (seen.has(target)) return
    seen.add(target)
    target.addEventListener('message', (event) => onMessage(event.data, clock()))
  }
  const portIds = new WeakMap()
  let ports = 0
  const portId = (port) => {
    if (!portIds.has(port)) portIds.set(port, ++ports)
    return portIds.get(port)
  }
  const isRender = (data) => data && (data.type === 'preset-render' || data.type === 'preset-tokens')
  let workers = 0
  const workerIds = new WeakMap()
  if (top) {
    const post = Worker.prototype.postMessage
    Worker.prototype.postMessage = function (data, ...rest) {
      if (!workerIds.has(this)) workerIds.set(this, ++workers)
      watch(this, (reply, t) => {
        if (reply && typeof reply.requestId === 'number')
          for (const entry of store.worker)
            if (entry.worker === workerIds.get(this) && entry.requestId === reply.requestId && entry.got === undefined) entry.got = t
      })
      if (data && typeof data.requestId === 'number')
        store.worker.push({ worker: workerIds.get(this), requestId: data.requestId, type: data.type, sent: clock() })
      return post.call(this, data, ...rest)
    }
    const portPost = MessagePort.prototype.postMessage
    MessagePort.prototype.postMessage = function (data, ...rest) {
      const port = portId(this)
      watch(this, (reply, t) => {
        if (reply && reply.type === 'preset-render-ack')
          for (const entry of store.render)
            if (entry.port === port && entry.requestId === reply.requestId && entry.got === undefined) { entry.got = t; entry.status = reply.status }
      })
      if (isRender(data)) store.render.push({ port, requestId: data.requestId, kind: data.type, sent: clock() })
      return portPost.call(this, data, ...rest)
    }
    // When each input event was dispatched in the editor page (absolute clock).
    document.addEventListener('input', (event) => store.inputs.push(performance.timeOrigin + event.timeStamp), true)
    // Every `ready` handshake from the iframe makes the editor open a new channel.
    window.addEventListener('message', (event) => {
      if (event.data && event.data.type === 'ombelle-preset-preview-ready') store.handshakes.push(clock())
    }, true)
  } else {
    const portPost = MessagePort.prototype.postMessage
    MessagePort.prototype.postMessage = function (data, ...rest) {
      if (data && data.type === 'preset-render-ack') {
        store.acks.push({ port: portId(this), requestId: data.requestId, t: clock() })
        // The ack follows the DOM commit; the frame that shows it has been produced once a task queued from the
        // next animation frame runs. Read in the iframe's own process, so a busy editor page does not delay it.
        if (data.status === 'applied') requestAnimationFrame(() => setTimeout(() => store.frames.push(clock()), 0))
      }
      return portPost.call(this, data, ...rest)
    }
    // The port arrives with the init message, before any ack is posted: listen on it directly.
    window.addEventListener('message', (event) => {
      if (event.data && event.data.type === 'ombelle-preset-preview-init') store.handshakes.push(clock())
      for (const port of event.ports ?? []) {
        const id = portId(port)
        watch(port, (incoming, t) => {
          if (isRender(incoming)) store.received.push({ port: id, requestId: incoming.requestId, t })
        })
      }
    }, true)
    const digest = crypto.subtle.digest.bind(crypto.subtle)
    crypto.subtle.digest = (...digestArgs) => { store.digests.push(clock()); return digest(...digestArgs) }
  }
}

// What a token or family change visibly alters in the preview: styles of the first 80 catalog slots (radius reaches inputs and cards, not the pill buttons) and the first headings.
const fingerprintSource = `(() => {
  const nodes = [document.documentElement, document.body, ...document.querySelectorAll('[data-slot], h1, h2')].slice(0, 80)
  const key = nodes.map((el) => {
    const c = getComputedStyle(el)
    return [c.backgroundColor, c.color, c.borderRadius, c.fontFamily, c.borderTopWidth, c.boxShadow].join('|')
  }).join('//')
  return key + '##' + (document.querySelector('h1, h2')?.textContent ?? '') + '##' + document.querySelectorAll('button').length
})()`

// The true median: the middle value, or the mean of the two middle values for an even count.
const median = (values) => {
  const sorted = [...values].sort((a, b) => a - b)
  const n = sorted.length
  if (!n) return null
  return n % 2 ? sorted[(n - 1) / 2] : (sorted[n / 2 - 1] + sorted[n / 2]) / 2
}
const round = (value) => Math.round(value)

const browser = await chromium.launch({ channel: process.env.OMBELLE_BROWSER_CHANNEL || undefined })
let output
try {
  const context = await browser.newContext({ viewport: { width: 1100, height: 800 }, reducedMotion: 'reduce' })
  await context.addInitScript(instrument)
  const page = await context.newPage()
  const cdp = await context.newCDPSession(page)
  await cdp.send('Network.enable')
  await cdp.send('Network.setCacheDisabled', { cacheDisabled: true })
  const iframeFrame = async () => {
    const handle = await page.locator('iframe[title="Global preset gallery"]').first().elementHandle()
    return handle ? handle.contentFrame() : null
  }
  const fingerprint = async () => {
    try { return await (await iframeFrame()).evaluate(fingerprintSource) } catch { return '' }
  }
  const ready = () => page.waitForFunction(
    () => document.querySelector('[data-testid="preset-preview-status"]')?.getAttribute('data-status') === 'ready',
    undefined, { timeout, polling: 'raf' })
  // A compiled result for the current draft: "Get code" is enabled once the worker has caught up.
  const compiled = () => page.getByRole('button', { name: 'Get code', exact: true }).waitFor({ state: 'visible', timeout })
    .then(() => page.waitForFunction(() => {
      const button = [...document.querySelectorAll('button')].find((el) => el.textContent?.trim() === 'Get code')
      return !!button && !button.disabled
    }, undefined, { timeout, polling: 100 }))
  const changed = async (before) => {
    const deadline = performance.now() + timeout
    while (performance.now() < deadline) {
      const now = await fingerprint()
      // An empty fingerprint is a detached or not-yet-loaded frame, not a change.
      if (now !== '' && now !== before) return
      await page.waitForTimeout(2)
    }
    throw new Error('preview never changed')
  }
  const settle = async () => { await ready(); await compiled(); await page.waitForTimeout(400) }

  const start = performance.now()
  await page.goto(`${origin}/editor/preset`, { waitUntil: 'commit' })
  await ready()
  const firstReadyMs = round(performance.now() - start)
  // First ready is the status line; the iframe must also have painted something to measure against.
  await changedFromEmpty()
  await cdp.send('Network.setCacheDisabled', { cacheDisabled: false })
  await settle()

  async function changedFromEmpty() {
    const deadline = performance.now() + timeout
    while (performance.now() < deadline) {
      if ((await fingerprint()) !== '') return
      await page.waitForTimeout(5)
    }
    throw new Error('preview iframe never rendered')
  }

  // Token edit: set Corner radius and press Tab. The field commits on every input, so the edit reaches the editor
  // during `fill`: `tokenEditMs` runs from the Tab press (the original metric, kept for comparison with earlier runs),
  // `tokenInputMs` from the start of `fill`, which covers the editor's own handling of the input as well.
  const radius = page.getByLabel('Corner radius', { exact: true })
  const values = ['0.3', '1.2', '0.5', '1.5', '0.2', '1.0', '0.7', '1.8', '0.4', '1.3']
  const tokenEditMs = [], tokenInputMs = []
  // Per edit: the input event's index in the page's record, to pair it with the first iframe frame after it.
  const tokenInputs = []
  for (let i = 0; i < runs; i++) {
    const before = await fingerprint()
    await radius.click()
    // The fill's input event is the next one recorded (read before the clock starts, so no round trip is added).
    tokenInputs.push(await page.evaluate(() => window.__m.inputs.length))
    const input = performance.now()
    await radius.fill(values[i % values.length])
    const t = performance.now()
    await radius.press('Tab')
    await changed(before)
    tokenEditMs.push(round(performance.now() - t))
    tokenInputMs.push(round(performance.now() - input))
    await settle()
  }

  // Family switches: the picker confirms when it would change values the reader has not customised.
  const familySwitchMs = {}
  // Which switches went through the dialog: their clock starts at the Confirm click, the others' at the family click.
  const familyConfirmed = {}
  const group = page.locator('[aria-label="Style family"]')
  for (const label of families) {
    const before = await fingerprint()
    const item = group.locator('button, [role="radio"]').filter({ hasText: new RegExp(`^${label}$`, 'i') })
    const clicked = performance.now()
    await item.click()
    const confirm = page.getByRole('button', { name: 'Confirm change', exact: true })
    // The confirm dialog and the preview change race: take whichever shows first, fail clearly if neither does.
    let outcome = null
    const deadline = performance.now() + timeout
    while (performance.now() < deadline) {
      if (await confirm.isVisible()) { outcome = 'confirm'; break }
      const now = await fingerprint()
      if (now !== '' && now !== before) { outcome = 'changed'; break }
      await page.waitForTimeout(2)
    }
    if (outcome === null) throw new Error(`family switch to ${label}: neither the confirmation dialog nor a preview change appeared within ${timeout} ms`)
    // Without a dialog the clock runs from the family click; with one, from the Confirm click.
    let t = clicked
    if (outcome === 'confirm') { t = performance.now(); await confirm.click(); await changed(before) }
    familySwitchMs[label] = round(performance.now() - t)
    familyConfirmed[label] = outcome === 'confirm'
    await settle()
  }

  // Scene switch, Dashboard to Settings (the segmented control hides below 1200 px, the select takes over).
  const pageGroup = page.getByRole('radiogroup', { name: 'Preview page', exact: true })
  const sceneBefore = await fingerprint()
  const sceneStart = performance.now()
  if (await pageGroup.isVisible()) await pageGroup.getByRole('radio', { name: 'Settings', exact: true }).click()
  else await page.getByRole('combobox', { name: 'Preview page' }).selectOption({ label: 'Settings' })
  await changed(sceneBefore)
  const sceneSwitchMs = round(performance.now() - sceneStart)
  await settle()

  // Mode switch, light to dark.
  const modeBefore = await fingerprint()
  const modeStart = performance.now()
  await page.getByRole('radiogroup', { name: 'Preview mode', exact: true }).getByRole('radio', { name: 'Dark', exact: true }).click()
  await changed(modeBefore)
  const modeSwitchMs = round(performance.now() - modeStart)
  await settle()

  const top = await page.evaluate(() => window.__m)
  const inner = await (await iframeFrame()).evaluate(() => window.__m)
  // Input event in the editor to the first iframe frame produced after an applied preset, both on the absolute clock.
  // Free of the CDP round trips in the two metrics above; the frame mark adds at most one task after the frame.
  const tokenFrameMs = tokenInputs.map((index) => {
    const at = top.inputs[index]
    const frame = inner.frames.find((t) => t > at)
    return at === undefined || frame === undefined ? null : round(frame - at)
  })
  const workerCompileMs = top.worker.filter((e) => e.got !== undefined).map((e) => round(e.got - e.sent))
  const rendered = top.render.filter((e) => e.got !== undefined && e.status === 'applied')
  const iframeApplyMs = rendered.map((e) => round(e.got - e.sent))
  const tokensApplyMs = rendered.filter((e) => e.kind === 'preset-tokens').map((e) => round(e.got - e.sent))
  // Inside the iframe: message arrival to first and last digest to the ack. Port ids differ between the two sides,
  // so a post is paired with the first arrival of its request id at or after the post (clocks are absolute), and
  // the ack with the same port and request id inside the iframe.
  const phases = rendered.map((e) => {
    const arrival = inner.received
      .filter((r) => r.requestId === e.requestId && r.t >= e.sent - 1)
      .sort((a, b) => a.t - b.t)[0]
    if (!arrival) return null
    const received = arrival.t
    const ack = inner.acks.find((a) => a.port === arrival.port && a.requestId === e.requestId)?.t
    if (received === undefined || ack === undefined) return null
    const digests = inner.digests.filter((d) => d >= received && d <= ack)
    if (!digests.length) return null
    const first = digests[0], last = digests[digests.length - 1]
    return {
      requestId: e.requestId,
      port: e.port,
      postToReceiveMs: round(received - e.sent),
      receiveToFirstDigestMs: round(first - received),
      firstToLastDigestMs: round(last - first),
      lastDigestToAckMs: round(ack - last),
      ackToTopMs: round(e.got - ack),
      digestCount: digests.length,
    }
  }).filter(Boolean)
  const med = (key) => median(phases.map((p) => p[key]))
  output = {
    origin, runs, firstReadyMs, tokenEditMs, tokenInputMs, tokenFrameMs, familySwitchMs, familyConfirmed, sceneSwitchMs, modeSwitchMs, workerCompileMs, iframeApplyMs, tokensApplyMs,
    iframePhases: {
      samples: phases.length,
      medianPostToReceiveMs: med('postToReceiveMs'),
      medianReceiveToFirstDigestMs: med('receiveToFirstDigestMs'),
      medianVerificationMs: med('firstToLastDigestMs'),
      medianLastDigestToAckMs: med('lastDigestToAckMs'),
      medianAckToTopMs: med('ackToTopMs'),
      perRender: phases,
    },
    medians: {
      tokenEditMs: median(tokenEditMs),
      tokenInputMs: median(tokenInputMs),
      tokenFrameMs: median(tokenFrameMs.filter((value) => value !== null)),
      familySwitchMs: median(Object.values(familySwitchMs)),
      workerCompileMs: median(workerCompileMs),
      iframeApplyMs: median(iframeApplyMs),
    },
    channels: { readyHandshakes: top.handshakes.length, initsReceived: inner.handshakes.length, editorPorts: new Set(top.render.map((e) => e.port)).size },
    workerRequests: top.worker.length,
    renderMessages: top.render.length,
  }
  await context.close()
} finally {
  await browser.close()
}
console.log(JSON.stringify(output, null, 2))
