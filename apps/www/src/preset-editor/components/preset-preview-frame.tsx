'use client'
import { useEffect, useRef, useState } from 'react'
import type { CompileResult, Preset } from '@ombelle/contracts'
import { previewFrameUrl } from '../../editor/preview-url'
import {
  isPresetAck,
  isPresetHandshake,
  presetHashOf,
  sentPresetView,
  type PresetAck,
  type PresetRender,
  type PresetTokens,
  type PresetView,
} from '../preview-protocol'

const noHash = '0'.repeat(64)
type Sent = { requestId: number; hash: string | null; tokens: boolean }

export function PresetPreviewFrame({
  result,
  preset = null,
  draftInvalid = false,
  view,
  stale,
  onStatus,
  title = 'Global preset gallery',
  height = 760,
  caption = true,
  sender,
}: {
  result: CompileResult | null
  /** Opt-in fast path: a non-glass preset is sent as tokens on every change, with no compile result needed. */
  preset?: Preset | null
  /** The worker found the current draft invalid, though the preview of it is shown. */
  draftInvalid?: boolean
  view: PresetView
  stale: boolean
  onStatus: (status: 'connecting' | 'ready' | 'failed') => void
  title?: string
  height?: number
  caption?: boolean
  /**
   * Fast path only: filled with a function that sends a preset at once, so an editor can post an
   * edit from its input handler, before it re-renders. The render that follows does not send it again.
   */
  sender?: { current: ((preset: Preset) => void) | null }
}) {
  const frame = useRef<HTMLIFrameElement>(null),
    port = useRef<MessagePort | null>(null)
  const sequence = useRef(0),
    latestSent = useRef<Sent | null>(null),
    pendingAck = useRef<PresetAck | null>(null),
    // The fast-path message last posted on this port, as preset and view: an equal one is not posted again.
    sentKey = useRef<string | null>(null)
  const fast = preset !== null && preset.styleFamily !== 'liquid-glass'
  const latest = useRef({ result, preset, fast, view, onStatus })
  latest.current = { result, preset, fast, view, onStatus }
  const [attempt, setAttempt] = useState(0)
  const [failed, setFailed] = useState(false)
  const deadline = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
  function fail() {
    setFailed(true)
    latest.current.onStatus('failed')
  }
  function arm() {
    clearTimeout(deadline.current)
    deadline.current = setTimeout(fail, 10000)
  }
  function settle(ack: PresetAck) {
    const sent = latestSent.current
    if (!sent || ack.requestId !== sent.requestId) return
    // The iframe acks a rejected tokens message with no hash to match.
    const refused = sent.tokens && ack.status === 'rejected' && ack.presetHash === noHash
    if (!refused) {
      // The awaited hash is still resolving: compare when it does.
      if (sent.hash === null) {
        pendingAck.current = ack
        return
      }
      if (ack.presetHash !== sent.hash) return
    }
    pendingAck.current = null
    clearTimeout(deadline.current)
    if (ack.status === 'rejected') {
      fail()
      return
    }
    setFailed(false)
    latest.current.onStatus('ready')
  }
  function send(options: { force?: boolean; preset?: Preset } = {}) {
    const { result, fast, view } = latest.current
    const preset = options.preset ?? latest.current.preset
    if (!port.current || (fast ? !preset : !result)) return
    const key = fast ? JSON.stringify([preset, sentPresetView(view)]) : null
    if (key !== null && !options.force && key === sentKey.current) return
    sentKey.current = key
    const requestId = ++sequence.current
    pendingAck.current = null
    if (fast) {
      const message: PresetTokens = {
        type: 'preset-tokens',
        requestId,
        preset: preset!,
        view: sentPresetView(view),
      }
      const sent: Sent = { requestId, hash: null, tokens: true }
      latestSent.current = sent
      arm()
      port.current.postMessage(message)
      presetHashOf(preset!).then(
        (hash) => {
          if (latestSent.current !== sent) return
          sent.hash = hash
          const early = pendingAck.current
          if (early) settle(early)
        },
        () => {},
      )
      return
    }
    const message: PresetRender = {
      type: 'preset-render',
      requestId,
      result: result!,
      view: sentPresetView(view),
    }
    latestSent.current = { requestId, hash: result!.preset.hash, tokens: false }
    arm()
    port.current.postMessage(message)
  }
  useEffect(() => {
    setFailed(false)
    latest.current.onStatus('connecting')
    arm()
    function ready(event: MessageEvent<unknown>) {
      if (
        event.source !== frame.current?.contentWindow ||
        event.origin !== 'null' ||
        !isPresetHandshake(event.data, 'ready')
      )
        return
      port.current?.close()
      sequence.current = 0
      latestSent.current = null
      pendingAck.current = null
      sentKey.current = null
      const channel = new MessageChannel(),
        current = channel.port1
      port.current = current
      current.onmessage = (event: MessageEvent<unknown>) => {
        if (port.current !== current || !isPresetAck(event.data)) return
        settle(event.data)
      }
      current.start()
      frame.current?.contentWindow?.postMessage(
        { type: 'ombelle-preset-preview-init', version: 1 },
        '*',
        [channel.port2],
      )
      send({ force: true })
    }
    window.addEventListener('message', ready)
    return () => {
      window.removeEventListener('message', ready)
      clearTimeout(deadline.current)
      port.current?.close()
      port.current = null
      latestSent.current = null
    }
  }, [attempt])
  useEffect(() => {
    if (!sender) return
    sender.current = (preset) => {
      if (latest.current.fast && preset.styleFamily !== 'liquid-glass') send({ preset })
    }
    return () => {
      sender.current = null
    }
  }, [sender])
  useEffect(() => {
    send()
  }, [fast ? preset : null, fast ? null : result, fast, view.mode, view.viewport, view.focus, view.scene, view.backdrop, view.labInk, view.reducedTransparency])
  return (
    <section aria-label="Preset preview">
      {caption && (
        <p>
          {stale
            ? 'Previous valid preview'
            : draftInvalid
              ? 'Preview of a draft that cannot be exported yet'
              : 'Current preset preview'}
        </p>
      )}
      {failed && (
        <p role="alert">
          Preview unavailable. You can still export a valid preset.{' '}
          <button
            type="button"
            onClick={() => setAttempt((value) => value + 1)}
          >
            Retry preview
          </button>
        </p>
      )}
      <iframe
        key={attempt}
        ref={frame}
        title={title}
        src={previewFrameUrl('preset', process.env.NEXT_PUBLIC_OMBELLE_PREVIEW_ORIGIN)}
        sandbox="allow-scripts"
        // Code Block's Copy writes to the clipboard from inside the preview.
        allow="clipboard-write"
        style={{
          // Block layout keeps the frame off the text baseline, whose font
          // metrics would put it at a fractional offset.
          display: 'block',
          width: view.viewport === 'narrow' ? '320px' : '100%',
          // The 320 px preview sits in the middle of the preview column, like the component editors'.
          marginInline: 'auto',
          maxWidth: '100%',
          height: height + 'px',
          border: '1px solid var(--border)',
          borderRadius: '8px',
        }}
      />
    </section>
  )
}
