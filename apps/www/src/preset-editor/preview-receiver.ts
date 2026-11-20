import type { Preset } from '@ombelle/contracts'
import type { PresetAck, PresetRender, PresetTokens, PresetView } from './preview-protocol'
import { presetRuntimeStyles } from './preview-protocol'

export type ReceivedPreset = {
  requestId: number
  port: unknown
  family: Preset['styleFamily']
  design: Preset['design']
  hash: string
  css: string
  view: PresetView
}
export type PresetReceiverDeps = {
  port: unknown
  verifyRender: (input: unknown, previousRequestId: number) => Promise<PresetRender | null>
  verifyTokens: (
    input: unknown,
    previousRequestId: number,
  ) => Promise<{ message: PresetTokens; css: string; presetHash: string } | null>
  /** Gallery source check, resolved once; a failure blocks both message kinds. */
  sourcesValid: Promise<boolean>
  isCurrentPort: () => boolean
  /** Applies the state synchronously; the applied ack follows it. */
  apply: (state: ReceivedPreset) => void
  post: (ack: PresetAck) => void
}
const unknownHash = '0'.repeat(64)

/**
 * Handles messages on one preview port. One monotonic request id is shared by
 * `preset-render` and `preset-tokens`; the port and id are rechecked after every
 * await so a slower, older message never overwrites a newer one.
 */
export function createPresetReceiver(deps: PresetReceiverDeps) {
  let lastId = 0
  async function receive(data: unknown): Promise<void> {
    const kind = (data as { type?: unknown } | null)?.type
    let accepted: ReceivedPreset | null = null
    if (kind === 'preset-tokens') {
      const verified = await deps.verifyTokens(data, lastId)
      if (verified)
        accepted = {
          requestId: verified.message.requestId,
          port: deps.port,
          family: verified.message.preset.styleFamily,
          design: verified.message.preset.design,
          hash: verified.presetHash,
          css: verified.css,
          view: verified.message.view,
        }
    } else {
      const verified = await deps.verifyRender(data, lastId)
      if (verified)
        accepted = {
          requestId: verified.requestId,
          port: deps.port,
          family: verified.result.preset.data.styleFamily,
          design: verified.result.preset.data.design,
          hash: verified.result.preset.hash,
          css: presetRuntimeStyles(verified.result),
          view: verified.view,
        }
    }
    const sourcesValid = await deps.sourcesValid
    if (!deps.isCurrentPort()) return
    if (!accepted || !sourcesValid || accepted.requestId <= lastId) {
      const sent = data as { requestId?: unknown; result?: { preset?: { hash?: unknown } } } | null
      if (typeof sent?.requestId === 'number') {
        const presetHash =
          kind === 'preset-tokens' ? (accepted?.hash ?? unknownHash) : sent.result?.preset?.hash
        if (typeof presetHash === 'string')
          deps.post({
            type: 'preset-render-ack',
            requestId: sent.requestId,
            presetHash,
            status: 'rejected',
          })
      }
      return
    }
    lastId = accepted.requestId
    deps.apply(accepted)
    deps.post({
      type: 'preset-render-ack',
      requestId: accepted.requestId,
      presetHash: accepted.hash,
      status: 'applied',
    })
  }
  return { receive, lastRequestId: () => lastId }
}
