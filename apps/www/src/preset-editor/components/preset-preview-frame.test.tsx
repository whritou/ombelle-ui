// @vitest-environment jsdom
import { act, createElement } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, expect, it, vi, type Mock } from 'vitest'
import { getCatalog } from '@ombelle/catalog'
import type { CompileResult, Preset } from '@ombelle/contracts'
import { presetHashOf, type PresetView } from '../preview-protocol'
import { PresetPreviewFrame } from './preset-preview-frame'

;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

const flat = (radius = 0.5): Preset => {
  const preset = structuredClone(getCatalog('0.1.0').presets.flat)
  preset.design.radiusRem = radius
  return preset
}
const glass = getCatalog('0.1.0').presets['liquid-glass']
const view: PresetView = { mode: 'light', viewport: 'wide' }
const result = (hash: string) => ({ preset: { data: flat(), hash }, artifacts: [] }) as unknown as CompileResult
const zero = '0'.repeat(64)

let host: HTMLElement, root: Root, onStatus: Mock<(status: 'connecting' | 'ready' | 'failed') => void>
let sent: { type: string; requestId: number }[]
let port: MessagePort | undefined

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] })
  host = document.body.appendChild(document.createElement('div'))
  root = createRoot(host)
  onStatus = vi.fn()
  sent = []
  port = undefined
})
afterEach(() => {
  act(() => root.unmount())
  host.remove()
  port?.close()
  vi.useRealTimers()
})

type Props = {
  preset?: Preset | null
  result?: CompileResult | null
  view?: PresetView
  draftInvalid?: boolean
  sender?: { current: ((preset: Preset) => void) | null }
}
function render(props: Props) {
  act(() =>
    root.render(
      createElement(PresetPreviewFrame, {
        result: null,
        view,
        stale: false,
        onStatus,
        ...props,
      }),
    ),
  )
}
/** Plays the iframe: answers the ready handshake and records what the frame sends over the port. */
function handshake() {
  const win = host.querySelector('iframe')!.contentWindow!
  win.postMessage = ((message: unknown, _origin: unknown, transfer: MessagePort[]) => {
    if ((message as { type: string }).type !== 'ombelle-preset-preview-init') return
    port?.close()
    port = transfer[0]
    port.onmessage = (event) => sent.push(event.data)
    port.start()
  }) as typeof win.postMessage
  act(() => {
    window.dispatchEvent(
      new MessageEvent('message', {
        source: win,
        origin: 'null',
        data: { type: 'ombelle-preset-preview-ready', version: 1 },
      }),
    )
  })
}
const flush = () => act(async () => { await new Promise((resolve) => setImmediate(resolve)) })
async function ack(requestId: number, presetHash: string, status: 'applied' | 'rejected' = 'applied') {
  port!.postMessage({ type: 'preset-render-ack', requestId, presetHash, status })
  await flush()
}

it('posts preset-tokens in the same flush as a change, never preset-render', async () => {
  render({ preset: flat(0.5), result: result('a'.repeat(64)) })
  handshake()
  await flush()
  expect(sent.map((m) => m.type)).toEqual(['preset-tokens'])
  const edited = flat(0.75)
  render({ preset: edited, result: result('a'.repeat(64)) })
  await flush()
  expect(sent.map((m) => m.type)).toEqual(['preset-tokens', 'preset-tokens'])
  expect(sent[1].requestId).toBeGreaterThan(sent[0].requestId)
  // A new worker result alone sends nothing.
  render({ preset: edited, result: result('b'.repeat(64)) })
  await flush()
  expect(sent).toHaveLength(2)
})
it('sends an edit through the sender before the render, and the render does not repeat it', async () => {
  const sender: { current: ((preset: Preset) => void) | null } = { current: null }
  render({ preset: flat(0.5), sender })
  handshake()
  await flush()
  expect(sent).toHaveLength(1)
  const edited = flat(0.75)
  act(() => sender.current!(edited))
  await flush()
  expect(sent).toHaveLength(2)
  expect((sent[1] as unknown as { preset: Preset }).preset.design.radiusRem).toBe(0.75)
  // The render with an equal preset finds it already sent.
  render({ preset: flat(0.75), sender })
  await flush()
  expect(sent).toHaveLength(2)
  await ack(sent[1].requestId, await presetHashOf(edited))
  expect(onStatus).toHaveBeenLastCalledWith('ready')
  // A glass preset never takes the early path.
  act(() => sender.current!(glass))
  await flush()
  expect(sent).toHaveLength(2)
})
it('reports ready only for the latest request with the awaited preset hash', async () => {
  const first = flat(0.5), second = flat(0.75)
  render({ preset: first })
  handshake()
  await flush()
  render({ preset: second })
  await flush()
  await act(async () => { await presetHashOf(second) })
  await ack(sent[0].requestId, await presetHashOf(first))
  expect(onStatus).not.toHaveBeenCalledWith('ready')
  await ack(sent[1].requestId, 'c'.repeat(64))
  expect(onStatus).not.toHaveBeenCalledWith('ready')
  await ack(sent[1].requestId, await presetHashOf(second))
  expect(onStatus).toHaveBeenLastCalledWith('ready')
})
it('accepts an ack that arrives before the hash resolves', async () => {
  const preset = flat(0.6)
  render({ preset })
  handshake()
  await flush()
  await ack(sent[0].requestId, await presetHashOf(preset))
  expect(onStatus).toHaveBeenLastCalledWith('ready')
})
it('fails the preview when the iframe rejects the tokens', async () => {
  render({ preset: flat() })
  handshake()
  await flush()
  await ack(sent[0].requestId, zero, 'rejected')
  expect(onStatus).toHaveBeenLastCalledWith('failed')
})
it('falls back to preset-render with the result for a glass preset', async () => {
  const compiled = result('d'.repeat(64))
  render({ preset: flat(), result: compiled })
  handshake()
  await flush()
  render({ preset: glass, result: compiled })
  await flush()
  expect(sent.map((m) => m.type)).toEqual(['preset-tokens', 'preset-render'])
  expect(sent[1].requestId).toBeGreaterThan(sent[0].requestId)
})
it('sends preset-tokens first after Retry preview', async () => {
  render({ preset: flat() })
  handshake()
  await flush()
  act(() => { vi.advanceTimersByTime(10001) })
  const retry = [...host.querySelectorAll('button')].find((b) => b.textContent === 'Retry preview')!
  act(() => retry.click())
  sent.length = 0
  handshake()
  await flush()
  expect(sent.map((m) => m.type)).toEqual(['preset-tokens'])
  expect(sent[0].requestId).toBe(1)
})
it('names a draft that cannot be exported yet', () => {
  render({ preset: flat(), draftInvalid: true })
  expect(host.textContent).toContain('Preview of a draft that cannot be exported yet')
  render({ preset: flat(), draftInvalid: true, stale: true } as Props)
  expect(host.textContent).toContain('Previous valid preview')
})
it('without the prop keeps preset-render behaviour', async () => {
  render({ result: result('e'.repeat(64)) })
  handshake()
  await flush()
  expect(sent.map((m) => m.type)).toEqual(['preset-render'])
})
