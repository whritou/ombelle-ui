// Measures the phases of the component editor's preview (`/editor/component/<id>`): iframe load, worker download,
// first compile, first render, and the cost of one recipe edit, including the iframe's re-verification compile.
// Usage: node scripts/measure-component-editor.mjs <origin> <id...> [--runs N] [--warm]
// Prints JSON keyed by id: { iframeLoadMs, workerDownloadMs, firstCompileMs, iframeFillMs, firstRenderMs, firstPreviewMs,
//   recompileMs: number[], iframeVerifyMs: number[], moduleRequests, ...details }. The first five are medians over N loads
//   (raw values under `loads`), the arrays are the N edits of one page in order.
// Method as scripts/measure-preset-editor.mjs: Playwright chromium, reduced motion, 1100x800, a new MessageChannel per
// iframe `ready` (request ids restart at 1), so every record is keyed by port as well as by request id.
// Cold: a fresh context per load with the HTTP cache disabled. --warm: a fresh context, one priming load, then the
// measured load with the cache on (assets from the HTTP cache; the worker and iframe still start from nothing).
import { chromium } from '@playwright/test'

const args = process.argv.slice(2)
const origin = args.find((arg) => /^https?:/.test(arg))
const runsAt = args.indexOf('--runs')
const runs = runsAt >= 0 ? Number(args[runsAt + 1]) : 5
const warm = args.includes('--warm')
const ids = args.filter((arg, index) => !arg.startsWith('--') && arg !== origin && args[index - 1] !== '--runs')
if (!origin || !ids.length || !Number.isInteger(runs) || runs < 1) {
  console.error('Usage: node scripts/measure-component-editor.mjs <origin> <id...> [--runs N] [--warm]')
  process.exit(2)
}
const timeout = 60000

// Records, on the absolute clock (timeOrigin + now): every compile request to a worker and its reply, when each worker
// was constructed, every render post on the editor's ports and its ack, iframe `load` events, every SHA-256 digest in
// both documents (a compile hashes each artifact), and, inside the iframe, when each render arrived and each ack left.
function instrument() {
  const clock = () => performance.timeOrigin + performance.now()
  const store = (window.__m = { workers: [], worker: [], render: [], received: [], acks: [], digests: [], topDigests: [], loads: [], frames: [], inputs: [], specimen: null })
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
  const isRender = (data) => data && (data.type === 'render' || data.type === 'catalog-render')
  const digest = crypto.subtle.digest.bind(crypto.subtle)
  crypto.subtle.digest = (...digestArgs) => { (top ? store.topDigests : store.digests).push(clock()); return digest(...digestArgs) }
  if (top) {
    const workerIds = new WeakMap()
    let workers = 0
    const NativeWorker = window.Worker
    window.Worker = new Proxy(NativeWorker, {
      construct(target, ctorArgs) {
        const instance = new target(...ctorArgs)
        workerIds.set(instance, ++workers)
        store.workers.push({ worker: workers, url: String(ctorArgs[0]), created: clock() })
        return instance
      },
    })
    const post = Worker.prototype.postMessage
    Worker.prototype.postMessage = function (data, ...rest) {
      watch(this, (reply, t) => {
        if (reply && typeof reply.requestId === 'number')
          for (const entry of store.worker)
            if (entry.worker === workerIds.get(this) && entry.requestId === reply.requestId && entry.got === undefined) { entry.got = t; entry.reply = reply.type }
      })
      if (data && typeof data.requestId === 'number')
        store.worker.push({ worker: workerIds.get(this), requestId: data.requestId, type: data.type, sent: clock() })
      return post.call(this, data, ...rest)
    }
    const portPost = MessagePort.prototype.postMessage
    MessagePort.prototype.postMessage = function (data, ...rest) {
      const port = portId(this)
      watch(this, (reply, t) => {
        if (reply && reply.type === 'render-ack')
          for (const entry of store.render)
            if (entry.port === port && entry.requestId === reply.requestId && entry.got === undefined) { entry.got = t; entry.status = reply.status }
      })
      if (isRender(data)) store.render.push({ port, requestId: data.requestId, kind: data.type, sent: clock() })
      return portPost.call(this, data, ...rest)
    }
    // The iframe `load` event does not bubble; a capturing listener on the document sees it.
    document.addEventListener('load', (event) => {
      if (event.target instanceof HTMLIFrameElement) store.loads.push(clock())
    }, true)
    document.addEventListener('input', (event) => store.inputs.push(performance.timeOrigin + event.timeStamp), true)
  } else {
    // The first specimen the preview draws, compiled or precompiled: the element carrying a recipe scope, then the
    // frame that shows it (a task queued from the next animation frame, as for the acks below).
    const seeSpecimen = () => {
      if (store.specimen || !document.querySelector('[data-ombelle-recipe]')) return
      store.specimen = { seen: clock(), frame: null }
      requestAnimationFrame(() => setTimeout(() => { store.specimen.frame = clock() }, 0))
      specimenObserver.disconnect()
    }
    const specimenObserver = new MutationObserver(seeSpecimen)
    specimenObserver.observe(document, { subtree: true, childList: true, attributes: true, attributeFilter: ['data-ombelle-recipe'] })
    const portPost = MessagePort.prototype.postMessage
    MessagePort.prototype.postMessage = function (data, ...rest) {
      if (data && data.type === 'render-ack') {
        store.acks.push({ port: portId(this), requestId: data.requestId, status: data.status, t: clock() })
        // The ack follows the state update; the frame that shows it is produced once a task queued from the next
        // animation frame runs, read in the iframe's own process.
        if (data.status === 'applied') requestAnimationFrame(() => setTimeout(() => store.frames.push({ requestId: data.requestId, t: clock() }), 0))
      }
      return portPost.call(this, data, ...rest)
    }
    window.addEventListener('message', (event) => {
      for (const port of event.ports ?? []) {
        const id = portId(port)
        watch(port, (incoming, t) => {
          if (isRender(incoming)) store.received.push({ port: id, requestId: incoming.requestId, t })
        })
      }
    }, true)
  }
}

const median = (values) => {
  const sorted = values.filter((value) => value !== null && value !== undefined).sort((a, b) => a - b)
  const n = sorted.length
  if (!n) return null
  return n % 2 ? sorted[(n - 1) / 2] : (sorted[n / 2 - 1] + sorted[n / 2]) / 2
}
const round = (value) => (value === null || value === undefined ? null : Math.round(value * 10) / 10)

const browser = await chromium.launch({ channel: process.env.OMBELLE_BROWSER_CHANNEL || undefined })

/** The first editable text field of the properties panel: a recipe edit that recompiles. */
async function editField(page) {
  const field = page.locator('.properties input[type="text"]:not([readonly]), .properties textarea').first()
  await field.waitFor({ state: 'visible', timeout })
  return field
}

/** One page load of `/editor/component/<id>`, and `edits` recipe edits afterwards. */
async function measureLoad(id, edits) {
  const context = await browser.newContext({ viewport: { width: 1100, height: 800 }, reducedMotion: 'reduce' })
  try {
    await context.addInitScript(instrument)
    const page = await context.newPage()
    const cdp = await context.newCDPSession(page)
    await cdp.send('Network.enable')
    const url = `${origin}/editor/component/${id}`
    const settle = async () => {
      // A render has been acked for the latest compile, and the editor's "Get code" is enabled.
      await page.waitForFunction(() => {
        const button = [...document.querySelectorAll('button')].find((el) => el.textContent?.trim() === 'Get code')
        return !!button && !button.disabled
      }, undefined, { timeout, polling: 100 })
      await page.waitForTimeout(500)
    }
    if (warm) {
      await page.goto(url, { waitUntil: 'load' })
      await settle()
    } else {
      await cdp.send('Network.setCacheDisabled', { cacheDisabled: true })
    }
    // The iframe's script requests, counted from this navigation on.
    const scripts = new Set()
    page.on('request', (request) => {
      if (request.resourceType() === 'script' && new URL(request.url()).pathname.startsWith('/ombelle-preview/')) scripts.add(request.url())
    })
    await page.goto(url, { waitUntil: 'commit' })
    await page.waitForFunction(() => window.__m && window.__m.render.some((e) => e.got !== undefined && e.status === 'applied'), undefined, { timeout, polling: 'raf' })
    // Let the frame after the first ack happen.
    await page.waitForFunction(() => true)
    await settle()
    await cdp.send('Network.setCacheDisabled', { cacheDisabled: false })

    const timing = await page.evaluate(() => {
      const entries = performance.getEntriesByType('resource').map((e) => ({ name: e.name, initiatorType: e.initiatorType, start: e.startTime, duration: e.duration,
        responseEnd: e.responseEnd, transferSize: e.transferSize, encodedBodySize: e.encodedBodySize }))
      return { origin: performance.timeOrigin, entries }
    })
    const frame = await (await page.locator('iframe').first().elementHandle()).contentFrame()
    const inner0 = await frame.evaluate(() => window.__m)
    const top0 = await page.evaluate(() => window.__m)
    const workerEntry = timing.entries.find((e) => e.name.endsWith('/editor-compiler.worker.js'))
    const iframeEntry = timing.entries.find((e) => e.initiatorType === 'iframe')
    // Compile requests of the editor's own worker (not the reference batch, which is a `compile-batch`).
    const compiles = (store) => store.worker.filter((e) => e.type === 'compile' || e.type === 'compile-catalog')
    const firstCompile = compiles(top0).find((e) => e.got !== undefined)
    const firstWorker = top0.workers.find((w) => w.worker === firstCompile?.worker)
    const firstRender = top0.render.find((e) => e.got !== undefined && e.status === 'applied')
    const firstArrival = firstRender && inner0.received.filter((r) => r.requestId === firstRender.requestId && r.t >= firstRender.sent - 1).sort((a, b) => a.t - b.t)[0]
    const firstFrame = firstArrival && inner0.frames.find((f) => f.requestId === firstRender.requestId)
    const load = {
      // Navigation start until the iframe's `load` event.
      iframeLoadMs: top0.loads.length ? round(top0.loads[0] - timing.origin) : null,
      // Network and parse time of the iframe document itself, and the worker script (Resource Timing).
      iframeDocumentMs: iframeEntry ? round(iframeEntry.duration) : null,
      workerDownloadMs: workerEntry ? round(workerEntry.duration) : null,
      workerBytes: workerEntry?.encodedBodySize ?? null,
      firstCompileMs: firstCompile ? round(firstCompile.got - firstCompile.sent) : null,
      workerStartToFirstReplyMs: firstCompile && firstWorker ? round(firstCompile.got - firstWorker.created) : null,
      // The first render post to its ack: the iframe's verification compile and state update.
      iframeFillMs: firstRender ? round(firstRender.got - firstRender.sent) : null,
      // Navigation start until the first frame produced after the first applied render.
      firstRenderMs: firstFrame ? round(firstFrame.t - timing.origin) : null,
      // Navigation start until the first frame showing a specimen, compiled or precompiled (the user's first view).
      firstPreviewMs: inner0.specimen?.frame ? round(inner0.specimen.frame - timing.origin) : null,
      workerGotToRenderPostMs: firstCompile && firstRender ? round(firstRender.sent - firstCompile.got) : null,
      mainThreadDigestsBeforeFirstPost: firstRender ? top0.topDigests.filter((t) => t <= firstRender.sent).length : null,
      moduleRequests: scripts.size,
    }

    // Recipe edits: set the first text field and wait for the render that carries the edit.
    const recompileMs = [], iframeVerifyMs = [], iframeApplyMs = [], workerGotToRenderPostMs = [], editToFrameMs = [], verifyDetail = [], mainThreadDigests = []
    const field = edits ? await editField(page) : null
    for (let i = 0; i < edits; i++) {
      const before = await page.evaluate(() => ({ worker: window.__m.worker.length, render: window.__m.render.length, inputs: window.__m.inputs.length, digests: window.__m.topDigests.length }))
      await field.fill(`Edit ${i + 1} ${'x'.repeat(i % 3)}`)
      await page.waitForFunction((count) => window.__m.render.slice(count).some((e) => e.got !== undefined && e.status === 'applied'), before.render, { timeout, polling: 50 })
      await settle()
      const top = await page.evaluate(() => window.__m)
      const inner = await frame.evaluate(() => window.__m)
      // The compile this edit caused, and the render post that carried it.
      const compile = compiles(top).slice(compiles({ worker: top.worker.slice(0, before.worker) }).length).find((e) => e.got !== undefined)
      const render = top.render.slice(before.render).find((e) => e.got !== undefined && e.status === 'applied' && e.sent >= (compile?.got ?? 0) - 1)
      if (!compile || !render) throw new Error(`edit ${i + 1} of ${id}: no compile or applied render recorded`)
      const arrival = inner.received.filter((r) => r.requestId === render.requestId && r.t >= render.sent - 1).sort((a, b) => a.t - b.t)[0]
      const ack = inner.acks.find((a) => a.port === arrival.port && a.requestId === render.requestId)
      const digests = inner.digests.filter((d) => d >= arrival.t && d <= ack.t)
      const frameAt = inner.frames.find((f) => f.requestId === render.requestId)
      const inputAt = top.inputs[before.inputs]
      recompileMs.push(round(compile.got - compile.sent))
      // Message arrival in the iframe to the ack: validation of the message, the compile, and the state update.
      iframeVerifyMs.push(round(ack.t - arrival.t))
      iframeApplyMs.push(round(render.got - render.sent))
      workerGotToRenderPostMs.push(round(render.sent - compile.got))
      // Digests the editor page itself made from the edit to the render post: its own verification compiles on the main thread.
      mainThreadDigests.push(top.topDigests.slice(before.digests).filter((t) => t <= render.sent).length)
      editToFrameMs.push(frameAt && inputAt !== undefined ? round(frameAt.t - inputAt) : null)
      verifyDetail.push({
        postToReceiveMs: round(arrival.t - render.sent),
        receiveToFirstDigestMs: digests.length ? round(digests[0] - arrival.t) : null,
        firstToLastDigestMs: digests.length ? round(digests.at(-1) - digests[0]) : null,
        lastDigestToAckMs: digests.length ? round(ack.t - digests.at(-1)) : null,
        ackToFrameMs: frameAt ? round(frameAt.t - ack.t) : null,
        digestCount: digests.length,
      })
    }
    const top = await page.evaluate(() => window.__m)
    return {
      load, recompileMs, iframeVerifyMs, iframeApplyMs, workerGotToRenderPostMs, mainThreadDigests, editToFrameMs, verifyDetail,
      workerRequests: top.worker.map((e) => ({ type: e.type, ms: e.got === undefined ? null : round(e.got - e.sent) })),
      workers: top.workers.length,
      channels: new Set(top.render.map((e) => e.port)).size,
      renders: top.render.length,
    }
  } finally {
    await context.close()
  }
}

const output = {}
try {
  for (const id of ids) {
    const loads = []
    // The last load also performs the edits, so the edit series is measured on a page that has been settled.
    for (let i = 0; i < runs; i++) loads.push(await measureLoad(id, i === runs - 1 ? runs : 0))
    const edit = loads.at(-1)
    const med = (key) => round(median(loads.map((entry) => entry.load[key])))
    output[id] = {
      mode: warm ? 'warm' : 'cold',
      iframeLoadMs: med('iframeLoadMs'),
      workerDownloadMs: med('workerDownloadMs'),
      firstCompileMs: med('firstCompileMs'),
      iframeFillMs: med('iframeFillMs'),
      firstRenderMs: med('firstRenderMs'),
      firstPreviewMs: med('firstPreviewMs'),
      recompileMs: edit.recompileMs,
      iframeVerifyMs: edit.iframeVerifyMs,
      moduleRequests: med('moduleRequests'),
      medians: {
        iframeDocumentMs: med('iframeDocumentMs'),
        workerStartToFirstReplyMs: med('workerStartToFirstReplyMs'),
        workerGotToRenderPostMsFirst: med('workerGotToRenderPostMs'),
        recompileMs: round(median(edit.recompileMs)),
        iframeVerifyMs: round(median(edit.iframeVerifyMs)),
        iframeApplyMs: round(median(edit.iframeApplyMs)),
        workerGotToRenderPostMs: round(median(edit.workerGotToRenderPostMs)),
        editToFrameMs: round(median(edit.editToFrameMs)),
        verifyFirstToLastDigestMs: round(median(edit.verifyDetail.map((d) => d.firstToLastDigestMs))),
        ackToFrameMs: round(median(edit.verifyDetail.map((d) => d.ackToFrameMs))),
      },
      editDetail: { iframeApplyMs: edit.iframeApplyMs, workerGotToRenderPostMs: edit.workerGotToRenderPostMs, mainThreadDigests: edit.mainThreadDigests,
        editToFrameMs: edit.editToFrameMs, verifyDetail: edit.verifyDetail, workerRequests: edit.workerRequests, workers: edit.workers, channels: edit.channels },
      loads: loads.map((entry) => entry.load),
    }
  }
} finally {
  await browser.close()
}
console.log(JSON.stringify(output, null, 2))
