import { compile } from '@ombelle/compiler'
import {
  supportedComponentIds,
  type CompileResult,
  type PresetSnapshot,
} from '@ombelle/contracts'

type FrameStatus = 'connecting' | 'ready' | 'failed'
type Status = 'compiling' | FrameStatus
export type SnapshotPreviewState = {
  identity: string
  result: CompileResult | null
  status: Status
  onStatus: (status: FrameStatus) => void
}
const identity = (snapshot: PresetSnapshot) =>
  `${snapshot.id}@${snapshot.revision}:${snapshot.presetHash}`

/** One effect-owned compile/transport lifetime. Disposed sessions never notify. */
export function createSnapshotPreviewSession(
  snapshot: PresetSnapshot,
  options: {
    compile?: () => Promise<CompileResult>
    notify?: (state: SnapshotPreviewState) => void
    isCurrent?: () => boolean
  } = {},
) {
  let disposed = false
  const current = () => !disposed && options.isCurrent?.() !== false
  let state: SnapshotPreviewState = {
    identity: identity(snapshot),
    result: null,
    status: 'compiling',
    onStatus,
  }
  function update(next: SnapshotPreviewState) {
    if (!current()) return
    state = next
    options.notify?.(state)
  }
  function onStatus(status: FrameStatus) {
    if (state.result) update({ ...state, status })
  }
  return {
    get state() {
      return state
    },
    async start() {
      update(state)
      try {
        const result = await (options.compile?.() ??
          compile({
            preset: snapshot.preset,
            componentIds: supportedComponentIds,
            catalogRelease: snapshot.catalogRelease,
            compilerVersion: snapshot.compilerVersion,
          }))
        if (result.preset.hash !== snapshot.presetHash)
          throw new Error('Snapshot hash mismatch')
        update({ ...state, result, status: 'connecting' })
      } catch {
        update({ ...state, result: null, status: 'failed' })
      }
    },
    dispose() {
      disposed = true
    },
  }
}

/** Also gates the render before React runs replacement effect cleanup. */
export function selectSnapshotPreview(
  snapshot: PresetSnapshot,
  state: SnapshotPreviewState | null,
) {
  const visible = state?.identity === identity(snapshot) ? state : null
  const status: Status = visible?.status ?? 'compiling'
  const messages: Record<Status, string> = {
    compiling: 'Compiling snapshot preview…',
    connecting: 'Connecting snapshot gallery…',
    ready: 'Snapshot gallery ready.',
    failed: visible?.result
      ? 'Gallery unavailable. Preset JSON remains available.'
      : 'Preview compilation unavailable. Preset JSON remains available.',
  }
  return {
    status,
    message: messages[status],
    frame: visible?.result
      ? {
          key: visible.identity,
          result: visible.result,
          onStatus: visible.onStatus,
        }
      : null,
  }
}
