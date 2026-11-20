'use client'

import { useEffect, useRef, useState } from 'react'
import type { InstallableRecipeCompileResult, ComponentRecipe, ComponentRecipeCompileResult, Recipe } from '@ombelle/contracts'
import type { EditorView } from '../model'
import { isPreviewAck, isPreviewReady, verifyPreviewCompileResult, type ButtonMatrixRender, type PreviewRender } from '../preview-protocol'
import { previewFrameUrl } from '../preview-url'
import { acceptPreviewSize, previewFrameHeight } from '../preview-size'
import { acceptButtonMeasure, acceptCatalogMeasure, verifyCatalogCompileResult, type CatalogMatrixRender, type CatalogPreviewRender, type MeasuredParts } from '../catalog-preview-protocol'

/** The Matrix layout's cells, compiled; sent in place of the single render while set. */
export type PreviewMatrix = {
  rows: string
  columns: string | null
  /** The Button's row of forced states for the current cell. */
  states: boolean
  cells: { row: string | number; column: string | number | null; current: boolean; result: InstallableRecipeCompileResult }[]
}

/**
 * The default recipe the preview shows before the first compile: the preview bundles it, compiled at build
 * time, and shows it once the editor connects. family is the current recipe's, null when the recipe is not
 * a default; the frame connects only once settled, after the editor has restored its draft, and keeps the
 * family it had then, so later edits do not reload the preview.
 */
export type PrecompiledDefault = { family: string | null; settled: boolean }

export function PreviewFrame({ result, view, component, componentName = 'Button', onMeasure, reducedTransparency = false, matrix = null, precompiled }: {
  result: InstallableRecipeCompileResult | null; view: EditorView
  precompiled?: PrecompiledDefault
  /** Simulates prefers-reduced-transparency in the preview. Preview state only, never saved. */
  reducedTransparency?: boolean
  /** The Matrix layout, compiled; the single render is sent while it is null. */
  matrix?: PreviewMatrix | null
  component?: ComponentRecipe['component']; componentName?: string
  /** Receives the rendered part dimensions of the latest render; the Button reports its 'button' slot. */
  onMeasure?(parts: MeasuredParts): void
}) {
  const iframe = useRef<HTMLIFrameElement>(null)
  const port = useRef<MessagePort | null>(null)
  const latest = useRef({ result, view, reducedTransparency, matrix })
  // The preview's content height, reported by the sandbox; null until it reports.
  const [contentSize, setContentSize] = useState<number | null>(null)
  const nextRequestId = useRef(0)
  const sendEpoch = useRef(0)
  const lastAck = useRef(0)
  latest.current = { result, view, reducedTransparency, matrix }
  const measured = useRef(onMeasure)
  measured.current = onMeasure
  // The same measurement again changes nothing in the editor, so it is not passed on.
  const lastMeasure = useRef('')
  const report = (parts: MeasuredParts) => {
    const key = JSON.stringify(parts)
    if (key === lastMeasure.current) return
    lastMeasure.current = key
    measured.current?.(parts)
  }

  async function sendCurrent(targetPort: MessagePort) {
    const epoch = ++sendEpoch.current
    const current = latest.current
    const flag = current.reducedTransparency ? { reducedTransparency: true as const } : {}
    if (current.matrix && component) {
      const message: CatalogMatrixRender = {
        type: 'catalog-matrix-render', component, requestId: ++nextRequestId.current,
        rows: current.matrix.rows, columns: current.matrix.columns,
        cells: current.matrix.cells.map(({ row, column, current: isCurrent, result: cell }) =>
          ({ row, column, current: isCurrent, result: cell as ComponentRecipeCompileResult })),
        mode: current.view.mode, viewport: current.view.viewport, ...flag,
      }
      targetPort.postMessage(message)
      return
    }
    if (current.matrix) {
      const message: ButtonMatrixRender = {
        type: 'matrix-render', requestId: ++nextRequestId.current, rows: current.matrix.rows, columns: current.matrix.columns, states: current.matrix.states,
        cells: current.matrix.cells.map(({ row, column, current: isCurrent, result: cell }) => ({
          row: String(row), column: column === null ? null : String(column), current: isCurrent, scope: cell.scope,
          css: cell.artifacts.find((artifact) => artifact.kind === 'style')?.content ?? '', recipe: cell.recipe.data as Recipe,
        })),
        mode: current.view.mode, viewport: current.view.viewport, ...flag,
      }
      targetPort.postMessage(message)
      return
    }
    if (component) {
      const result = await verifyCatalogCompileResult(current.result, component)
      if (epoch !== sendEpoch.current || targetPort !== port.current || !result) return
      const message: CatalogPreviewRender = {
        type: 'catalog-render', component, requestId: ++nextRequestId.current,
        result, mode: current.view.mode, viewport: current.view.viewport,
        ...(current.reducedTransparency ? { reducedTransparency: true as const } : {}),
      }
      targetPort.postMessage(message)
      return
    }
    const compiled = await verifyPreviewCompileResult(current.result)
    if (epoch !== sendEpoch.current || targetPort !== port.current || !compiled) return
    const css = compiled.artifacts.find((artifact) => artifact.kind === 'style')?.content
    if (!css) return
    const requestId = ++nextRequestId.current
    const message: PreviewRender = {
      type: 'render', requestId, scope: compiled.scope,
      state: { recipe: compiled.recipe.data, css, mode: current.view.mode,
        viewport: current.view.viewport, forcedState: current.view.forcedState, requestId,
        ...(current.reducedTransparency ? { reducedTransparency: true as const } : {}) },
    }
    targetPort.postMessage(message)
  }

  const hold = precompiled?.settled === false
  // The family named in the preview's URL: the recipe's as the frame becomes able to connect, then fixed.
  const [connectedFamily, setConnectedFamily] = useState<string | null | undefined>(undefined)
  if (precompiled?.settled && connectedFamily === undefined) setConnectedFamily(precompiled.family)
  const defaultFamily = connectedFamily !== undefined ? connectedFamily : precompiled?.family ?? null
  useEffect(() => {
    // Until the editor has restored its draft, the preview is not answered, so it cannot show a default the draft replaced.
    if (hold) return
    function onReady(event: MessageEvent<unknown>) {
      if (event.source !== iframe.current?.contentWindow || event.origin !== 'null' ||
        !isPreviewReady(event.data)) return
      port.current?.close()
      const channel = new MessageChannel()
      port.current = channel.port1
      lastAck.current = 0
      channel.port1.onmessage = (ack: MessageEvent<unknown>) => {
        if (port.current !== channel.port1) return
        const size = acceptPreviewSize(ack.data)
        if (size !== null) {
          setContentSize(size)
          return
        }
        const measure = component ? acceptCatalogMeasure(ack.data, component) : null
        if (measure) {
          // Only the render the preview applied last describes the current recipe.
          if (measure.requestId === lastAck.current) report(measure.parts)
          return
        }
        const button = component ? null : acceptButtonMeasure(ack.data)
        if (button) {
          if (button.requestId === lastAck.current) report({ button: button.values })
          return
        }
        if (port.current !== channel.port1 || !isPreviewAck(ack.data) || ack.data.requestId > nextRequestId.current ||
          ack.data.requestId <= lastAck.current) return
        if (ack.data.status === 'applied') lastAck.current = ack.data.requestId
      }
      channel.port1.start()
      iframe.current?.contentWindow?.postMessage({ type: 'ombelle-preview-init', version: 1 }, '*', [channel.port2])
      void sendCurrent(channel.port1)
    }
    window.addEventListener('message', onReady)
    return () => {
      window.removeEventListener('message', onReady)
      sendEpoch.current++
      port.current?.close()
      port.current = null
    }
  }, [component, hold])

  useEffect(() => {
    if (port.current) void sendCurrent(port.current)
  }, [result, view, reducedTransparency, matrix])

  const url = previewFrameUrl('editor', process.env.NEXT_PUBLIC_OMBELLE_PREVIEW_ORIGIN)
  const query = new URLSearchParams()
  if (component) query.set('component', component)
  if (defaultFamily) query.set('default', defaultFamily)
  const search = query.toString() ? `?${query}` : ''
  return <iframe ref={iframe} title={`${componentName} recipe preview`}
    src={url + search} sandbox="allow-scripts" allow="clipboard-write" style={{ height: previewFrameHeight(contentSize) }} />
}
