'use client'
import { useEffect, useRef, useState } from 'react'
import type { CompileResult } from '@ombelle/contracts'
import { previewFrameUrl } from '../../editor/preview-url'
import {
  isPresetAck,
  isPresetHandshake,
  type PresetRender,
  type PresetView,
} from '../preview-protocol'

export function PresetPreviewFrame({
  result,
  view,
  stale,
  onStatus,
  title = 'Global preset gallery',
  height = 760,
  caption = true,
}: {
  result: CompileResult | null
  view: PresetView
  stale: boolean
  onStatus: (status: 'connecting' | 'ready' | 'failed') => void
  title?: string
  height?: number
  caption?: boolean
}) {
  const frame = useRef<HTMLIFrameElement>(null),
    port = useRef<MessagePort | null>(null)
  const sequence = useRef(0),
    latestSent = useRef<PresetRender | null>(null)
  const latest = useRef({ result, view, onStatus })
  latest.current = { result, view, onStatus }
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
  function send() {
    if (!port.current || !latest.current.result) return
    const message: PresetRender = {
      type: 'preset-render',
      requestId: ++sequence.current,
      result: latest.current.result,
      // Omit an unset focus: the sandbox accepts only exact view shapes.
      view: (({ mode, viewport, focus }) =>
        focus ? { mode, viewport, focus } : { mode, viewport })(
        latest.current.view,
      ),
    }
    latestSent.current = message
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
      const channel = new MessageChannel(),
        current = channel.port1
      port.current = current
      current.onmessage = (event: MessageEvent<unknown>) => {
        if (
          port.current !== current ||
          !isPresetAck(event.data) ||
          event.data.requestId !== latestSent.current?.requestId ||
          event.data.presetHash !== latestSent.current.result.preset.hash
        )
          return
        clearTimeout(deadline.current)
        if (event.data.status === 'rejected') {
          fail()
          return
        }
        setFailed(false)
        latest.current.onStatus('ready')
      }
      current.start()
      frame.current?.contentWindow?.postMessage(
        { type: 'ombelle-preset-preview-init', version: 1 },
        '*',
        [channel.port2],
      )
      send()
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
    send()
  }, [result, view.mode, view.viewport, view.focus])
  return (
    <section aria-label="Preset preview">
      {caption && (
        <p>{stale ? 'Previous valid preview' : 'Current preset preview'}</p>
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
        style={{
          width: view.viewport === 'narrow' ? '320px' : '100%',
          maxWidth: '100%',
          height: height + 'px',
          border: '1px solid var(--border)',
          borderRadius: '8px',
        }}
      />
    </section>
  )
}
