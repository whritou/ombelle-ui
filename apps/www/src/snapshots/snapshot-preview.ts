import type { CompileResult } from '@ombelle/contracts'

/**
 * What a published preset page previews, prepared on the server so the page loads no compiler:
 * a stable family is sent to the sandboxed gallery as tokens, which the gallery resolves and
 * verifies itself; liquid glass needs the compiled styles, compiled here once per request.
 */
export type SnapshotPreview = {
  frame: { kind: 'tokens' } | { kind: 'compiled'; result: CompileResult } | { kind: 'failed' }
  /** Some Liquid Glass text falls below 4.5:1 in the contrast model. */
  contrastWarning: boolean
}

export type FrameStatus = 'connecting' | 'ready' | 'failed'

/** The status line under the preview controls. */
export function snapshotPreviewMessage(preview: SnapshotPreview, status: FrameStatus): string {
  if (preview.frame.kind === 'failed') return 'Preview compilation unavailable. Preset JSON remains available.'
  return {
    connecting: 'Connecting snapshot gallery…',
    ready: 'Snapshot gallery ready.',
    failed: 'Gallery unavailable. Preset JSON remains available.',
  }[status]
}
